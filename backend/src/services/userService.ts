// User Service - handles user CRUD and authentication
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { supabase, DbUser, BirthProfile, UserPreferences, isSupabaseConfigured } from '../db/supabase.js';
import { JWT_CONFIG, SUBSCRIPTION_BENEFITS } from '../config/auth.js';

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
    if (!isSupabaseConfigured()) {
      throw new Error('Database not configured');
    }

    const passwordHash = input.password
      ? await bcrypt.hash(input.password, 12)
      : null;

    // 计算试用期结束时间（7天后）
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + SUBSCRIPTION_BENEFITS.TRIAL_DAYS);

    const { data, error } = await supabase
      .from('users')
      .insert({
        email: input.email.toLowerCase(),
        name: input.name || null,
        avatar: input.avatar || null,
        provider: input.provider,
        provider_id: input.providerId || null,
        password_hash: passwordHash,
        email_verified: input.provider !== 'email', // OAuth users are pre-verified
        trial_ends_at: trialEndsAt.toISOString(),   // 首次注册赠送 7 天试用
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error('Email already registered');
      }
      throw new Error(`Failed to create user: ${error.message}`);
    }

    return data as DbUser;
  }

  // Find user by WeChat openid
  async findByWechatOpenid(openid: string): Promise<DbUser | null> {
    if (!isSupabaseConfigured()) return null;

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('wechat_openid', openid)
      .single();

    if (error || !data) return null;
    return data as DbUser;
  }

  // Create a new user via WeChat login
  async createWechatUser(input: CreateWechatUserInput): Promise<DbUser> {
    if (!isSupabaseConfigured()) {
      throw new Error('Database not configured');
    }

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + SUBSCRIPTION_BENEFITS.TRIAL_DAYS);

    const syntheticEmail = `${input.openid}@wechat.local`;

    const { data, error } = await supabase
      .from('users')
      .insert({
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
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error('WeChat user already registered');
      }
      throw new Error(`Failed to create WeChat user: ${error.message}`);
    }

    return data as DbUser;
  }

  // Find user by email
  async findByEmail(email: string): Promise<DbUser | null> {
    if (!isSupabaseConfigured()) return null;

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (error || !data) return null;
    return data as DbUser;
  }

  // Find user by ID
  async findById(id: string): Promise<DbUser | null> {
    if (!isSupabaseConfigured()) return null;

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return data as DbUser;
  }

  // Find user by OAuth provider
  async findByProvider(provider: string, providerId: string): Promise<DbUser | null> {
    if (!isSupabaseConfigured()) return null;

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('provider', provider)
      .eq('provider_id', providerId)
      .single();

    if (error || !data) return null;
    return data as DbUser;
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
    if (!isSupabaseConfigured()) return null;

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update profile: ${error.message}`);
    }

    return data as DbUser;
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
    if (!isSupabaseConfigured()) return;

    await supabase
      .from('users')
      .update({ email_verified: true })
      .eq('id', userId);
  }

  // Update WeChat session key and unionid
  async updateWechatSessionKey(userId: string, sessionKey: string, unionid?: string | null): Promise<void> {
    if (!isSupabaseConfigured()) return;

    const updates: Record<string, unknown> = {
      wechat_session_key: sessionKey,
    };

    if (unionid !== undefined) {
      updates.wechat_unionid = unionid;
    }

    await supabase
      .from('users')
      .update(updates)
      .eq('id', userId);
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
    if (!isSupabaseConfigured()) return;

    await supabase.from('refresh_tokens').insert({
      user_id: userId,
      token,
      expires_at: expiresAt.toISOString(),
    });
  }

  // Validate refresh token
  async validateRefreshToken(token: string): Promise<string | null> {
    if (!isSupabaseConfigured()) return null;

    const { data, error } = await supabase
      .from('refresh_tokens')
      .select('user_id')
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !data) return null;
    return data.user_id;
  }

  // Revoke refresh token
  async revokeRefreshToken(token: string): Promise<void> {
    if (!isSupabaseConfigured()) return;

    await supabase.from('refresh_tokens').delete().eq('token', token);
  }

  // Revoke all user tokens
  async revokeAllUserTokens(userId: string): Promise<void> {
    if (!isSupabaseConfigured()) return;

    await supabase.from('refresh_tokens').delete().eq('user_id', userId);
  }

  // Create email verification token
  async createVerificationToken(userId: string): Promise<string> {
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    if (isSupabaseConfigured()) {
      await supabase.from('email_verification_tokens').insert({
        user_id: userId,
        token,
        expires_at: expiresAt.toISOString(),
      });
    }

    return token;
  }

  // Verify email token
  async verifyEmailToken(token: string): Promise<string | null> {
    if (!isSupabaseConfigured()) return null;

    const { data, error } = await supabase
      .from('email_verification_tokens')
      .select('user_id')
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !data) return null;

    // Delete the token after use
    await supabase.from('email_verification_tokens').delete().eq('token', token);

    // Mark user as verified
    await this.verifyEmail(data.user_id);

    return data.user_id;
  }
}

export const userService = new UserService();
export default userService;
