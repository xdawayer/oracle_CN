// Payment API V2 - 支持新的购买模型
import { Router, Request, Response } from 'express';
import { authMiddleware, requireAuth } from './auth.js';
import subscriptionService from '../services/subscriptionService.js';
import userService from '../services/userService.js';
import entitlementServiceV2, { FeatureType } from '../services/entitlementServiceV2.js';
import { stripe, STRIPE_WEBHOOK_SECRET, isStripeConfigured, PRODUCTS, SUBSCRIBER_DISCOUNT } from '../config/stripe.js';
import { PRICING } from '../config/auth.js';
import { PurchaseScope } from '../db/supabase.js';

const router = Router();

const POINTS_PRICING: Record<FeatureType, number> = {
  dimension: PRICING.DIMENSION_UNLOCK,
  core_theme: PRICING.CORE_THEME_UNLOCK,
  detail: PRICING.DETAIL_VIEW,
  daily_script: PRICING.DAILY_SCRIPT,
  daily_transit: PRICING.DAILY_TRANSIT_DETAIL,
  synastry: PRICING.SYNASTRY_FULL,
  synastry_detail: PRICING.SYNASTRY_DETAIL,
  ask: PRICING.ASK_SINGLE,
  cbt_stats: PRICING.CBT_STATS_MONTHLY,
  synthetica: PRICING.SYNTHETICA_USE,
};

// =====================================================
// 定价信息
// =====================================================

// GET /api/payment/v2/pricing
// 获取定价信息
router.get('/v2/pricing', async (_req: Request, res: Response) => {
  const yearlyAmount = PRODUCTS.subscription.yearly.amount;
  const yearlySavings = 20;
  res.json({
    subscription: {
      monthly: {
        amount: PRODUCTS.subscription.monthly.amount,
        currency: 'usd',
        interval: 'month',
        name: PRODUCTS.subscription.monthly.name,
      },
      yearly: {
        amount: yearlyAmount,
        currency: 'usd',
        interval: 'year',
        name: PRODUCTS.subscription.yearly.name,
        savings: yearlySavings,
      },
    },
    oneTime: {
      dimension: {
        amount: POINTS_PRICING.dimension,
        name: PRODUCTS.oneTime.dimension.name,
        scope: PRODUCTS.oneTime.dimension.scope,
      },
      core_theme: {
        amount: POINTS_PRICING.core_theme,
        name: PRODUCTS.oneTime.core_theme.name,
        scope: PRODUCTS.oneTime.core_theme.scope,
      },
      daily_script: {
        amount: POINTS_PRICING.daily_script,
        name: PRODUCTS.oneTime.daily_script.name,
        scope: PRODUCTS.oneTime.daily_script.scope,
      },
      daily_transit: {
        amount: POINTS_PRICING.daily_transit,
        name: PRODUCTS.oneTime.daily_transit.name,
        scope: PRODUCTS.oneTime.daily_transit.scope,
      },
      detail: {
        amount: POINTS_PRICING.detail,
        name: PRODUCTS.oneTime.detail.name,
        scope: PRODUCTS.oneTime.detail.scope,
      },
      synastry: {
        amount: POINTS_PRICING.synastry,
        name: PRODUCTS.oneTime.synastry.name,
        scope: PRODUCTS.oneTime.synastry.scope,
      },
      synastry_detail: {
        amount: POINTS_PRICING.synastry_detail,
        name: PRODUCTS.oneTime.synastry_detail.name,
        scope: PRODUCTS.oneTime.synastry_detail.scope,
      },
      ask: {
        amount: POINTS_PRICING.ask,
        name: PRODUCTS.oneTime.ask.name,
        scope: PRODUCTS.oneTime.ask.scope,
      },
      cbt_stats: {
        amount: POINTS_PRICING.cbt_stats,
        name: PRODUCTS.oneTime.cbt_stats.name,
        scope: PRODUCTS.oneTime.cbt_stats.scope,
      },
      synthetica: {
        amount: POINTS_PRICING.synthetica,
        name: PRODUCTS.oneTime.synthetica.name,
        scope: PRODUCTS.oneTime.synthetica.scope,
      },
    },
    reports: Object.entries(PRODUCTS.reports).map(([key, value]) => ({
      id: key,
      name: value.name,
      amount: Math.ceil((value.amount || 0) / 10),
    })),
    subscriberDiscount: SUBSCRIBER_DISCOUNT,
  });
});

// =====================================================
// 订阅
// =====================================================

