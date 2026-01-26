// Entitlements API V2 - 支持新付费模型
import { Router, Request, Response } from 'express';
import { authMiddleware, optionalAuthMiddleware } from './auth.js';
import entitlementServiceV2, {
  FeatureType,
  generateSynastryHash,
} from '../services/entitlementServiceV2.js';
import { SynastryPersonInfo, isSupabaseConfigured } from '../db/supabase.js';

const router = Router();

// =====================================================
// 权益状态 API
// =====================================================

// GET /api/entitlements/v2
// 获取用户完整权益状态
router.get('/v2', optionalAuthMiddleware, async (req: Request, res: Response) => {
  const deviceFingerprint = req.headers['x-device-fingerprint'] as string | undefined;

  try {
    console.log('[Entitlements V2] Request:', {
      userId: req.userId || 'anonymous',
      deviceFingerprint: deviceFingerprint ? 'present' : 'missing',
      headers: Object.keys(req.headers),
    });

    const entitlements = await entitlementServiceV2.getEntitlements(
      req.userId || null,
      deviceFingerprint
    );

    console.log('[Entitlements V2] Success:', {
      userId: req.userId || 'anonymous',
      isSubscriber: entitlements.isSubscriber,
      totalLeft: entitlements.ask.totalLeft,
    });

    res.json(entitlements);
  } catch (error) {
    console.error('[Entitlements V2] Error:', {
      userId: req.userId || 'anonymous',
      deviceFingerprint: deviceFingerprint ? 'present' : 'missing',
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name,
      } : error,
    });
    res.status(500).json({ error: 'Failed to get entitlements' });
  }
});

// POST /api/entitlements/v2/check
// 检查特定功能是否可访问
router.post('/v2/check', optionalAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { featureType, featureId } = req.body;
    const deviceFingerprint = req.headers['x-device-fingerprint'] as string | undefined;

    const validFeatures: FeatureType[] = [
      'dimension', 'core_theme', 'detail', 'daily_script', 'daily_transit',
      'synastry', 'synastry_detail', 'ask', 'cbt_stats', 'synthetica'
    ];

    if (!validFeatures.includes(featureType as FeatureType)) {
      return res.status(400).json({ error: 'Invalid feature type' });
    }

    const result = await entitlementServiceV2.checkAccess(
      req.userId || null,
      featureType as FeatureType,
      featureId,
      deviceFingerprint
    );

    res.json(result);
  } catch (error) {
    console.error('Check feature error:', error);
    res.status(500).json({ error: 'Failed to check feature' });
  }
});

