// Entitlements API routes
import { Router, Request, Response } from 'express';
import { authMiddleware } from './auth.js';
import entitlementService, { Feature } from '../services/entitlementService.js';

const router = Router();

// Get current entitlements
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const deviceFingerprint = req.headers['x-device-fingerprint'] as string | undefined;

    const entitlements = await entitlementService.getEntitlements(
      req.userId || null,
      deviceFingerprint
    );

    res.json(entitlements);
  } catch (error) {
    console.error('Get entitlements error:', error);
    res.status(500).json({ error: 'Failed to get entitlements' });
  }
});

// Check if user can use a feature
router.get('/check/:feature', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { feature } = req.params;
    const reportType = req.query.reportType as string | undefined;
    const deviceFingerprint = req.headers['x-device-fingerprint'] as string | undefined;

    const validFeatures: Feature[] = ['ask', 'detail', 'synastry', 'cbt_analysis', 'daily_detail', 'report'];
    if (!validFeatures.includes(feature as Feature)) {
      return res.status(400).json({ error: 'Invalid feature' });
    }

    const result = await entitlementService.canUseFeature(
      req.userId || null,
      feature as Feature,
      deviceFingerprint,
      reportType
    );

    res.json(result);
  } catch (error) {
    console.error('Check feature error:', error);
    res.status(500).json({ error: 'Failed to check feature' });
  }
});

// Consume a feature usage
router.post('/consume', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { feature } = req.body;
    const deviceFingerprint = req.headers['x-device-fingerprint'] as string | undefined;

    const validFeatures: Feature[] = ['ask', 'detail', 'synastry', 'cbt_analysis'];
    if (!validFeatures.includes(feature as Feature)) {
      return res.status(400).json({ error: 'Invalid feature' });
    }

    // First check if user can use the feature
    const canUse = await entitlementService.canUseFeature(
      req.userId || null,
      feature as Feature,
      deviceFingerprint
    );

    if (!canUse.allowed) {
      return res.status(403).json({
        error: 'Feature not available',
        reason: canUse.reason,
      });
    }

    // Consume the usage
    const consumed = await entitlementService.consumeFeature(
      req.userId || null,
      feature as Feature,
      deviceFingerprint
    );

    if (!consumed) {
      return res.status(403).json({
        error: 'Failed to consume feature',
        reason: 'No credits available',
      });
    }

    // Return updated entitlements
    const entitlements = await entitlementService.getEntitlements(
      req.userId || null,
      deviceFingerprint
    );

    res.json({
      success: true,
      entitlements,
    });
  } catch (error) {
    console.error('Consume feature error:', error);
    res.status(500).json({ error: 'Failed to consume feature' });
  }
});

// Get free usage for device (for non-logged-in users)
router.get('/free-usage', async (req: Request, res: Response) => {
  try {
    const deviceFingerprint = req.headers['x-device-fingerprint'] as string;

    if (!deviceFingerprint) {
      return res.status(400).json({ error: 'Device fingerprint required' });
    }

    const freeUsage = await entitlementService.getFreeUsage(deviceFingerprint);

    if (!freeUsage) {
      return res.json({
        askUsed: 0,
        detailUsed: 0,
        synastryUsed: 0,
      });
    }

    res.json({
      askUsed: freeUsage.ask_used,
      detailUsed: freeUsage.detail_used,
      synastryUsed: freeUsage.synastry_used,
    });
  } catch (error) {
    console.error('Get free usage error:', error);
    res.status(500).json({ error: 'Failed to get free usage' });
  }
});

export default router;
