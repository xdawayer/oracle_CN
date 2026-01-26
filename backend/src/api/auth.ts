// Authentication API routes
import { Router, Request, Response, NextFunction } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { userService, AuthTokens } from '../services/userService.js';
import { isSupabaseConfigured } from '../db/supabase.js';
import { GOOGLE_CONFIG, isGoogleConfigured, isWechatConfigured } from '../config/auth.js';
import { wechatService } from '../services/wechatService.js';

const router = Router();

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      user?: {
        id: string;
        email: string;
      };
    }
  }
}

// Auth middleware (optional - continues without auth if no token)
export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  void res;
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(); // Continue without auth
  }

  const token = authHeader.substring(7);
  const payload = userService.verifyToken(token);

  if (!payload || payload.type !== 'access') {
    return next(); // Invalid token, continue without auth
  }

  req.userId = payload.userId;
  req.user = {
    id: payload.userId,
    email: payload.email,
  };

  res.locals.userId = payload.userId;
  res.locals.userEmail = payload.email;

  next();
};

// Optional auth middleware (alias for authMiddleware, more explicit naming)
export const optionalAuthMiddleware = authMiddleware;

// Require auth middleware
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

// Helper to send auth response
const sendAuthResponse = (res: Response, tokens: AuthTokens, user: { id: string; email: string; name?: string | null }) => {
  res.json({
    success: true,
    tokens,
    user: {
      id: user.id,
      email: user.email,
      name: user.name || undefined,
    },
  });
};

