// GM Commands API - 测试/开发用命令
import { Router, Request, Response } from 'express';
import { authMiddleware, requireAuth } from './auth.js';
import { supabase, isSupabaseConfigured, DbUser } from '../db/supabase.js';
import { userService } from '../services/userService.js';
import { addDevGmCredits, clearDevGmCredits, resetDevEntitlements, setDevSubscription } from '../services/entitlementService.js';

const router = Router();

// GM 命令仅在开发环境启用，或者可以添加管理员权限检查
const isGMEnabled = () => {
  return process.env.NODE_ENV !== 'production' || process.env.ENABLE_GM_COMMANDS === 'true';
};

// =====================================================
// GM: 解锁订阅
// =====================================================

// POST /api/gm/unlock-subscription
router.post('/unlock-subscription', authMiddleware, requireAuth, async (req: Request, res: Response) => {
  if (!isGMEnabled()) {
    return res.status(403).json({ error: 'GM commands are disabled in production' });
  }

  try {
    const userId = req.userId!;

    if (!isSupabaseConfigured()) {
      setDevSubscription(userId, true);
      return res.json({ success: true, message: 'Subscription unlocked' });
    }

    // 设置订阅状态
    const { error } = await supabase
      .from('subscriptions')
      .upsert({
        user_id: userId,
        stripe_subscription_id: `gm_sub_${Date.now()}`,
        stripe_customer_id: `gm_cus_${Date.now()}`,
        plan: 'monthly',
        status: 'active',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 年后
      }, {
        onConflict: 'user_id',
      });

    if (error) {
      console.error('GM unlock subscription error:', error);
      return res.status(500).json({ error: 'Failed to unlock subscription' });
    }

    // 清除试用期（因为现在是正式订阅）
    await supabase
      .from('users')
      .update({ trial_ends_at: null })
      .eq('id', userId);

    res.json({ success: true, message: 'Subscription unlocked' });
  } catch (error) {
    console.error('GM unlock subscription error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// =====================================================
// GM: 取消订阅
// =====================================================

// POST /api/gm/cancel-subscription
router.post('/cancel-subscription', authMiddleware, requireAuth, async (req: Request, res: Response) => {
  if (!isGMEnabled()) {
    return res.status(403).json({ error: 'GM commands are disabled in production' });
  }

  try {
    const userId = req.userId!;

    if (!isSupabaseConfigured()) {
      setDevSubscription(userId, false);
      return res.json({ success: true, message: 'Subscription cancelled' });
    }

    // 删除订阅记录
    const { error } = await supabase
      .from('subscriptions')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('GM cancel subscription error:', error);
      return res.status(500).json({ error: 'Failed to cancel subscription' });
    }

    // 同时清除试用期
    await supabase
      .from('users')
      .update({ trial_ends_at: null })
      .eq('id', userId);

    res.json({ success: true, message: 'Subscription cancelled' });
  } catch (error) {
    console.error('GM cancel subscription error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// =====================================================
// GM: 添加代币（Ask 问答次数）
// =====================================================

// POST /api/gm/add-tokens
router.post('/add-tokens', authMiddleware, requireAuth, async (req: Request, res: Response) => {
  if (!isGMEnabled()) {
    return res.status(403).json({ error: 'GM commands are disabled in production' });
  }

  try {
    const userId = req.userId!;
    const { amount = 9999 } = req.body;

    if (!isSupabaseConfigured()) {
      addDevGmCredits(userId, amount);
      return res.json({ success: true, message: `Added ${amount} credits` });
    }

    const { error } = await supabase
      .from('purchase_records')
      .insert({
        user_id: userId,
        feature_type: 'gm_credit',
        feature_id: null,
        scope: 'consumable',
        price_cents: 0,
        valid_until: null,
        quantity: amount,
        consumed: 0,
        stripe_payment_intent_id: `gm_pi_${Date.now()}`,
        stripe_checkout_session_id: `gm_sess_${Date.now()}`,
      });

    if (error) {
      console.error('GM add tokens error:', error);
      return res.status(500).json({ error: 'Failed to add tokens' });
    }

    res.json({ success: true, message: `Added ${amount} credits` });
  } catch (error) {
    console.error('GM add tokens error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// =====================================================
// GM: 清零代币
// =====================================================

// POST /api/gm/clear-tokens
router.post('/clear-tokens', authMiddleware, requireAuth, async (req: Request, res: Response) => {
  if (!isGMEnabled()) {
    return res.status(403).json({ error: 'GM commands are disabled in production' });
  }

  try {
    const userId = req.userId!;

    if (!isSupabaseConfigured()) {
      clearDevGmCredits(userId);
      return res.json({ success: true, message: 'Credits cleared' });
    }

    const { error: deleteError } = await supabase
      .from('purchase_records')
      .delete()
      .eq('user_id', userId)
      .eq('feature_type', 'gm_credit');

    if (deleteError) {
      console.error('GM clear tokens error:', deleteError);
      return res.status(500).json({ error: 'Failed to clear tokens' });
    }

    // 重置免费使用记录
    const { error: usageError } = await supabase
      .from('free_usage')
      .upsert({
        user_id: userId,
        ask_used: 9999, // 设置为已用完
        synastry_used: 0,
      }, {
        onConflict: 'user_id',
      });

    if (usageError) {
      console.error('GM clear tokens usage error:', usageError);
    }

    // 重置订阅使用记录
    const weekStart = getWeekStart();
    await supabase
      .from('subscription_usage')
      .upsert({
        user_id: userId,
        week_start: weekStart,
        ask_used: 9999, // 设置为已用完
        synastry_used: 0,
      }, {
        onConflict: 'user_id,week_start',
      });

    res.json({ success: true, message: 'Credits cleared' });
  } catch (error) {
    console.error('GM clear tokens error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// =====================================================
// GM: 重置所有权益（完全重置）
// =====================================================

// POST /api/gm/reset-all
router.post('/reset-all', authMiddleware, requireAuth, async (req: Request, res: Response) => {
  if (!isGMEnabled()) {
    return res.status(403).json({ error: 'GM commands are disabled in production' });
  }

  try {
    const userId = req.userId!;

    if (!isSupabaseConfigured()) {
      resetDevEntitlements(userId);
      return res.json({ success: true, message: 'All entitlements reset' });
    }

    // 删除订阅
    await supabase.from('subscriptions').delete().eq('user_id', userId);

    // 删除所有购买记录
    await supabase.from('purchase_records').delete().eq('user_id', userId);

    // 删除合盘记录
    await supabase.from('synastry_records').delete().eq('user_id', userId);

    // 重置免费使用
    await supabase.from('free_usage').delete().eq('user_id', userId);

    // 重置订阅使用
    await supabase.from('subscription_usage').delete().eq('user_id', userId);

    // 清除试用期
    await supabase.from('users').update({ trial_ends_at: null }).eq('id', userId);

    res.json({ success: true, message: 'All entitlements reset' });
  } catch (error) {
    console.error('GM reset all error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/dev-session', async (_req: Request, res: Response) => {
  if (!isGMEnabled()) {
    return res.status(403).json({ error: 'GM commands are disabled in production' });
  }

  try {
    const email = 'gm-dev@local';
    let user: DbUser;

    if (isSupabaseConfigured()) {
      const existingUser = await userService.findByEmail(email);

      if (existingUser) {
        user = existingUser;
      } else {
        user = await userService.createUser({
          email,
          name: 'GM Dev',
          provider: 'email',
          password: `gm-dev-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        });
        await userService.verifyEmail(user.id);
      }
    } else {
      const now = new Date().toISOString();
      user = {
        id: 'gm-dev-local',
        email,
        name: 'GM Dev',
        avatar: null,
        provider: 'email',
        provider_id: null,
        password_hash: null,
        birth_profile: null,
        preferences: { theme: 'dark', language: 'zh' },
        email_verified: true,
        trial_ends_at: null,
        created_at: now,
        updated_at: now,
      };
    }

    const tokens = userService.generateTokens(user);

    res.json({
      success: true,
      tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name || undefined,
      },
    });
  } catch (error) {
    console.error('GM dev session error:', error);
    res.status(500).json({ error: 'Failed to create GM session' });
  }
});

// =====================================================
// GM: 检查 GM 命令是否启用
// =====================================================

// GET /api/gm/status
router.get('/status', (_req: Request, res: Response) => {
  res.json({
    enabled: isGMEnabled(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// 辅助函数：获取本周开始日期
function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // 周一为一周开始
  const weekStart = new Date(now.setDate(diff));
  weekStart.setHours(0, 0, 0, 0);
  return weekStart.toISOString().split('T')[0];
}

export default router;
