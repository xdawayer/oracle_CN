// 微信支付 API 路由
import { Router, Request, Response } from 'express';
import { authMiddleware, requireAuth } from './auth.js';
import wxpayService from '../services/wxpayService.js';
import { isWxPayConfigured, VIP_PLANS } from '../config/wxpay.js';
import { isDatabaseConfigured, update, getOne, insert, query } from '../db/mysql.js';
import { addDevGmCredits } from '../services/entitlementService.js';
import { SUBSCRIPTION_BONUS_BY_PLAN } from '../config/auth.js';

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

// POST /api/wxpay/refund-notify - 微信退款结果通知回调
router.post('/refund-notify', async (req: Request, res: Response) => {
  try {
    const timestamp = req.headers['wechatpay-timestamp'] as string;
    const nonce = req.headers['wechatpay-nonce'] as string;
    const signature = req.headers['wechatpay-signature'] as string;
    const serial = req.headers['wechatpay-serial'] as string;
    const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

    const result = await wxpayService.handleRefundNotify(timestamp, nonce, body, signature, serial);

    if (result.success && result.order) {
      const order = result.order;

      if (result.refundStatus === 'SUCCESS') {
        // 退款成功：回收权益
        if (order.orderType === 'subscription') {
          if (isDatabaseConfigured()) {
            await update('subscriptions', {
              status: 'canceled',
              current_period_end: new Date().toISOString(),
            }, 'user_id = ? AND status IN (?, ?)', [order.userId, 'active', 'trialing']);
          }
        }
        if (order.orderType === 'points' && order.pointsAmount) {
          if (isDatabaseConfigured()) {
            await update('purchase_records', { consumed: order.pointsAmount },
              'user_id = ? AND feature_type = ? AND feature_id = ?',
              [order.userId, 'gm_credit', order.orderId]);
          }
        }
      }
      // 退款失败：保持订单原状态，已在 service 层记录日志

      res.json({ code: 'SUCCESS', message: '成功' });
    } else {
      res.status(400).json({ code: 'FAIL', message: '处理失败' });
    }
  } catch (error) {
    console.error('Wxpay refund notify error:', error);
    res.status(500).json({ code: 'FAIL', message: '服务错误' });
  }
});

