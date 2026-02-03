// 用户资料与积分 API 路由
import { Router, Request, Response } from 'express';
import { authMiddleware, requireAuth } from './auth.js';
import { supabase, isSupabaseConfigured } from '../db/supabase.js';
import entitlementServiceV2 from '../services/entitlementServiceV2.js';
import subscriptionService from '../services/subscriptionService.js';

const router = Router();

// 开发模式内存存储
const devProfiles = new Map<string, Record<string, unknown>>();

// GET /api/user/profile - 获取用户资料
router.get('/profile', authMiddleware, requireAuth, async (req: Request, res: Response) => {
  try {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, avatar, birth_profile, trial_ends_at')
        .eq('id', req.userId!)
        .single();

      if (error || !data) {
        return res.status(404).json({ error: 'User not found' });
      }

      // 获取订阅状态
      const subscription = await subscriptionService.getSubscription(req.userId!);
      const isVip = !!(subscription && (subscription.status === 'active' || subscription.status === 'trialing'));
      const vipExpireDate = subscription?.current_period_end || '';

      // 获取积分
      const entitlements = await entitlementServiceV2.getEntitlements(req.userId!);

      const birthProfile = data.birth_profile || {};

      res.json({
        name: data.name || '',
        avatarUrl: data.avatar || '',
        birthDate: birthProfile.date || '',
        birthTime: birthProfile.time || '',
        birthCity: birthProfile.city || birthProfile.location || '',
        isVip,
        vipExpireDate,
        points: entitlements.credits || 0,
      });
    } else {
      // 开发模式
      const profile = devProfiles.get(req.userId!) || {};
      const entitlements = await entitlementServiceV2.getEntitlements(req.userId!);
      res.json({
        name: profile.name || '星智用户',
        avatarUrl: profile.avatarUrl || '',
        birthDate: profile.birthDate || '',
        birthTime: profile.birthTime || '',
        birthCity: profile.birthCity || '',
        isVip: profile.isVip || false,
        vipExpireDate: profile.vipExpireDate || '',
        points: entitlements.credits || 0,
      });
    }
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// PUT /api/user/profile - 更新用户资料
router.put('/profile', authMiddleware, requireAuth, async (req: Request, res: Response) => {
  try {
    const { name, birthDate, birthTime, birthCity } = req.body;

    // 输入验证
    if (name !== undefined && (typeof name !== 'string' || name.length > 50)) {
      return res.status(400).json({ error: '昵称长度不能超过50个字符' });
    }
    if (birthDate !== undefined && typeof birthDate !== 'string') {
      return res.status(400).json({ error: '出生日期格式错误' });
    }
    if (birthTime !== undefined && typeof birthTime !== 'string') {
      return res.status(400).json({ error: '出生时间格式错误' });
    }
    if (birthCity !== undefined && typeof birthCity !== 'string') {
      return res.status(400).json({ error: '出生城市格式错误' });
    }

    if (isSupabaseConfigured()) {
      const updates: Record<string, unknown> = {};
      if (name !== undefined) updates.name = name.trim();

      // 更新 birth_profile JSONB
      const hasBirthChange = birthDate !== undefined || birthTime !== undefined || birthCity !== undefined;
      if (hasBirthChange) {
        // 先读取当前 birth_profile
        const { data: current } = await supabase
          .from('users')
          .select('birth_profile')
          .eq('id', req.userId!)
          .single();

        const currentBP = (current?.birth_profile as Record<string, unknown>) || {};
        if (birthDate !== undefined) currentBP.date = birthDate;
        if (birthTime !== undefined) currentBP.time = birthTime;
        if (birthCity !== undefined) {
          currentBP.city = birthCity;
          currentBP.location = birthCity;
        }
        updates.birth_profile = currentBP;
      }

      if (Object.keys(updates).length > 0) {
        const { error } = await supabase
          .from('users')
          .update(updates)
          .eq('id', req.userId!);

        if (error) {
          return res.status(500).json({ error: 'Failed to update profile' });
        }
      }
    } else {
      const profile = devProfiles.get(req.userId!) || {};
      if (name !== undefined) profile.name = name.trim();
      if (birthDate !== undefined) profile.birthDate = birthDate;
      if (birthTime !== undefined) profile.birthTime = birthTime;
      if (birthCity !== undefined) profile.birthCity = birthCity;
      devProfiles.set(req.userId!, profile);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// POST /api/user/avatar - 更新头像 URL
router.post('/avatar', authMiddleware, requireAuth, async (req: Request, res: Response) => {
  try {
    const { avatarUrl } = req.body;

    if (!avatarUrl || typeof avatarUrl !== 'string') {
      return res.status(400).json({ error: 'avatarUrl required' });
    }

    if (isSupabaseConfigured()) {
      await supabase
        .from('users')
        .update({ avatar: avatarUrl })
        .eq('id', req.userId!);
    } else {
      const profile = devProfiles.get(req.userId!) || {};
      profile.avatarUrl = avatarUrl;
      devProfiles.set(req.userId!, profile);
    }

    res.json({ success: true, avatarUrl });
  } catch (error) {
    console.error('Update avatar error:', error);
    res.status(500).json({ error: 'Failed to update avatar' });
  }
});

// GET /api/user/subscription - 获取 VIP 订阅状态
router.get('/subscription', authMiddleware, requireAuth, async (req: Request, res: Response) => {
  try {
    if (isSupabaseConfigured()) {
      const subscription = await subscriptionService.getSubscription(req.userId!);
      const isVip = !!(subscription && (subscription.status === 'active' || subscription.status === 'trialing'));

      res.json({
        isVip,
        vipExpireDate: subscription?.current_period_end || '',
        plan: subscription?.plan || '',
      });
    } else {
      const profile = devProfiles.get(req.userId!) || {};
      res.json({
        isVip: profile.isVip || false,
        vipExpireDate: profile.vipExpireDate || '',
        plan: '',
      });
    }
  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({ error: 'Failed to get subscription status' });
  }
});

// DELETE /api/user/delete-account - 注销账号（软删除）
router.delete('/delete-account', authMiddleware, requireAuth, async (req: Request, res: Response) => {
  try {
    // 后端校验确认文本，防止 API 被直接调用绕过前端
    const { confirmText } = req.body || {};
    if (confirmText !== '确认注销') {
      return res.status(400).json({ error: '请输入"确认注销"以继续' });
    }

    if (isSupabaseConfigured()) {
      // 软删除：标记用户为已删除，保留30天恢复期
      const { error } = await supabase
        .from('users')
        .update({
          deleted_at: new Date().toISOString(),
          name: '[已注销用户]',
          avatar: null,
          birth_profile: null,
        })
        .eq('id', req.userId!);

      if (error) {
        return res.status(500).json({ error: '注销失败' });
      }

      // 取消有效订阅
      await supabase
        .from('subscriptions')
        .update({ status: 'canceled' })
        .eq('user_id', req.userId!)
        .in('status', ['active', 'trialing']);
    } else {
      devProfiles.delete(req.userId!);
    }

    res.json({ success: true, message: '账号已注销' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: '注销失败' });
  }
});

// GET /api/user/points-history - 积分流水
router.get('/points-history', authMiddleware, requireAuth, async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize as string) || 20));
    const offset = (page - 1) * pageSize;

    if (isSupabaseConfigured()) {
      const { data, error, count } = await supabase
        .from('purchase_records')
        .select('id, feature_type, feature_id, quantity, consumed, created_at, price_cents', { count: 'exact' })
        .eq('user_id', req.userId!)
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (error) {
        return res.status(500).json({ error: 'Failed to get points history' });
      }

      const records = (data || []).map(item => {
        const isIncome = item.feature_type === 'gm_credit';
        return {
          id: item.id,
          description: getFeatureDescription(item.feature_type, item.feature_id),
          date: item.created_at,
          amount: isIncome ? item.quantity : -(item.price_cents || 0),
        };
      });

      res.json({
        records,
        page,
        pageSize,
        total: count || 0,
        hasMore: (count || 0) > offset + pageSize,
      });
    } else {
      // 开发模式：返回模拟数据
      res.json({
        records: [
          { id: '1', description: '积分充值', date: new Date().toISOString(), amount: 500 },
          { id: '2', description: '本命盘解读', date: new Date().toISOString(), amount: -133 },
          { id: '3', description: '推荐奖励', date: new Date(Date.now() - 86400000).toISOString(), amount: 500 },
        ],
        page: 1,
        pageSize: 20,
        total: 3,
        hasMore: false,
      });
    }
  } catch (error) {
    console.error('Get points history error:', error);
    res.status(500).json({ error: 'Failed to get points history' });
  }
});

function getFeatureDescription(featureType: string, featureId: string | null): string {
  const descriptions: Record<string, string> = {
    gm_credit: '积分充值',
    dimension: '心理维度解锁',
    core_theme: '核心主题解锁',
    detail: '详情查看',
    daily_script: '每日剧本',
    daily_transit: '每日行运详情',
    synastry: '合盘分析',
    synastry_detail: '合盘详情',
    ask: '问一问',
    cbt_stats: 'CBT 统计',
    synthetica: '占星实验',
  };
  return descriptions[featureType] || featureId || featureType;
}

export { router as userRouter };