// POST /api/entitlements/v2/consume
// 消耗权益（Ask、合盘等消耗型）
router.post('/v2/consume', optionalAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { featureType, featureId } = req.body;
    const deviceFingerprint = req.headers['x-device-fingerprint'] as string | undefined;

    const validFeatures: FeatureType[] = ['ask', 'synastry', 'synthetica'];
    if (!validFeatures.includes(featureType as FeatureType)) {
      return res.status(400).json({ error: 'Invalid feature type for consumption' });
    }

    // 先检查是否可以访问
    const canAccess = await entitlementServiceV2.checkAccess(
      req.userId || null,
      featureType as FeatureType,
      featureId,
      deviceFingerprint
    );

    if (!canAccess.canAccess) {
      return res.status(403).json({
        error: 'Feature not available',
        needPurchase: canAccess.needPurchase,
        price: canAccess.price,
      });
    }

    // 消耗权益
    const consumed = await entitlementServiceV2.consumeFeature(
      req.userId || null,
      featureType as FeatureType,
      deviceFingerprint
    );

    if (!consumed) {
      return res.status(403).json({
        error: 'Failed to consume feature',
        reason: 'No credits available',
      });
    }

    // 返回更新后的权益状态
    const entitlements = await entitlementServiceV2.getEntitlements(
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

// =====================================================
// 合盘相关 API
// =====================================================

// POST /api/entitlements/v2/synastry/check-hash
// 检查合盘是否已存在（用于防刷）
router.post('/v2/synastry/check-hash', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { personA, personB, relationshipType } = req.body as {
      personA: SynastryPersonInfo;
      personB: SynastryPersonInfo;
      relationshipType: string;
    };

    if (!personA || !personB || !relationshipType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const deviceFingerprint = req.headers['x-device-fingerprint'] as string | undefined;

    if (!isSupabaseConfigured()) {
      const hash = generateSynastryHash(personA, personB, relationshipType);
      const entitlements = await entitlementServiceV2.getEntitlements(req.userId || null, deviceFingerprint);

      return res.json({
        exists: false,
        hash,
        canAccessFree: entitlements.synastry.totalLeft > 0,
        freeLeft: entitlements.synastry.freeLeft,
        subscriptionLeft: entitlements.synastry.subscriptionLeft,
        totalLeft: entitlements.synastry.totalLeft,
      });
    }

    const result = await entitlementServiceV2.checkSynastryHash(
      req.userId!,
      personA,
      personB,
      relationshipType
    );

    // 获取当前合盘额度
    const entitlements = await entitlementServiceV2.getEntitlements(req.userId!, deviceFingerprint);

    res.json({
      exists: result.exists,
      hash: result.hash,
      canAccessFree: entitlements.synastry.totalLeft > 0,
      freeLeft: entitlements.synastry.freeLeft,
      subscriptionLeft: entitlements.synastry.subscriptionLeft,
      totalLeft: entitlements.synastry.totalLeft,
    });
  } catch (error) {
    console.error('Check synastry hash error:', error);
    res.status(500).json({ error: 'Failed to check synastry hash' });
  }
});

// POST /api/entitlements/v2/synastry/record
// 记录合盘使用
router.post('/v2/synastry/record', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { personA, personB, relationshipType, isFree } = req.body as {
      personA: SynastryPersonInfo;
      personB: SynastryPersonInfo;
      relationshipType: string;
      isFree: boolean;
    };

    if (!personA || !personB || !relationshipType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const deviceFingerprint = req.headers['x-device-fingerprint'] as string | undefined;

    if (!isSupabaseConfigured()) {
      const hash = generateSynastryHash(personA, personB, relationshipType);
      const entitlements = await entitlementServiceV2.getEntitlements(req.userId || null, deviceFingerprint);
      const synastry = { ...entitlements.synastry };

      if (isFree && synastry.totalLeft > 0) {
        if (synastry.freeLeft > 0) {
          synastry.freeLeft -= 1;
        } else if (synastry.subscriptionLeft > 0) {
          synastry.subscriptionLeft -= 1;
        }
        synastry.totalLeft = Math.max(0, synastry.freeLeft + synastry.subscriptionLeft);
      }

      return res.json({
        success: true,
        record: {
          id: 'local',
          hash,
          createdAt: new Date().toISOString(),
        },
        entitlements: {
          ...entitlements,
          synastry,
        },
      });
    }

    const record = await entitlementServiceV2.recordSynastryUsage(
      req.userId!,
      personA,
      personB,
      relationshipType,
      isFree
    );

    // 如果使用免费/订阅次数，消耗权益
    if (isFree) {
      await entitlementServiceV2.consumeFeature(
        req.userId!,
        'synastry',
        deviceFingerprint
      );
    }

    // 返回更新后的权益状态
    const entitlements = await entitlementServiceV2.getEntitlements(req.userId!);

    res.json({
      success: true,
      record: {
        id: record.id,
        hash: record.synastry_hash,
        createdAt: record.created_at,
      },
      entitlements,
    });
  } catch (error) {
    console.error('Record synastry error:', error);
    res.status(500).json({ error: 'Failed to record synastry' });
  }
});

// =====================================================
// 购买记录 API
// =====================================================

// GET /api/entitlements/v2/purchases
// 获取用户购买记录
router.get('/v2/purchases', authMiddleware, async (req: Request, res: Response) => {
  try {
    const purchases = await entitlementServiceV2.getUserPurchases(req.userId!);

    res.json({
      purchases: purchases.map(p => ({
        id: p.id,
        featureType: p.feature_type,
        featureId: p.feature_id,
        scope: p.scope,
        priceCents: p.price_cents,
        quantity: p.quantity,
        consumed: p.consumed,
        validUntil: p.valid_until,
        createdAt: p.created_at,
      })),
    });
  } catch (error) {
    console.error('Get purchases error:', error);
    res.status(500).json({ error: 'Failed to get purchases' });
  }
});

// =====================================================
// 工具 API
// =====================================================

// POST /api/entitlements/v2/generate-hash
// 生成合盘哈希（不记录）
router.post('/v2/generate-hash', async (req: Request, res: Response) => {
  try {
    const { personA, personB, relationshipType } = req.body as {
      personA: SynastryPersonInfo;
      personB: SynastryPersonInfo;
      relationshipType: string;
    };

    if (!personA || !personB || !relationshipType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const hash = generateSynastryHash(personA, personB, relationshipType);

    res.json({ hash });
  } catch (error) {
    console.error('Generate hash error:', error);
    res.status(500).json({ error: 'Failed to generate hash' });
  }
});

export default router;