// POST /api/wxpay/query-order - 主动查询订单支付状态
router.post('/query-order', authMiddleware, requireAuth, async (req: Request, res: Response) => {
  try {
    const { orderId } = req.body;
    if (!orderId) {
      return res.status(400).json({ error: '缺少订单号' });
    }

    // 先验证订单归属
    const existingOrder = await wxpayService.getOrder(orderId);
    if (!existingOrder) {
      return res.status(404).json({ error: '订单不存在' });
    }
    if (existingOrder.userId !== req.userId) {
      return res.status(403).json({ error: '无权访问' });
    }

    // 在查询微信前先捕获本地状态（queryWxPayOrder 可能会修改缓存中的同一对象）
    const wasPending = existingOrder.status === 'pending';

    const result = await wxpayService.queryWxPayOrder(orderId);
    if (!result.success) {
      return res.status(500).json({ error: '查询失败' });
    }

    // 如果查询发现已支付且之前未处理，触发后续处理
    if (result.tradeState === 'SUCCESS' && result.order && wasPending) {
      const order = result.order;
      if (order.orderType === 'subscription' && order.plan) {
        const planConfig = VIP_PLANS[order.plan as keyof typeof VIP_PLANS];
        if (planConfig) {
          await handleSubscriptionPaid(order.userId, order.plan, planConfig.days, order.totalFee, order.orderId);
        }
      } else if (order.orderType === 'points' && order.pointsAmount) {
        await handlePointsRecharge(order.userId, order.pointsAmount, order.totalFee, order.orderId);
      }
    }

    res.json({
      orderId,
      tradeState: result.tradeState,
      status: result.order?.status,
    });
  } catch (error) {
    console.error('Query order error:', error);
    res.status(500).json({ error: '查询订单失败' });
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
      // 生产环境：权益回收由 refund-notify 回调处理
      // 开发模式：无回调，直接回收权益
      if (!isWxPayConfigured()) {
        const order = await wxpayService.getOrder(orderId);
        if (order) {
          if (order.orderType === 'subscription' && isDatabaseConfigured()) {
            await update('subscriptions', { status: 'canceled' },
              'user_id = ? AND status IN (?, ?)', [req.userId!, 'active', 'trialing']);
          }
          if (order.orderType === 'points' && order.pointsAmount && isDatabaseConfigured()) {
            await update('purchase_records', { consumed: order.pointsAmount },
              'user_id = ? AND feature_type = ? AND feature_id = ?',
              [req.userId!, 'gm_credit', orderId]);
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

// GET /api/wxpay/first-recharge-status - 检查用户是否已首充
router.get('/first-recharge-status', authMiddleware, requireAuth, async (req: Request, res: Response) => {
  try {
    if (isDatabaseConfigured()) {
      const pastRecharges = await query<{ id: string }>(
        'SELECT id FROM purchase_records WHERE user_id = ? AND feature_type = ? AND price_cents > 0 LIMIT 1',
        [req.userId!, 'gm_credit']
      );
      res.json({ isFirstRecharge: !pastRecharges || pastRecharges.length === 0 });
    } else {
      res.json({ isFirstRecharge: true });
    }
  } catch (error) {
    console.error('Check first recharge error:', error);
    res.json({ isFirstRecharge: false });
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
async function handleSubscriptionPaid(userId: string, plan: string, days: number, _totalFee: number, orderId: string) {
  if (isDatabaseConfigured()) {
    // 查询当前有效订阅
    const existing = await query<{ current_period_end: string }>(
      'SELECT * FROM subscriptions WHERE user_id = ? AND status IN (?, ?) ORDER BY current_period_end DESC LIMIT 1',
      [userId, 'active', 'trialing']
    );

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

    await insert('subscriptions', {
      user_id: userId,
      plan,
      status: 'active',
      current_period_start: startDate.toISOString(),
      current_period_end: endDate.toISOString(),
      payment_channel: 'wechat',
    });

    // 发放订阅赠送积分（幂等：以 sub_bonus_{orderId} 为唯一标识）
    const bonusCredits = SUBSCRIPTION_BONUS_BY_PLAN[plan as keyof typeof SUBSCRIPTION_BONUS_BY_PLAN] || 0;
    if (bonusCredits > 0) {
      const bonusFeatureId = `sub_bonus_${orderId}`;
      const existingBonus = await getOne<{ id: string }>(
        'SELECT id FROM purchase_records WHERE user_id = ? AND feature_type = ? AND feature_id = ? LIMIT 1',
        [userId, 'gm_credit', bonusFeatureId]
      );
      if (!existingBonus) {
        await insert('purchase_records', {
          user_id: userId,
          feature_type: 'gm_credit',
          feature_id: bonusFeatureId,
          scope: 'consumable',
          price_cents: 0, // 赠送，无实际支付
          quantity: bonusCredits,
          consumed: 0,
        });
      }
    }
  } else {
    console.log(`[DEV] VIP subscription activated: user=${userId}, plan=${plan}, days=${days}`);
  }
}

// 积分充值支付成功处理
async function handlePointsRecharge(userId: string, pointsAmount: number, totalFee: number, orderId: string) {
  if (isDatabaseConfigured()) {
    // 幂等检查：通过 orderId 防止重复充值
    const existing = await getOne<{ id: string }>(
      'SELECT id FROM purchase_records WHERE user_id = ? AND feature_type = ? AND feature_id = ? LIMIT 1',
      [userId, 'gm_credit', orderId]
    );

    if (existing) return;

    // 记录充值：feature_type=gm_credit, scope=consumable
    await insert('purchase_records', {
      user_id: userId,
      feature_type: 'gm_credit',
      feature_id: orderId,
      scope: 'consumable',
      price_cents: totalFee, // 实际支付金额（分）
      quantity: pointsAmount,
      consumed: 0,
    });

    // 首充双倍：用户维度幂等 key，防止并发订单导致多次赠送
    const bonusFeatureId = `first_recharge_bonus`;
    const existingBonus = await getOne<{ id: string }>(
      'SELECT id FROM purchase_records WHERE user_id = ? AND feature_type = ? AND feature_id = ? LIMIT 1',
      [userId, 'gm_credit', bonusFeatureId]
    );
    if (!existingBonus) {
      // 查询历史付费充值记录（排除赠送记录 price_cents=0 和当前订单）
      const pastRecharges = await query<{ id: string }>(
        'SELECT id FROM purchase_records WHERE user_id = ? AND feature_type = ? AND price_cents > 0 AND feature_id != ? LIMIT 1',
        [userId, 'gm_credit', orderId]
      );
      if (!pastRecharges || pastRecharges.length === 0) {
        // 首充：amount ≤ 100 翻倍，amount > 100 赠 50%
        const bonusAmount = pointsAmount <= 100 ? pointsAmount : Math.floor(pointsAmount * 0.5);
        if (bonusAmount > 0) {
          await insert('purchase_records', {
            user_id: userId,
            feature_type: 'gm_credit',
            feature_id: bonusFeatureId,
            scope: 'consumable',
            price_cents: 0,
            quantity: bonusAmount,
            consumed: 0,
          });
        }
      }
    }
  } else {
    addDevGmCredits(userId, pointsAmount);
    console.log(`[DEV] Points recharged: user=${userId}, amount=${pointsAmount}`);
  }
}

export default router;
