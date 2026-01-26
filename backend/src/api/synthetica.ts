import { Router } from 'express';
import { generateAIContentWithMeta } from '../services/ai.js';
import type { Language } from '../types/api.js';
import { optionalAuthMiddleware } from './auth.js';
import entitlementServiceV2 from '../services/entitlementServiceV2.js';
import { PRICING } from '../config/auth.js';

export const syntheticaRouter = Router();

// Types derived from frontend types (astrosynthetica/types.ts)
enum AspectCategory {
  FUSION = "FUSION",
  FRICTION = "FRICTION",
  FLOW = "FLOW",
}

enum ContextFilter {
  LOVE = "LOVE",
  CAREER = "CAREER",
  SELF = "SELF",
  HEALING = "HEALING",
  TIMING = "TIMING",
  SOCIAL = "SOCIAL",
}

interface Planet {
  id: string;
  name: string;
  tier: number;
}

interface Aspect {
  id: string;
  name: string;
  category: AspectCategory;
}

interface SelectionState {
  planet: Planet | null;
  sign: { id: string; name: string } | null;
  house: { id: string; name: string; archetype: string } | null;
  context: ContextFilter;
  aspects: { planet: Planet; aspect: Aspect }[];
}

interface GeneratePayload extends SelectionState {
  lang?: Language;
  language?: Language;
}

// Canonical weighting constants
const CONTEXT_PLANET_MULTIPLIERS: Record<ContextFilter, Record<string, number>> = {
  [ContextFilter.LOVE]: { venus: 2.0, moon: 1.8, mars: 1.5, pluto: 1.2, neptune: 1.2, sun: 0.8, mercury: 1.0, saturn: 1.2 },
  [ContextFilter.SELF]: { sun: 2.0, moon: 1.8, mars: 1.2, mercury: 1.2, venus: 1.0, saturn: 1.0, jupiter: 1.0 },
  [ContextFilter.HEALING]: { moon: 2.5, saturn: 1.8, pluto: 2.0, neptune: 1.5, sun: 1.0, mars: 0.8, venus: 0.8 },
  [ContextFilter.CAREER]: { saturn: 2.0, mars: 1.8, sun: 1.5, jupiter: 1.5, mercury: 1.5, venus: 0.8, moon: 0.5 },
  [ContextFilter.TIMING]: { saturn: 2.2, uranus: 1.8, mercury: 1.5, pluto: 1.2, jupiter: 1.2 },
  [ContextFilter.SOCIAL]: { mercury: 1.8, venus: 1.8, uranus: 2.0, jupiter: 1.5, moon: 1.2, sun: 1.0 },
};

const CONTEXT_KEY_HOUSES: Record<ContextFilter, string[]> = {
  [ContextFilter.LOVE]: ["h7", "h5", "h8"],
  [ContextFilter.SELF]: ["h1", "h5", "h9"],
  [ContextFilter.HEALING]: ["h4", "h8", "h12"],
  [ContextFilter.CAREER]: ["h10", "h6", "h2"],
  [ContextFilter.TIMING]: ["h6", "h3", "h10"],
  [ContextFilter.SOCIAL]: ["h11", "h3", "h7"],
};

const KEY_HOUSE_BONUS = 10;

// Logic Helpers
const getBaseTierScore = (tier: number): number => {
  switch (tier) {
    case 1: return 90; // Sun/Moon
    case 2: return 70; // Personal
    case 3: return 50; // Social
    case 4: return 30; // Outer
    default: return 50;
  }
};

const getAspectMultiplier = (category: AspectCategory): number => {
  switch (category) {
    case AspectCategory.FUSION: return 1.5;
    case AspectCategory.FRICTION: return 1.25;
    case AspectCategory.FLOW: return 1.0;
    default: return 1.0;
  }
};

const getContextMultiplier = (planetId: string, context: ContextFilter): number => {
  const multipliers = CONTEXT_PLANET_MULTIPLIERS[context];
  return multipliers[planetId] || 1.0;
};

