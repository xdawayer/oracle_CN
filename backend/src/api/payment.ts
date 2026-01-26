// Payment API routes
import { Router, Request, Response } from 'express';
import { authMiddleware, requireAuth } from './auth.js';
import subscriptionService from '../services/subscriptionService.js';
import userService from '../services/userService.js';
import { supabase, isSupabaseConfigured } from '../db/supabase.js';
import { stripe, STRIPE_WEBHOOK_SECRET, isStripeConfigured, PRODUCTS, SUBSCRIBER_DISCOUNT } from '../config/stripe.js';
import { SUBSCRIPTION_BENEFITS } from '../config/auth.js';
import { addDevGmCredits } from '../services/entitlementService.js';
import { isSupabaseConfigured } from '../db/supabase.js';

const router = Router();

// Get subscription status
router.get('/subscription', authMiddleware, requireAuth, async (req: Request, res: Response) => {
  try {
    const subscription = await subscriptionService.getSubscription(req.userId!);

    if (!subscription) {
      return res.json({
        hasSubscription: false,
      });
    }

    res.json({
      hasSubscription: true,
      subscription: {
        id: subscription.id,
        plan: subscription.plan,
        status: subscription.status,
        currentPeriodStart: subscription.current_period_start,
        currentPeriodEnd: subscription.current_period_end,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        usage: subscription.usage,
      },
    });
  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({ error: 'Failed to get subscription' });
  }
});

