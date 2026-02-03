/**
 * 文化适配层
 *
 * 提供本土化的角色、语气、比喻、场景和心理学概念
 */

import type { CulturalConfig } from '../core/types';

// === 角色设定 ===
export {
  DEFAULT_PERSONA,
  HEALING_PERSONA,
  ANALYTICAL_PERSONA,
  getPersona,
} from './persona';

// === 合盘角色设定 ===
export {
  SYNASTRY_PERSONA,
  SYNASTRY_LANGUAGE_STYLE,
  getSynastryPersona,
  getSynastryLanguageStyle,
} from './synastry-persona';

// === 语气指南 ===
export {
  TONE_GUIDE,
  OUTPUT_RULES,
  FORBIDDEN_WORDS,
  PREFERRED_WORDS,
  getToneGuide,
  getOutputRules,
} from './tone';

// === 比喻库 ===
export {
  // 行星
  PLANET_METAPHORS,
  getPlanetMetaphor,
  getAllPlanetMetaphors,
  // 相位
  ASPECT_METAPHORS,
  getAspectMetaphor,
  getAllAspectMetaphors,
  getAspectNature,
  // 宫位
  HOUSE_METAPHORS,
  HOUSE_GROUPS,
  getHouseMetaphor,
  getAllHouseMetaphors,
  // 合盘相位
  SYNASTRY_ASPECT_KNOWLEDGE,
  getSynastryAspectMeaning,
  getAllSynastryAspectKnowledge,
  isChallenging,
  isPositive,
  type SynastryAspectMeaning,
  type PlanetPairAspects,
} from './metaphors';

// === 场景库 ===
export {
  SCENARIOS,
  getRandomScenarios,
  getScenarioCategories,
  getScenarioSubcategories,
  matchScenarios,
  getScenarioExamples,
} from './scenarios';

// === 年轻化表达 ===
export {
  EXPRESSION_MAP,
  getExpressionExamples,
  getCompactExpressionGuide,
} from './expressions';

// === 心理学概念 ===
export {
  JUNGIAN_CONCEPTS,
  ATTACHMENT_STYLES,
  COGNITIVE_DISTORTIONS,
  PSYCHOLOGY_MAPPING,
  getCognitiveDistortion,
  getAttachmentStyle,
  getJungianConcept,
} from './psychology';

// === 导入具体内容 ===
import { DEFAULT_PERSONA, HEALING_PERSONA, ANALYTICAL_PERSONA } from './persona';
import { TONE_GUIDE, OUTPUT_RULES } from './tone';
import { PLANET_METAPHORS, ASPECT_METAPHORS, HOUSE_METAPHORS } from './metaphors';
import { SCENARIOS } from './scenarios';
import { PSYCHOLOGY_MAPPING } from './psychology';

/**
 * 获取完整的文化配置
 *
 * 用于注入到 Prompt 构建器
 */
export function getCulturalConfig(): CulturalConfig {
  return {
    persona: {
      default: DEFAULT_PERSONA,
      healing: HEALING_PERSONA,
      analytical: ANALYTICAL_PERSONA,
    },
    tone: {
      guide: TONE_GUIDE,
      outputRules: OUTPUT_RULES,
    },
    metaphors: {
      planets: PLANET_METAPHORS,
      aspects: ASPECT_METAPHORS,
      houses: HOUSE_METAPHORS,
    },
    scenarios: SCENARIOS,
    psychology: PSYCHOLOGY_MAPPING,
  };
}

// === 五行映射 ===
export {
  PLANET_WUXING,
  SIGN_WUXING,
  calculateWuxingBalance,
  getWuxingMapping,
  getCompactWuxingSummary,
  type WuxingElement,
} from './wuxing';

// === 节气语境 ===
export {
  JIEQI_DATA,
  getSeasonalContext,
  getSeasonalMood,
} from './seasonal';

// === 生肖桥接 ===
export {
  getChineseZodiac,
  getZodiacBridge,
  getCompactZodiacInfo,
  type ChineseZodiac,
} from './zodiac-bridge';

// 导出类型
export type { CulturalConfig } from '../core/types';
