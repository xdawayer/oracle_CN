// Subscription Service - handles subscriptions and purchases
import { v4 as uuidv4 } from 'uuid';
import { isDatabaseConfigured, DbSubscription, DbPurchase, query, getOne, insert, update } from '../db/mysql.js';
import { stripe, PRODUCTS, STRIPE_PRICES, isStripeConfigured, SUBSCRIBER_DISCOUNT } from '../config/stripe.js';
import { SUBSCRIPTION_BENEFITS } from '../config/auth.js';

export interface CreateCheckoutInput {
  userId: string;
  email: string;
  plan: 'monthly' | 'yearly';
  successUrl: string;
  cancelUrl: string;
}

export interface CreatePurchaseCheckoutInput {
  userId: string;
  email: string;
  productType: 'ask' | 'detail_pack' | 'synastry' | 'cbt_analysis' | 'report';
  productId?: string; // For reports
  successUrl: string;
  cancelUrl: string;
  isSubscriber?: boolean;
}

class SubscriptionService {
  // Create Stripe checkout session for subscription
  async createSubscriptionCheckout(input: CreateCheckoutInput): Promise<string> {
    if (!isStripeConfigured()) {
      throw new Error('Stripe not configured');
    }

    const priceId = input.plan === 'monthly'
      ? STRIPE_PRICES.MONTHLY_SUBSCRIPTION
      : STRIPE_PRICES.YEARLY_SUBSCRIPTION;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: input.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      metadata: {
        userId: input.userId,
        plan: input.plan,
      },
      subscription_data: {
        metadata: {
          userId: input.userId,
        },
      },
    });

    return session.url || '';
  }

  // Create Stripe checkout session for one-time purchase
  async createPurchaseCheckout(input: CreatePurchaseCheckoutInput): Promise<string> {
    if (!isStripeConfigured()) {
      throw new Error('Stripe not configured');
    }

    let priceId: string;
    let amount: number;

    switch (input.productType) {
      case 'ask':
        priceId = STRIPE_PRICES.ASK_SINGLE;
        amount = PRODUCTS.oneTime.ask.amount;
        break;
      case 'detail_pack':
        priceId = STRIPE_PRICES.DETAIL_PACK_10;
        amount = PRODUCTS.oneTime.detail_pack.amount;
        break;
      case 'synastry':
        priceId = STRIPE_PRICES.SYNASTRY_FULL;
        amount = PRODUCTS.oneTime.synastry.amount;
        break;
      case 'cbt_analysis':
        priceId = STRIPE_PRICES.CBT_ANALYSIS;
        amount = PRODUCTS.oneTime.cbt_analysis.amount;
        break;
      case 'report':
        const reportConfig = PRODUCTS.reports[input.productId as keyof typeof PRODUCTS.reports];
        if (!reportConfig) {
          throw new Error('Invalid report type');
        }
        priceId = reportConfig.priceId;
        amount = reportConfig.amount;
        break;
      default:
        throw new Error('Invalid product type');
    }

    // Apply subscriber discount for reports
    if (input.isSubscriber && input.productType === 'report') {
      amount = Math.round(amount * (1 - SUBSCRIBER_DISCOUNT));
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: input.email,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: this.getProductName(input.productType, input.productId),
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      metadata: {
        userId: input.userId,
        productType: input.productType,
        productId: input.productId || '',
      },
    });

    return session.url || '';
  }

  private getProductName(productType: string, productId?: string): string {
    if (productType === 'report' && productId) {
      const report = PRODUCTS.reports[productId as keyof typeof PRODUCTS.reports];
      return report?.name || 'Report';
    }
    const product = PRODUCTS.oneTime[productType as keyof typeof PRODUCTS.oneTime];
    return product?.name || productType;
  }

  // Create Stripe Customer Portal session
  async createPortalSession(stripeCustomerId: string, returnUrl: string): Promise<string> {
    if (!isStripeConfigured()) {
      throw new Error('Stripe not configured');
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: returnUrl,
    });

    return session.url;
  }

  // Get user's subscription
  async getSubscription(userId: string): Promise<DbSubscription | null> {
    if (!isDatabaseConfigured()) return null;

    return getOne<DbSubscription>(
      'SELECT * FROM subscriptions WHERE user_id = ? AND status IN (?, ?, ?) ORDER BY created_at DESC LIMIT 1',
      [userId, 'active', 'trialing', 'past_due']
    );
  }

  // Create or update subscription from Stripe webhook
  async upsertSubscription(
    userId: string,
    stripeSubscription: {
      id: string;
      customer: string;
      status: string;
      current_period_start: number;
      current_period_end: number;
      cancel_at_period_end: boolean;
      items: { data: Array<{ price: { id: string } }> };
    }
  ): Promise<DbSubscription> {
    if (!isDatabaseConfigured()) {
      throw new Error('Database not configured');
    }

    const priceId = stripeSubscription.items.data[0]?.price.id;
    const plan = priceId === STRIPE_PRICES.YEARLY_SUBSCRIPTION ? 'yearly' : 'monthly';

    // Map Stripe status to our status
    let status: DbSubscription['status'];
    switch (stripeSubscription.status) {
      case 'active':
        status = 'active';
        break;
      case 'trialing':
        status = 'trialing';
        break;
      case 'past_due':
        status = 'past_due';
        break;
      case 'canceled':
      case 'unpaid':
        status = 'canceled';
        break;
      default:
        status = 'expired';
    }

    const subscriptionData = {
      user_id: userId,
      stripe_subscription_id: stripeSubscription.id,
      stripe_customer_id: stripeSubscription.customer as string,
      stripe_price_id: priceId,
      plan,
      status,
      current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: stripeSubscription.cancel_at_period_end,
    };

    // Check if subscription exists
    const existing = await getOne<{ id: string }>(
      'SELECT id FROM subscriptions WHERE stripe_subscription_id = ?',
      [stripeSubscription.id]
    );

    if (existing) {
      await update('subscriptions', subscriptionData, 'stripe_subscription_id = ?', [stripeSubscription.id]);
      return (await getOne<DbSubscription>(
        'SELECT * FROM subscriptions WHERE stripe_subscription_id = ?',
        [stripeSubscription.id]
      ))!;
    } else {
      const id = uuidv4();
      return await insert<DbSubscription>('subscriptions', { id, ...subscriptionData });
    }
  }

  // Cancel subscription
  async cancelSubscription(stripeSubscriptionId: string): Promise<void> {
    if (!isStripeConfigured()) {
      throw new Error('Stripe not configured');
    }

    await stripe.subscriptions.update(stripeSubscriptionId, {
      cancel_at_period_end: true,
    });
  }

  // Resume canceled subscription
  async resumeSubscription(stripeSubscriptionId: string): Promise<void> {
    if (!isStripeConfigured()) {
      throw new Error('Stripe not configured');
    }

    await stripe.subscriptions.update(stripeSubscriptionId, {
      cancel_at_period_end: false,
    });
  }

  // Record a purchase
  async recordPurchase(
    userId: string,
    productType: DbPurchase['product_type'],
    productId: string | null,
    amount: number,
    stripePaymentIntentId?: string,
    stripeCheckoutSessionId?: string
  ): Promise<DbPurchase> {
    if (!isDatabaseConfigured()) {
      throw new Error('Database not configured');
    }

    let quantity = 1;
    if (productType === 'detail_pack') {
      quantity = PRODUCTS.oneTime.detail_pack.quantity;
    }

    const id = uuidv4();
    const purchase = await insert<DbPurchase>('purchases', {
      id,
      user_id: userId,
      product_type: productType,
      product_id: productId,
      amount,
      stripe_payment_intent_id: stripePaymentIntentId || null,
      stripe_checkout_session_id: stripeCheckoutSessionId || null,
      status: 'completed',
      quantity,
      consumed: 0,
    });

    return purchase;
  }

  // Get user's purchases
  async getPurchases(userId: string): Promise<DbPurchase[]> {
    if (!isDatabaseConfigured()) return [];

    return query<DbPurchase>(
      'SELECT * FROM purchases WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
  }

  // Get available purchase credits
  async getAvailableCredits(
    userId: string,
    productType: 'ask' | 'detail_pack' | 'synastry' | 'cbt_analysis'
  ): Promise<number> {
    if (!isDatabaseConfigured()) return 0;

    const rows = await query<{ quantity: number; consumed: number }>(
      'SELECT quantity, consumed FROM purchases WHERE user_id = ? AND product_type = ? AND status = ?',
      [userId, productType, 'completed']
    );

    return rows.reduce((total, p) => total + (p.quantity - p.consumed), 0);
  }

  // Consume a purchase credit
  async consumeCredit(userId: string, productType: string): Promise<boolean> {
    if (!isDatabaseConfigured()) return false;

    // Find a purchase with available credits
    const purchase = await getOne<DbPurchase>(
      'SELECT * FROM purchases WHERE user_id = ? AND product_type = ? AND status = ? AND quantity > consumed ORDER BY created_at ASC LIMIT 1',
      [userId, productType, 'completed']
    );

    if (!purchase) return false;

    // Increment consumed count
    const affected = await update(
      'purchases',
      { consumed: purchase.consumed + 1 },
      'id = ?',
      [purchase.id]
    );

    return affected > 0;
  }

  // Check if user has purchased a report
  async hasReport(userId: string, reportType: string): Promise<boolean> {
    if (!isDatabaseConfigured()) return false;

    const row = await getOne<{ id: string }>(
      'SELECT id FROM purchases WHERE user_id = ? AND product_type = ? AND product_id = ? AND status = ? LIMIT 1',
      [userId, 'report', reportType, 'completed']
    );

    return !!row;
  }

  // Use synastry read from subscription
  async useSynastryRead(userId: string): Promise<boolean> {
    if (!isDatabaseConfigured()) return false;

    const subscription = await this.getSubscription(userId);
    if (!subscription || subscription.status !== 'active') return false;

    const usage = subscription.usage;
    if (usage.synastryReads >= SUBSCRIPTION_BENEFITS.SYNASTRY_READS_PER_MONTH) {
      return false;
    }

    const affected = await update(
      'subscriptions',
      {
        usage: {
          ...usage,
          synastryReads: usage.synastryReads + 1,
        },
      },
      'id = ?',
      [subscription.id]
    );

    return affected > 0;
  }

  // Claim monthly report
  async claimMonthlyReport(userId: string): Promise<boolean> {
    if (!isDatabaseConfigured()) return false;

    const subscription = await this.getSubscription(userId);
    if (!subscription || subscription.status !== 'active') return false;

    if (subscription.usage.monthlyReportClaimed) {
      return false;
    }

    const affected = await update(
      'subscriptions',
      {
        usage: {
          ...subscription.usage,
          monthlyReportClaimed: true,
        },
      },
      'id = ?',
      [subscription.id]
    );

    return affected > 0;
  }

  // Reset monthly usage (called by cron job or webhook)
  async resetMonthlyUsage(subscriptionId: string): Promise<void> {
    if (!isDatabaseConfigured()) return;

    await update(
      'subscriptions',
      {
        usage: {
          synastryReads: 0,
          monthlyReportClaimed: false,
        },
      },
      'id = ?',
      [subscriptionId]
    );
  }
}

export const subscriptionService = new SubscriptionService();
export default subscriptionService;
