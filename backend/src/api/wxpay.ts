// 微信支付 API 路由
import { Router, Request, Response } from 'express';
import { authMiddleware, requireAuth } from './auth.js';
import wxpayService from '../services/wxpayService.js';
import { isWxPayConfigured, VIP_PLANS } from '../config/wxpay.js';
import { supabase, isSupabaseConfigured } from '../db/supabase.js';
import { addDevGmCredits } from '../services/entitlementService.js';

const router = Router();

// 支付功能可用性中间件
const requireWxPayOrDev = (_req: Request, res: Response, next: Function) => {
  if (!isWxPayConfigured() && process.env.NODE_ENV === 'production') {
    return res.status(503).json({ error: '支付服务暂不可用，请稍后再试' });
  }
  next();
};

// POST /api/wxpay/create-order - 创建微信支付订单
router.post('/create-order', authMiddleware, requireAuth, requireWxPayOrDev, async (req: Request, res: Response) => {
  try {
    const { orderType, plan, amount, totalFee } = req.body;

    if (!orderType || !['subscription', 'points'].includes(orderType)) {
      return res.status(400).json({ error: '无效的订单类型' });
    }

    const result = await wxpayService.createOrder({
      userId: req.userId!,
      orderType,
      plan,
      amount,
      totalFee,
    });

    if (!result) {
      return res.status(400).json({ error: '创建订单失败' });
    }

    res.json(result);
  } catch (error) {
    console.error('Create wxpay order error:', error);
    res.status(500).json({ error: '创建订单失败' });
  }
});

// POST /api/wxpay/notify - 微信支付回调
router.post('/notify', async (req: Request, res: Response) => {
  try {
    const timestamp = req.headers['wechatpay-timestamp'] as string;
    const nonce = req.headers['wechatpay-nonce'] as string;
    const signature = req.headers['wechatpay-signature'] as string;
    const serial = req.headers['wechatpay-serial'] as string;
    const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

    const result = await wxpayService.handleNotify(timestamp, nonce, body, signature, serial);

    if (result.success && result.order) {
      const order = result.order;

      if (order.orderType === 'subscription' && order.plan) {
        const planConfig = VIP_PLANS[order.plan as keyof typeof VIP_PLANS];
        if (planConfig) {
          await handleSubscriptionPaid(order.userId, order.plan, planConfig.days, order.totalFee, order.orderId);
        }
      } else if (order.orderType === 'points' && order.pointsAmount) {
        await handlePointsRecharge(order.userId, order.pointsAmount, order.totalFee, order.orderId);
      }

      res.json({ code: 'SUCCESS', message: '成功' });
    } else {
      res.status(400).json({ code: 'FAIL', message: '处理失败' });
    }
  } catch (error) {
    console.error('Wxpay notify error:', error);
    res.status(500).json({ code: 'FAIL', message: '服务错误' });
  }
});

// GET /api/wxpay/order/:orderId - 查询订单状态
router.get('/order/:orderId', authMiddleware, requireAuth, async (req: Request, res: Response) => {
  try {
    const order = await wxpayService.getOrder(req.params.orderId);
    if (!order) {
      return res.status(404).json({ error: '订单不存在' });
    }
    if (order.userId !== req.userId) {
      return res.status(403).json({ error: '无权访问' });
    }
    res.json({
      orderId: order.orderId,
      orderType: order.orderType,
      status: order.status,
      totalFee: order.totalFee,
      createdAt: order.createdAt,
      paidAt: order.paidAt,
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ error: '查询订单失败' });
  }
});