// Create checkout session for subscription
router.post('/create-checkout', authMiddleware, requireAuth, async (req: Request, res: Response) => {
  try {
    if (!isStripeConfigured()) {
      return res.status(503).json({ error: 'Payment service unavailable' });
    }

    const { plan, successUrl, cancelUrl } = req.body;

    if (!plan || !successUrl || !cancelUrl) {
      return res.status(400).json({ error: 'Plan, successUrl, and cancelUrl required' });
    }

    if (!['monthly', 'yearly'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan' });
    }

    const user = await userService.findById(req.userId!);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if already subscribed
    const existingSubscription = await subscriptionService.getSubscription(req.userId!);
    if (existingSubscription && existingSubscription.status === 'active') {
      return res.status(400).json({ error: 'Already subscribed' });
    }

    const checkoutUrl = await subscriptionService.createSubscriptionCheckout({
      userId: req.userId!,
      email: user.email,
      plan,
      successUrl,
      cancelUrl,
    });

    res.json({ url: checkoutUrl });
  } catch (error) {
    console.error('Create checkout error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Create checkout session for one-time purchase
router.post('/purchase', authMiddleware, requireAuth, async (req: Request, res: Response) => {
  try {
    if (!isStripeConfigured()) {
      return res.status(503).json({ error: 'Payment service unavailable' });
    }

    const { productType, productId, successUrl, cancelUrl } = req.body;

    if (!productType || !successUrl || !cancelUrl) {
      return res.status(400).json({ error: 'productType, successUrl, and cancelUrl required' });
    }

    const validTypes = ['ask', 'detail_pack', 'synastry', 'cbt_analysis', 'report'];
    if (!validTypes.includes(productType)) {
      return res.status(400).json({ error: 'Invalid product type' });
    }

    if (productType === 'report' && !productId) {
      return res.status(400).json({ error: 'Report type required' });
    }

    const user = await userService.findById(req.userId!);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if subscriber for discount
    const subscription = await subscriptionService.getSubscription(req.userId!);
    const isSubscriber = subscription?.status === 'active';

    const checkoutUrl = await subscriptionService.createPurchaseCheckout({
      userId: req.userId!,
      email: user.email,
      productType,
      productId,
      successUrl,
      cancelUrl,
      isSubscriber,
    });

    res.json({ url: checkoutUrl });
  } catch (error) {
    console.error('Create purchase checkout error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Create customer portal session
router.post('/create-portal', authMiddleware, requireAuth, async (req: Request, res: Response) => {
  try {
    if (!isStripeConfigured()) {
      return res.status(503).json({ error: 'Payment service unavailable' });
    }

    const { returnUrl } = req.body;

    if (!returnUrl) {
      return res.status(400).json({ error: 'returnUrl required' });
    }

    const subscription = await subscriptionService.getSubscription(req.userId!);
    if (!subscription?.stripe_customer_id) {
      return res.status(400).json({ error: 'No subscription found' });
    }

    const portalUrl = await subscriptionService.createPortalSession(
      subscription.stripe_customer_id,
      returnUrl
    );

    res.json({ url: portalUrl });
  } catch (error) {
    console.error('Create portal error:', error);
    res.status(500).json({ error: 'Failed to create portal session' });
  }
});

// Get purchase history
router.get('/purchases', authMiddleware, requireAuth, async (req: Request, res: Response) => {
  try {
    const purchases = await subscriptionService.getPurchases(req.userId!);

    res.json({
      purchases: purchases.map(p => ({
        id: p.id,
        productType: p.product_type,
        productId: p.product_id,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        quantity: p.quantity,
        consumed: p.consumed,
        createdAt: p.created_at,
      })),
    });
  } catch (error) {
    console.error('Get purchases error:', error);
    res.status(500).json({ error: 'Failed to get purchases' });
  }
});

// Get pricing info
router.get('/pricing', async (_req: Request, res: Response) => {
  res.json({
    subscription: {
      monthly: {
        amount: PRODUCTS.subscription.monthly.amount,
        currency: 'usd',
        interval: 'month',
      },
      yearly: {
        amount: PRODUCTS.subscription.yearly.amount,
        currency: 'usd',
        interval: 'year',
        savings: Math.round((PRODUCTS.subscription.monthly.amount * 12 - PRODUCTS.subscription.yearly.amount) / (PRODUCTS.subscription.monthly.amount * 12) * 100),
      },
    },
    oneTime: {
      ask: { amount: PRODUCTS.oneTime.ask.amount, quantity: 1 },
      detail_pack: { amount: PRODUCTS.oneTime.detail_pack.amount, quantity: 10 },
      synastry: { amount: PRODUCTS.oneTime.synastry.amount, quantity: 1 },
      cbt_analysis: { amount: PRODUCTS.oneTime.cbt_analysis.amount, quantity: 1 },
    },
    reports: Object.entries(PRODUCTS.reports).map(([key, value]) => ({
      id: key,
      name: value.name,
      amount: value.amount,
    })),
    subscriberDiscount: SUBSCRIBER_DISCOUNT,
  });
});

// Stripe webhook handler
router.post('/webhook', async (req: Request, res: Response) => {
  if (!isStripeConfigured()) {
    return res.status(503).json({ error: 'Payment service unavailable' });
  }

  const sig = req.headers['stripe-signature'] as string;

  let event;

  try {
    // Note: req.body must be the raw body for signature verification
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

        if (session.mode === 'subscription') {
          // Subscription created
          const userId = session.metadata?.userId;
          if (userId && session.subscription) {
            const stripeSubscription = await stripe.subscriptions.retrieve(
              session.subscription as string
            );
            await subscriptionService.upsertSubscription(userId, stripeSubscription as any);
          }
        } else if (session.mode === 'payment') {
          // One-time purchase
          const userId = session.metadata?.userId;
          const productType = session.metadata?.productType;
          const productId = session.metadata?.productId;

          if (userId && productType) {
            await subscriptionService.recordPurchase(
              userId,
              productType as any,
              productId || null,
              session.amount_total || 0,
              session.payment_intent as string,
              session.id
            );
          }
        }
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.created': {
        const subscription = event.data.object;
        const userId = subscription.metadata?.userId;

        if (userId) {
          await subscriptionService.upsertSubscription(userId, subscription as any);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const userId = subscription.metadata?.userId;

        if (userId) {
          // Mark subscription as expired
          await subscriptionService.upsertSubscription(userId, {
            ...subscription,
            status: 'canceled',
          } as any);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as { subscription?: string; billing_reason?: string; payment_intent?: string; id?: string };
        const isSubscriptionPayment = invoice.subscription
          && (invoice.billing_reason === 'subscription_cycle' || invoice.billing_reason === 'subscription_create');
        if (isSubscriptionPayment) {
          const subscription = await stripe.subscriptions.retrieve(
            invoice.subscription as string
          );
          const userId = subscription.metadata?.userId;
          if (userId) {
            const dbSub = await subscriptionService.getSubscription(userId);
            if (dbSub) {
              await subscriptionService.resetMonthlyUsage(dbSub.id);
            }
            const bonus = SUBSCRIPTION_BENEFITS.SUBSCRIPTION_BONUS_CREDITS;
            if (bonus > 0) {
              if (!isSupabaseConfigured()) {
                addDevGmCredits(userId, bonus);
              } else {
                const paymentId = invoice.payment_intent || invoice.id || `invoice_${Date.now()}`;
                const { data: existing } = await supabase
                  .from('purchase_records')
                  .select('id')
                  .eq('user_id', userId)
                  .eq('feature_type', 'gm_credit')
                  .eq('stripe_payment_intent_id', paymentId)
                  .limit(1);

                if (!existing || existing.length === 0) {
                  await supabase
                    .from('purchase_records')
                    .insert({
                      user_id: userId,
                      feature_type: 'gm_credit',
                      feature_id: 'subscription_bonus',
                      scope: 'consumable',
                      price_cents: 0,
                      quantity: bonus,
                      consumed: 0,
                      stripe_payment_intent_id: paymentId,
                      stripe_checkout_session_id: invoice.id || null,
                    });
                }
              }
            }
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        // TODO: Send email notification about payment failure
        console.log('Payment failed for invoice:', invoice.id);
        break;
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export default router;