const normalizeHouseId = (rawId?: string | null): string | null => {
  if (!rawId) return null;
  const trimmed = String(rawId).trim().toLowerCase();
  if (!trimmed) return null;
  if (/^h\d{1,2}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(/(\d{1,2})/);
  if (!match) return null;
  const num = Number(match[1]);
  if (!Number.isFinite(num) || num < 1 || num > 12) return null;
  return `h${num}`;
};

const calculateAspectWeight = (
  aspect: { planet: Planet; aspect: Aspect },
  primaryPlanet: Planet,
  context: ContextFilter,
  isKeyHouse: boolean
): number => {
  const baseScore = getBaseTierScore(aspect.planet.tier) + (isKeyHouse ? KEY_HOUSE_BONUS : 0);
  const contextMult = getContextMultiplier(aspect.planet.id, context);
  const aspectMult = getAspectMultiplier(aspect.aspect.category);

  let activationBonus = 0;
  if (aspect.planet.tier === 4 && primaryPlanet.tier <= 2) {
    activationBonus = 15;
  }

  return Math.round((baseScore * contextMult * aspectMult) + activationBonus);
};

const getContextInstruction = (context: ContextFilter, lang: Language): string => {
  const isEn = lang === 'en';
  switch (context) {
    case ContextFilter.LOVE:
      return isEn
        ? "CONTEXT: LOVE & RELATIONSHIPS. Focus on compatibility, red flags, attachment styles, and twin-flame dynamics. Emphasis: how you interact in relationships and whether patterns are healthy or toxic."
        : "CONTEXT: LOVE & RELATIONSHIPS. 关注：配对分析 (Compatibility)、红旗预警 (Red Flags)、依恋类型 (Attachment Styles)、双生火焰 (Twin Flame) 动力。分析重点在于：我们在关系中如何互动？是否有毒？";
    case ContextFilter.SELF:
      return isEn
        ? "CONTEXT: SELF & IDENTITY. Focus on authenticity, validation needs, and Big Three energies. Emphasis: core drivers and misunderstood traits."
        : "CONTEXT: SELF & IDENTITY. 关注：我是谁？真实性 (Authenticity)、自我验证 (Validation)、三巨头 (Big Three) 能量。分析重点在于：个性的核心驱动力和被误解的特质。";
    case ContextFilter.HEALING:
      return isEn
        ? "CONTEXT: MENTAL HEALTH & HEALING. Focus on inner child, shadow work, trauma, and self-care. Emphasis: subconscious fears and healing paths."
        : "CONTEXT: MENTAL HEALTH & HEALING. 关注：内在小孩 (Inner Child)、阴影工作 (Shadow Work)、创伤 (Trauma)、自我关怀 (Self-Care)。分析重点在于：潜意识的恐惧和治愈路径。";
    case ContextFilter.CAREER:
      return isEn
        ? "CONTEXT: CAREER & PURPOSE. Focus on soul purpose, vocation, and post-burnout confusion. Emphasis: what you're here to do, not just how to make money."
        : "CONTEXT: CAREER & PURPOSE. 关注：灵魂目标 (Soul Purpose)、天职 (Vocation)、大辞职潮 (Great Resignation) 后的迷茫。分析重点在于：我这辈子是来做什么的？而非单纯怎么赚钱。";
    case ContextFilter.TIMING:
      return isEn
        ? "CONTEXT: TIMING & SURVIVAL. Focus on navigating chaos, retrogrades, and Saturn return. Emphasis: how to handle delays and obstacles and the lesson behind them."
        : "CONTEXT: TIMING & SURVIVAL. 关注：应对混乱 (Cosmic Chaos)、水逆生存指南、土星回归 (Saturn Return)。分析重点在于：如何应对生活中的阻碍和延迟？这背后的功课是什么？";
    case ContextFilter.SOCIAL:
      return isEn
        ? "CONTEXT: FRIENDSHIP & SOCIAL. Focus on tribe, belonging, energy vampires, and boundaries. Emphasis: your role in groups and how to choose real friends."
        : "CONTEXT: FRIENDSHIP & SOCIAL. 关注：部落 (Tribe)、归属感、能量吸血鬼 (Energy Vampires)、界限。分析重点在于：我在群体中的角色以及如何筛选真朋友。";
    default:
      return isEn
        ? "CONTEXT: GENERAL PSYCHOLOGICAL. Focus on psychological dynamics and personality analysis."
        : "CONTEXT: GENERAL PSYCHOLOGICAL. 关注：心理动力与性格分析。";
  }
};

syntheticaRouter.post('/generate', optionalAuthMiddleware, async (req, res) => {
  try {
    const payload = req.body as GeneratePayload;
    const { planet, sign, house, context, aspects } = payload;
    const lang: Language = payload.lang === 'en' || payload.language === 'en' ? 'en' : 'zh';
    const deviceFingerprint = req.headers['x-device-fingerprint'] as string | undefined;

    const access = await entitlementServiceV2.checkAccess(
      req.userId || null,
      'synthetica',
      undefined,
      deviceFingerprint
    );
    if (!access.canAccess) {
      return res.status(403).json({
        error: 'Feature not available',
        needPurchase: access.needPurchase,
        price: access.price,
      });
    }

    if (!planet || !sign) {
      return res.status(400).json({ error: lang === 'en' ? 'Selection is incomplete.' : '选择不完整' });
    }

    // 1. Calculate Weights & Sort Aspects
    const normalizedHouseId = normalizeHouseId(house?.id);
    const isKeyHouse = normalizedHouseId ? CONTEXT_KEY_HOUSES[context]?.includes(normalizedHouseId) : false;
    const sortedAspects = aspects.map(a => ({
      ...a,
      weight: calculateAspectWeight(a, planet, context, isKeyHouse)
    })).sort((a, b) => b.weight - a.weight);

    const weightLabel = lang === 'en' ? 'Weight' : '权重';
    const noAspectsLabel = lang === 'en' ? 'No major aspects' : '无主要相位';
    const topAspectsString = sortedAspects.length > 0
      ? sortedAspects.map(a => `${a.aspect.name} ${a.planet.name} (${weightLabel}: ${a.weight})`).join(", ")
      : noAspectsLabel;

    // 2. Define Context Specific Instructions
    const contextInstruction = getContextInstruction(context, lang);
    const houseLabel = house ? house.name : (lang === 'en' ? 'Not selected' : '未选择');

    // 3. Generate Content
    const result = await generateAIContentWithMeta({
      promptId: 'synthetica-analysis',
      context: {
        context,
        contextInstruction,
        planetName: planet.name,
        signName: sign.name,
        houseName: houseLabel,
        houseArchetype: house ? house.archetype : "",
        topAspectsString
      },
      lang,
      timeoutMs: 60000,
    });

    const consumed = await entitlementServiceV2.consumeFeature(
      req.userId || null,
      'synthetica',
      deviceFingerprint
    );
    if (!consumed) {
      return res.status(403).json({
        error: 'Failed to consume feature',
        needPurchase: true,
        price: PRICING.SYNTHETICA_USE,
      });
    }

    res.json({ ...result.content, meta: result.meta });
  } catch (error) {
    console.error('Synthetica Generation Error:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});