// Google login
router.post('/google', async (req: Request, res: Response) => {
  try {
    if (!isSupabaseConfigured()) {
      return res.status(503).json({ error: 'Authentication service unavailable' });
    }

    if (!isGoogleConfigured()) {
      return res.status(503).json({ error: 'Google login not configured' });
    }

    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ error: 'Google credential required' });
    }

    // Verify Google token
    const client = new OAuth2Client(GOOGLE_CONFIG.CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CONFIG.CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return res.status(400).json({ error: 'Invalid Google token' });
    }

    // Find or create user
    let user = await userService.findByProvider('google', payload.sub);

    if (!user) {
      // Check if email exists with different provider
      const existingUser = await userService.findByEmail(payload.email);
      if (existingUser) {
        return res.status(400).json({
          error: 'Email already registered with different method',
          provider: existingUser.provider,
        });
      }

      // Create new user
      user = await userService.createUser({
        email: payload.email,
        name: payload.name,
        avatar: payload.picture,
        provider: 'google',
        providerId: payload.sub,
      });
    }

    // Generate tokens
    const tokens = userService.generateTokens(user);

    sendAuthResponse(res, tokens, user);
  } catch (error) {
    console.error('Google login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// WeChat login
router.post('/wechat', async (req: Request, res: Response) => {
  try {
    if (!isSupabaseConfigured()) {
      return res.status(503).json({ error: 'Authentication service unavailable' });
    }

    if (!isWechatConfigured()) {
      return res.status(503).json({ error: 'WeChat login not configured' });
    }

    const { code, userInfo } = req.body as { code?: string; userInfo?: { nickName?: string; avatarUrl?: string } };

    if (!code) {
      return res.status(400).json({ error: 'WeChat code required' });
    }

    const session = await wechatService.code2Session(code);

    let user = await userService.findByWechatOpenid(session.openid);

    if (!user) {
      user = await userService.createWechatUser({
        openid: session.openid,
        unionid: session.unionid,
        sessionKey: session.sessionKey,
        name: userInfo?.nickName,
        avatar: userInfo?.avatarUrl,
      });
    } else {
      await userService.updateWechatSessionKey(user.id, session.sessionKey, session.unionid);

      const profileUpdates: { name?: string; avatar?: string } = {};
      if (userInfo?.nickName) profileUpdates.name = userInfo.nickName;
      if (userInfo?.avatarUrl) profileUpdates.avatar = userInfo.avatarUrl;

      if (Object.keys(profileUpdates).length > 0) {
        const updatedUser = await userService.updateProfile(user.id, profileUpdates);
        if (updatedUser) {
          user = updatedUser;
        }
      }
    }

    const tokens = userService.generateTokens(user);

    res.json({
      success: true,
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expires_in: tokens.expiresIn,
      user: {
        id: user.id,
        name: user.name || undefined,
        avatar: user.avatar || undefined,
        wechat_openid: user.wechat_openid || session.openid,
      },
    });
  } catch (error) {
    console.error('WeChat login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Apple login
router.post('/apple', async (req: Request, res: Response) => {
  try {
    if (!isSupabaseConfigured()) {
      return res.status(503).json({ error: 'Authentication service unavailable' });
    }

    const { identityToken, user: appleUser } = req.body;

    if (!identityToken) {
      return res.status(400).json({ error: 'Apple identity token required' });
    }

    // TODO: Verify Apple token
    // For now, we'll trust the client-side verification
    // In production, implement server-side verification

    const email = appleUser?.email;
    const name = appleUser?.name?.firstName
      ? `${appleUser.name.firstName} ${appleUser.name.lastName || ''}`.trim()
      : undefined;

    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }

    // Find or create user
    let user = await userService.findByEmail(email);

    if (!user) {
      user = await userService.createUser({
        email,
        name,
        provider: 'apple',
        providerId: appleUser?.user || email,
      });
    } else if (user.provider !== 'apple') {
      return res.status(400).json({
        error: 'Email already registered with different method',
        provider: user.provider,
      });
    }

    const tokens = userService.generateTokens(user);
    sendAuthResponse(res, tokens, user);
  } catch (error) {
    console.error('Apple login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Email registration
router.post('/register', async (req: Request, res: Response) => {
  try {
    if (!isSupabaseConfigured()) {
      return res.status(503).json({ error: 'Authentication service unavailable' });
    }

    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Check if email exists
    const existingUser = await userService.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Create user
    const user = await userService.createUser({
      email,
      name,
      password,
      provider: 'email',
    });

    // Create verification token
    const verificationToken = await userService.createVerificationToken(user.id);

    // TODO: Send verification email
    console.log(`Verification token for ${email}: ${verificationToken}`);

    // Generate tokens (user can use app but some features may require verification)
    const tokens = userService.generateTokens(user);

    res.json({
      success: true,
      tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.email_verified,
      },
      message: 'Please check your email to verify your account',
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Email login
router.post('/login', async (req: Request, res: Response) => {
  try {
    if (!isSupabaseConfigured()) {
      return res.status(503).json({ error: 'Authentication service unavailable' });
    }

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const user = await userService.findByEmail(email);

    if (!user || user.provider !== 'email') {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await userService.verifyPassword(user, password);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const tokens = userService.generateTokens(user);
    sendAuthResponse(res, tokens, user);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Refresh token
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    // Verify refresh token
    const payload = userService.verifyToken(refreshToken);

    if (!payload || payload.type !== 'refresh') {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    // Get user
    const user = await userService.findById(payload.userId);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Generate new tokens
    const tokens = userService.generateTokens(user);

    res.json({
      success: true,
      tokens,
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

// Logout
router.post('/logout', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await userService.revokeRefreshToken(refreshToken);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Get current user
router.get('/me', authMiddleware, requireAuth, async (req: Request, res: Response) => {
  try {
    const user = await userService.findById(req.userId!);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      provider: user.provider,
      birthProfile: user.birth_profile,
      preferences: user.preferences,
      emailVerified: user.email_verified,
      createdAt: user.created_at,
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Update profile
router.put('/profile', authMiddleware, requireAuth, async (req: Request, res: Response) => {
  try {
    const { name, avatar, birthProfile, preferences } = req.body;

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (avatar !== undefined) updates.avatar = avatar;
    if (birthProfile !== undefined) updates.birth_profile = birthProfile;
    if (preferences !== undefined) updates.preferences = preferences;

    const user = await userService.updateProfile(req.userId!, updates as any);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        birthProfile: user.birth_profile,
        preferences: user.preferences,
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Migrate localStorage data
router.post('/migrate', authMiddleware, requireAuth, async (req: Request, res: Response) => {
  try {
    const { birthProfile, preferences } = req.body;

    if (!birthProfile) {
      return res.status(400).json({ error: 'Birth profile required' });
    }

    const user = await userService.migrateLocalData(
      req.userId!,
      birthProfile,
      preferences || { theme: 'dark', language: 'en' }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      message: 'Data migrated successfully',
    });
  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({ error: 'Migration failed' });
  }
});

// Verify email
router.get('/verify-email/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    const userId = await userService.verifyEmailToken(token);

    if (!userId) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    res.json({
      success: true,
      message: 'Email verified successfully',
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

export default router;
