/**
 * 通用指令
 *
 * 提供输出格式、安全边界、分享文案和追问引导指令
 */

// === 输出格式 ===
export {
  JSON_OUTPUT_INSTRUCTION,
  DETAIL_INTERPRETATION_FORMAT,
  DETAIL_OUTPUT_INSTRUCTION,
  SCORE_FIELD_RULES,
  FIELD_NAMING_RULES,
  getJsonOutputInstruction,
  getDetailOutputInstruction,
} from './output-format';

// === 安全边界 ===
export {
  SAFETY_BOUNDARIES,
  HEALTH_DISCLAIMER,
  FINANCIAL_DISCLAIMER,
  CRISIS_RESOURCES,
  CBT_SAFETY,
  SYNASTRY_SAFETY,
  getSafetyBoundaries,
  getCbtSafety,
  getSynastrySafety,
  getCrisisResources,
} from './safety';

// === 分享文案指南 ===
export {
  SHARE_TEXT_GUIDE,
  SHARE_STYLE_BY_MODULE,
  SHARE_FORBIDDEN,
  getShareStyleHint,
} from './share-guide';

// === 追问引导规范 ===
export {
  FOLLOWUP_GUIDE,
  FOLLOWUP_STYLE_BY_MODULE,
  FOLLOWUP_QUALITY_RULES,
  getFollowupStyleHint,
} from './followup-guide';

// === 合盘输出规范 ===
export {
  SYNASTRY_OUTPUT_INSTRUCTION,
  SYNASTRY_SCORE_STANDARD,
  SYNASTRY_WORD_COUNT,
  SYNASTRY_LANGUAGE_RULES,
  NATAL_DIMENSION_WORD_COUNT,
  SYNASTRY_DIMENSION_WORD_COUNT,
  COMPOSITE_DIMENSION_WORD_COUNT,
  getSynastryOutputInstruction,
  getSynastryScoreStandard,
  getSynastryLanguageRules,
} from './synastry-output';
