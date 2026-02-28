// User Service - handles user CRUD and authentication
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { isDatabaseConfigured, isDuplicateKeyError, DbUser, BirthProfile, UserPreferences, getOne, insert, update, remove } from '../db/mysql.js';
import { JWT_CONFIG, SUBSCRIPTION_BENEFITS, NEW_USER_BONUS_CREDITS } from '../config/auth.js';

export interface CreateUserInput {
  email: string;
  name?: string;
  avatar?: string;
  provider: 'google' | 'apple' | 'email' | 'wechat';
  providerId?: string;
  password?: string;
}

export interface CreateWechatUserInput {
  openid: string;
  unionid?: string;
  sessionKey: string;
  name?: string;
  avatar?: string;
}

export interface TokenPayload {
  userId: string;
  email: string;
  type: 'access' | 'refresh';
  openid?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

class UserService {
  // Create a new user with 7-day trial
  async createUser(input: CreateUserInput): Promise<DbUser> {
    if (!isDatabaseConfigured()) {
      throw new Error('Database not configured');
    }

    const passwordHash = input.password
      ? await bcrypt.hash(input.password, 12)
      : null;

    // 计算试用期结束时间（7天后）
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + SUBSCRIPTION_BENEFITS.TRIAL_DAYS);

    const id = uuidv4();
    try {
      const user = await insert<DbUser>('users', {
        id,
        email: input.email.toLowerCase(),
        name: input.name || null,
        avatar: input.avatar || null,
        provider: input.provider,
        provider_id: input.providerId || null,
        password_hash: passwordHash,
        email_verified: input.provider !== 'email', // OAuth users are pre-verified
        trial_ends_at: trialEndsAt.toISOString(),
      });
      return user;
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new Error('Email already registered');
      }
      throw new Error(`Failed to create user: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Find user by WeChat openid
  async findByWechatOpenid(openid: string): Promise<DbUser | null> {
    if (!isDatabaseConfigured()) return null;
    return getOne<DbUser>('SELECT * FROM users WHERE wechat_openid = ?', [openid]);
  }

  // Create a new user via WeChat login
  async createWechatUser(input: CreateWechatUserInput): Promise<DbUser> {
    if (!isDatabaseConfigured()) {
      throw new Error('Database not configured');
    }

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + SUBSCRIPTION_BENEFITS.TRIAL_DAYS);

    const syntheticEmail = `${input.openid}@wechat.local`;
    const id = uuidv4();

    try {
      const user = await insert<DbUser>('users', {
        id,
        email: syntheticEmail,
        name: input.name || null,
        avatar: input.avatar || null,
        provider: 'wechat',
        provider_id: input.openid,
        password_hash: null,
        email_verified: true,
        wechat_openid: input.openid,
        wechat_unionid: input.unionid || null,
        wechat_session_key: input.sessionKey,
        trial_ends_at: trialEndsAt.toISOString(),
      });

      // 新用户注册赠送积分（幂等：先查后插）
      if (NEW_USER_BONUS_CREDITS > 0) {
        try {
          const existingBonus = await getOne<{ id: string }>(
            'SELECT id FROM purchase_records WHERE user_id = ? AND feature_type = ? AND feature_id = ? LIMIT 1',
            [id, 'gm_credit', 'welcome_bonus']
          );
          if (!existingBonus) {
            await insert('purchase_records', {
              user_id: id,
              feature_type: 'gm_credit',
              feature_id: 'welcome_bonus',
              scope: 'consumable',
              price_cents: 0,
              quantity: NEW_USER_BONUS_CREDITS,
              consumed: 0,
            });
          }
        } catch (bonusErr) {
          console.error('Failed to grant welcome bonus:', bonusErr);
        }
      }

      return user;
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new Error('WeChat user already registered');
      }
      throw new Error(`Failed to create WeChat user: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Find user by email
  async findByEmail(email: string): Promise<DbUser | null> {
    if (!isDatabaseConfigured()) return null;
    return getOne<DbUser>('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
  }

  // Find user by ID
  async findById(id: string): Promise<DbUser | null> {
    if (!isDatabaseConfigured()) return null;
    return getOne<DbUser>('SELECT * FROM users WHERE id = ?', [id]);
  }

  // Find user by OAuth provider
  async findByProvider(provider: string, providerId: string): Promise<DbUser | null> {
    if (!isDatabaseConfigured()) return null;
    return getOne<DbUser>('SELECT * FROM users WHERE provider = ? AND provider_id = ?', [provider, providerId]);
  }

  // Verify password
  async verifyPassword(user: DbUser, password: string): Promise<boolean> {
    if (!user.password_hash) return false;
    return bcrypt.compare(password, user.password_hash);
  }

  // Update user profile
  async updateProfile(
    userId: string,
    updates: Partial<{
      name: string;
      avatar: string;
      birth_profile: BirthProfile;
      preferences: UserPreferences;
    }>
  ): Promise<DbUser | null> {
    if (!isDatabaseConfigured()) return null;

    const data: Record<string, unknown> = {};
    if (updates.name !== undefined) data.name = updates.name;
    if (updates.avatar !== undefined) data.avatar = updates.avatar;
    if (updates.birth_profile !== undefined) data.birth_profile = updates.birth_profile;
    if (updates.preferences !== undefined) data.preferences = updates.preferences;

    if (Object.keys(data).length === 0) {
      return this.findById(userId);
    }

    await update('users', data, 'id = ?', [userId]);
    return this.findById(userId);
  }

  // Migrate localStorage data to user account
  async migrateLocalData(
    userId: string,
    birthProfile: BirthProfile,
    preferences: UserPreferences
  ): Promise<DbUser | null> {
    return this.updateProfile(userId, {
      birth_profile: birthProfile,
      preferences,
    });
  }

  // Mark email as verified
  async verifyEmail(userId: string): Promise<void> {
    if (!isDatabaseConfigured()) return;
    await update('users', { email_verified: true }, 'id = ?', [userId]);
  }

  // Update WeChat session key and unionid
  async updateWechatSessionKey(userId: string, sessionKey: string, unionid?: string | null): Promise<void> {
    if (!isDatabaseConfigured()) return;

    const updates: Record<string, unknown> = {
      wechat_session_key: sessionKey,
    };

    if (unionid !== undefined) {
      updates.wechat_unionid = unionid;
    }

    await update('users', updates, 'id = ?', [userId]);
  }

  // Generate JWT tokens
  generateTokens(user: DbUser): AuthTokens {
    const openid = user.provider === 'wechat' ? user.wechat_openid || undefined : undefined;

    const accessPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
      type: 'access',
      openid,
    };

    const refreshPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
      type: 'refresh',
      openid,
    };

    const accessToken = jwt.sign(accessPayload, JWT_CONFIG.SECRET, {
      expiresIn: 900, // 15 minutes in seconds
      issuer: JWT_CONFIG.ISSUER,
    });

    const refreshToken = jwt.sign(refreshPayload, JWT_CONFIG.SECRET, {
      expiresIn: '7d',
      issuer: JWT_CONFIG.ISSUER,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes in seconds
    };
  }

  // Verify JWT token
  verifyToken(token: string): TokenPayload | null {
    try {
      const payload = jwt.verify(token, JWT_CONFIG.SECRET, {
        issuer: JWT_CONFIG.ISSUER,
      }) as TokenPayload;
      return payload;
    } catch {
      return null;
    }
  }

  // Store refresh token
  async storeRefreshToken(userId: string, token: string, expiresAt: Date): Promise<void> {
    if (!isDatabaseConfigured()) return;

    await insert('refresh_tokens', {
      id: uuidv4(),
      user_id: userId,
      token,
      expires_at: expiresAt.toISOString(),
    });
  }

  // Validate refresh token
  async validateRefreshToken(token: string): Promise<string | null> {
    if (!isDatabaseConfigured()) return null;

    const row = await getOne<{ user_id: string }>(
      'SELECT user_id FROM refresh_tokens WHERE token = ? AND expires_at > ?',
      [token, new Date().toISOString()]
    );

    if (!row) return null;
    return row.user_id;
  }

  // Revoke refresh token
  async revokeRefreshToken(token: string): Promise<void> {
    if (!isDatabaseConfigured()) return;
    await remove('refresh_tokens', 'token = ?', [token]);
  }

  // Revoke all user tokens
  async revokeAllUserTokens(userId: string): Promise<void> {
    if (!isDatabaseConfigured()) return;
    await remove('refresh_tokens', 'user_id = ?', [userId]);
  }

  // Create email verification token
  async createVerificationToken(userId: string): Promise<string> {
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    if (isDatabaseConfigured()) {
      await insert('email_verification_tokens', {
        id: uuidv4(),
        user_id: userId,
        token,
        expires_at: expiresAt.toISOString(),
      });
    }

    return token;
  }

  // Verify email token
  async verifyEmailToken(token: string): Promise<string | null> {
    if (!isDatabaseConfigured()) return null;

    const row = await getOne<{ user_id: string }>(
      'SELECT user_id FROM email_verification_tokens WHERE token = ? AND expires_at > ?',
      [token, new Date().toISOString()]
    );

    if (!row) return null;

    // Delete the token after use
    await remove('email_verification_tokens', 'token = ?', [token]);

    // Mark user as verified
    await this.verifyEmail(row.user_id);

    return row.user_id;
  }
}

export const userService = new UserService();
export default userService;