// POST /api/wxpay/refund - 申请退款
router.post('/refund', authMiddleware, requireAuth, async (req: Request, res: Response) => {
  try {
    const { orderId } = req.body;
    if (!orderId) {
      return res.status(400).json({ error: '缺少订单号' });
    }

    const result = await wxpayService.refundOrder(orderId, req.userId!);

    if (result.success) {
      // 退款成功后处理权益回收
      const order = await wxpayService.getOrder(orderId);
      if (order) {
        if (order.orderType === 'subscription') {
          // 取消 VIP 订阅
          if (isSupabaseConfigured()) {
            await supabase
              .from('subscriptions')
              .update({ status: 'canceled' })
              .eq('user_id', req.userId!)
              .in('status', ['active', 'trialing']);
          }
        }
        if (order.orderType === 'points' && order.pointsAmount) {
          // 积分退款：将该充值记录的剩余积分标记为已消耗（等同清零）
          if (isSupabaseConfigured()) {
            await supabase
              .from('purchase_records')
              .update({ consumed: order.pointsAmount })
              .eq('user_id', req.userId!)
              .eq('feature_type', 'gm_credit')
              .eq('feature_id', orderId);
          }
        }
      }
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Refund error:', error);
    res.status(500).json({ error: '退款失败' });
  }
});

// GET /api/wxpay/orders - 获取用户订单列表
router.get('/orders', authMiddleware, requireAuth, async (req: Request, res: Response) => {
  try {
    const orders = await wxpayService.getUserOrders(req.userId!);
    res.json({
      orders: orders.map(order => ({
        orderId: order.orderId,
        orderType: order.orderType,
        plan: order.plan,
        pointsAmount: order.pointsAmount,
        totalFee: order.totalFee,
        status: order.status,
        createdAt: order.createdAt,
        paidAt: order.paidAt,
        // 退款条件：已支付且在 7 天内
        canRefund: order.status === 'paid' && order.paidAt &&
          (Date.now() - new Date(order.paidAt).getTime()) < 7 * 24 * 60 * 60 * 1000,
      })),
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: '获取订单列表失败' });
  }
});

// POST /api/wxpay/dev-confirm - 开发模式模拟支付成功
router.post('/dev-confirm', authMiddleware, requireAuth, async (req: Request, res: Response) => {
  // 双重保护：微信支付已配置 OR 生产环境，均禁止使用
  if (isWxPayConfigured() || process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: '仅开发模式可用' });
  }

  const { orderId } = req.body;
  const order = await wxpayService.devConfirmOrder(orderId);
  if (!order) {
    return res.status(404).json({ error: '订单不存在' });
  }

  if (order.orderType === 'subscription' && order.plan) {
    const planConfig = VIP_PLANS[order.plan as keyof typeof VIP_PLANS];
    if (planConfig) {
      await handleSubscriptionPaid(order.userId, order.plan, planConfig.days, order.totalFee, order.orderId);
    }
  } else if (order.orderType === 'points' && order.pointsAmount) {
    await handlePointsRecharge(order.userId, order.pointsAmount, order.totalFee, order.orderId);
  }

  res.json({ success: true, order });
});

// VIP 订阅支付成功处理
async function handleSubscriptionPaid(userId: string, plan: string, days: number, _totalFee: number, _orderId: string) {
  if (isSupabaseConfigured()) {
    // 查询当前有效订阅
    const { data: existing } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['active', 'trialing'])
      .order('current_period_end', { ascending: false })
      .limit(1);

    const now = new Date();
    let startDate = now;
    if (existing && existing.length > 0) {
      const currentEnd = new Date(existing[0].current_period_end);
      if (currentEnd > now) {
        startDate = currentEnd; // 在现有到期日基础上叠加
      }
    }

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + days);

    await supabase.from('subscriptions').insert({
      user_id: userId,
      plan,
      status: 'active',
      current_period_start: startDate.toISOString(),
      current_period_end: endDate.toISOString(),
      payment_channel: 'wechat',
    });
  } else {
    console.log(`[DEV] VIP subscription activated: user=${userId}, plan=${plan}, days=${days}`);
  }
}

// 积分充值支付成功处理
async function handlePointsRecharge(userId: string, pointsAmount: number, totalFee: number, orderId: string) {
  if (isSupabaseConfigured()) {
    // 幂等检查：通过 orderId 防止重复充值
    const { data: existing } = await supabase
      .from('purchase_records')
      .select('id')
      .eq('user_id', userId)
      .eq('feature_type', 'gm_credit')
      .eq('feature_id', orderId)
      .limit(1);

    if (existing && existing.length > 0) return;

    // 记录充值：feature_type=gm_credit, scope=consumable
    await supabase.from('purchase_records').insert({
      user_id: userId,
      feature_type: 'gm_credit',
      feature_id: orderId,
      scope: 'consumable',
      price_cents: totalFee, // 实际支付金额（分）
      quantity: pointsAmount,
      consumed: 0,
    });
  } else {
    addDevGmCredits(userId, pointsAmount);
    console.log(`[DEV] Points recharged: user=${userId}, amount=${pointsAmount}`);
  }
}

export default router;