// POST /api/payment/v2/subscribe
// 创建订阅 checkout session
router.post('/v2/subscribe', authMiddleware, requireAuth, async (req: Request, res: Response) => {
  try {
    if (!isStripeConfigured()) {
      return res.status(503).json({ error: 'Payment service unavailable' });
    }

    const { successUrl, cancelUrl, plan } = req.body;

    if (!successUrl || !cancelUrl) {
      return res.status(400).json({ error: 'successUrl and cancelUrl required' });
    }

    const user = await userService.findById(req.userId!);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // 检查是否已订阅
    const entitlements = await entitlementServiceV2.getEntitlements(req.userId!);
    if (entitlements.isSubscriber && !entitlements.isTrialing) {
      return res.status(400).json({ error: 'Already subscribed' });
    }

    const resolvedPlan = plan === 'yearly' ? 'yearly' : 'monthly';
    const checkoutUrl = await subscriptionService.createSubscriptionCheckout({
      userId: req.userId!,
      email: user.email,
      plan: resolvedPlan,
      successUrl,
      cancelUrl,
    });

    res.json({ url: checkoutUrl });
  } catch (error) {
    console.error('Create subscribe checkout error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// =====================================================
// 单次购买
// =====================================================

// POST /api/payment/v2/purchase
// 创建单次购买 checkout session
router.post('/v2/purchase', authMiddleware, requireAuth, async (req: Request, res: Response) => {
  try {
    return res.status(410).json({ error: 'Direct purchase disabled. Use credits instead.' });
    if (!isStripeConfigured()) {
      return res.status(503).json({ error: 'Payment service unavailable' });
    }

    const { featureType, featureId, successUrl, cancelUrl } = req.body;

    if (!featureType || !successUrl || !cancelUrl) {
      return res.status(400).json({ error: 'featureType, successUrl, and cancelUrl required' });
    }

    const validTypes: FeatureType[] = [
      'dimension', 'core_theme', 'detail', 'daily_script', 'daily_transit',
      'synastry', 'synastry_detail', 'ask', 'cbt_stats', 'synthetica'
    ];

    if (!validTypes.includes(featureType as FeatureType)) {
      return res.status(400).json({ error: 'Invalid feature type' });
    }

    const user = await userService.findById(req.userId!);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // 获取产品信息
    const product = PRODUCTS.oneTime[featureType as keyof typeof PRODUCTS.oneTime];
    if (!product) {
      return res.status(400).json({ error: 'Product not found' });
    }

    // 获取 scope（新版产品才有）
    const scope = 'scope' in product ? product.scope : 'consumable';

    // 创建 Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: user.email,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: product.name,
              metadata: {
                featureType,
                featureId: featureId || '',
              },
            },
            unit_amount: product.amount,
          },
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId: req.userId!,
        featureType,
        featureId: featureId || '',
        scope,
        version: 'v2',
      },
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Create purchase checkout error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

router.post('/v2/purchase-with-credits', authMiddleware, requireAuth, async (req: Request, res: Response) => {
  try {
    const { featureType, featureId } = req.body;

    if (!featureType) {
      return res.status(400).json({ error: 'featureType required' });
    }

    const validTypes: FeatureType[] = [
      'dimension', 'core_theme', 'detail', 'daily_script', 'daily_transit',
      'synastry', 'synastry_detail', 'ask', 'cbt_stats', 'synthetica'
    ];

    if (!validTypes.includes(featureType as FeatureType)) {
      return res.status(400).json({ error: 'Invalid feature type' });
    }

    const product = PRODUCTS.oneTime[featureType as keyof typeof PRODUCTS.oneTime];
    if (!product) {
      return res.status(400).json({ error: 'Product not found' });
    }

    const scope = 'scope' in product ? product.scope : 'consumable';
    const pricePoints = POINTS_PRICING[featureType as FeatureType] || 0;

    const entitlements = await entitlementServiceV2.getEntitlements(req.userId!);
    if (entitlements.credits < pricePoints) {
      return res.status(403).json({ error: 'Insufficient credits' });
    }

    const record = await entitlementServiceV2.purchaseWithCredits(
      req.userId!,
      featureType as FeatureType,
      featureId || null,
      scope,
      pricePoints
    );

    if (!record) {
      return res.status(403).json({ error: 'Insufficient credits' });
    }

    const updated = await entitlementServiceV2.getEntitlements(req.userId!);

    res.json({
      success: true,
      entitlements: updated,
    });
  } catch (error) {
    console.error('Purchase with credits error:', error);
    res.status(500).json({ error: 'Failed to purchase with credits' });
  }
});

// =====================================================
// Webhook 处理
// =====================================================

// POST /api/payment/v2/webhook
// Stripe Webhook 处理（新版）
router.post('/v2/webhook', async (req: Request, res: Response) => {
  if (!isStripeConfigured()) {
    return res.status(503).json({ error: 'Payment service unavailable' });
  }

  const sig = req.headers['stripe-signature'] as string;

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return res.status(400).json({ error: 'Webhook signature verification failed' });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const version = session.metadata?.version;

        // 只处理 V2 版本的购买
        if (version !== 'v2') {
          break;
        }

        if (session.mode === 'payment') {
          const userId = session.metadata?.userId;
          const featureType = session.metadata?.featureType as FeatureType;
          const featureId = session.metadata?.featureId || null;
          const scope = session.metadata?.scope as PurchaseScope;

          if (userId && featureType && scope) {
            await entitlementServiceV2.recordPurchase(
              userId,
              featureType,
              featureId,
              scope,
              session.amount_total || 0,
              session.payment_intent as string,
              session.id
            );

            console.log(`Purchase recorded: ${featureType}/${featureId} for user ${userId}`);
          }
        }
        break;
      }

      // 订阅相关事件仍由原有 webhook 处理
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export default router;
