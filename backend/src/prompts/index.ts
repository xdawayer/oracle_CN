/**
 * Prompt 系统主入口
 *
 * 三层架构：
 * - core/: 核心基础设施（类型、注册表、构建器、缓存）
 * - cultural/: 文化适配层（角色、语气、比喻、场景、心理学）
 * - templates/: Prompt 模板（按功能模块组织）
 * - instructions/: 通用指令（输出格式、安全边界）
 */

// === 核心层 ===
export {
  // 类型
  type PromptMeta,
  type PromptModule,
  type PromptPriority,
  type PromptContext,
  type PromptTemplate,
  type PromptSystem,
  type BuildResult,
  type ChartSummary,
  type ChartData,
  type TransitSummary,
  type TransitAspect,
  type SynastrySignals,
  type RelationshipType,
  type CBTRecord,
  type Message,
  // 注册表
  registry,
  PromptRegistry,
  // 构建器
  buildPrompt,
  buildPrompts,
  getPromptVersion,
  hasPrompt,
  // 缓存
  CACHE_TTL,
  hashInput,
  buildCacheKey,
  getCacheTTL,
  shouldCache,
  // 便捷函数
  registerPrompt,
  getPrompt,
} from './core';

// === 文化适配层 ===
export {
  // 角色
  DEFAULT_PERSONA,
  HEALING_PERSONA,
  ANALYTICAL_PERSONA,
  getPersona,
  // 合盘角色
  SYNASTRY_PERSONA,
  SYNASTRY_LANGUAGE_STYLE,
  getSynastryPersona,
  getSynastryLanguageStyle,
  // 语气
  TONE_GUIDE,
  OUTPUT_RULES,
  FORBIDDEN_WORDS,
  PREFERRED_WORDS,
  getToneGuide,
  getOutputRules,
  // 比喻库
  PLANET_METAPHORS,
  ASPECT_METAPHORS,
  HOUSE_METAPHORS,
  HOUSE_GROUPS,
  getPlanetMetaphor,
  getAspectMetaphor,
  getHouseMetaphor,
  // 合盘相位知识库
  SYNASTRY_ASPECT_KNOWLEDGE,
  getSynastryAspectMeaning,
  getAllSynastryAspectKnowledge,
  isChallenging,
  isPositive,
  // 场景库
  SCENARIOS,
  getRandomScenarios,
  // 心理学
  JUNGIAN_CONCEPTS,
  ATTACHMENT_STYLES,
  COGNITIVE_DISTORTIONS,
  getCognitiveDistortion,
  getAttachmentStyle,
  getJungianConcept,
} from './cultural';

// === 通用指令 ===
export {
  // 输出格式
  JSON_OUTPUT_INSTRUCTION,
  DETAIL_INTERPRETATION_FORMAT,
  DETAIL_OUTPUT_INSTRUCTION,
  SCORE_FIELD_RULES,
  getJsonOutputInstruction,
  getDetailOutputInstruction,
  // 安全边界
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
  // 合盘输出规范
  SYNASTRY_OUTPUT_INSTRUCTION,
  SYNASTRY_SCORE_STANDARD,
  SYNASTRY_LANGUAGE_RULES,
  getSynastryOutputInstruction,
  getSynastryScoreStandard,
  getSynastryLanguageRules,
} from './instructions';

// === 初始化 ===
import { registry } from './core';

// === 流年报告模板 ===
export {
  annualPrompts,
  annualPromptMap,
  ANNUAL_MODULE_PRIORITY,
  ANNUAL_MODULE_IDS,
  ANNUAL_MODULE_META,
  type AnnualModuleId,
  annualOverviewPrompt,
  annualCareerPrompt,
  annualLovePrompt,
  annualHealthPrompt,
  annualSocialPrompt,
  annualGrowthPrompt,
  annualQ1Prompt,
  annualQ2Prompt,
  annualQ3Prompt,
  annualQ4Prompt,
  annualLuckyPrompt,
  ASTRO_2026,
  getSignInfluence2026,
} from './templates/annual';

// === 本命盘模块 ===
export {
  natalPrompts,
  natalOverviewPrompt,
  natalCoreThemesPrompt,
  natalDimensionPrompt,
  detailBig3NatalPrompt,
  detailElementsNatalPrompt,
  detailAspectsNatalPrompt,
  detailPlanetsNatalPrompt,
  detailAsteroidsNatalPrompt,
  detailRulersNatalPrompt,
} from './templates/natal';

// === 日运模块 ===
export {
  dailyPrompts,
  dailyForecastPrompt,
  dailyDetailPrompt,
  dailyHomeCardPrompt,
  transitPrompts,
  detailAdviceTransitPrompt,
  detailTimeWindowsTransitPrompt,
  detailAspectMatrixTransitPrompt,
  detailPlanetsTransitPrompt,
  detailWeeklyTrendTransitPrompt,
  detailAsteroidsTransitPrompt,
  detailRulersTransitPrompt,
  detailAstroReportTransitPrompt,
  detailDimensionTransitPrompt,
} from './templates/daily';

// === 合盘模块 ===
export {
  synastryPrompts,
  synastryOverviewPrompt,
  synastryHighlightsPrompt,
  synastryCoreDynamicsPrompt,
  synastryVibeTagsPrompt,
  synastryGrowthTaskPrompt,
  synastryConflictLoopPrompt,
  synastryNatalAPrompt,
  synastryNatalBPrompt,
  synastryWeatherForecastPrompt,
  synastryActionPlanPrompt,
  synastryPracticeToolsPrompt,
  synastryRelationshipTimingPrompt,
  synastryCompareAbPrompt,
  synastryCompareBaPrompt,
  synastryCompositePrompt,
  synastryComprehensiveReportPrompt,
} from './templates/synastry';

// === CBT 模块 ===
export {
  cbtPrompts,
  cbtAnalysisPrompt,
  cbtAggregateAnalysisPrompt,
  cbtSomaticAnalysisPrompt,
  cbtRootAnalysisPrompt,
  cbtMoodAnalysisPrompt,
  cbtCompetenceAnalysisPrompt,
} from './templates/cbt';

// === Ask 模块 ===
export {
  askPrompts,
  askAnswerPrompt,
} from './templates/ask';

// === Synthetica 模块 ===
export {
  syntheticaPrompts,
  syntheticaAnalysisPrompt,
} from './templates/synthetica';

// === Wiki 模块 ===
export {
  wikiPrompts,
  wikiHomePrompt,
} from './templates/wiki';

// === K线模块 ===
export {
  klinePrompts,
  cycleNamingPrompt,
} from './templates/kline';

// === 配对模块 ===
export {
  pairingPrompts,
  pairingAnalysisPrompt,
} from './templates/pairing';

// === 本命深度解读模块 ===
export {
  natalReportPrompts,
  natalReportPromptMap,
  NATAL_REPORT_MODULE_PRIORITY,
  NATAL_REPORT_MODULE_IDS,
  NATAL_REPORT_MODULE_META,
  type NatalReportModuleId,
  natalReportOverviewPrompt,
  natalReportMindPrompt,
  natalReportEmotionPrompt,
  natalReportLovePrompt,
  natalReportCareerPrompt,
  natalReportWealthPrompt,
  natalReportHealthPrompt,
  natalReportSoulPrompt,
} from './templates/natal-report';

// === 月度运势深度解读模块 ===
export {
  monthlyPrompts,
  monthlyPromptMap,
  MONTHLY_MODULE_PRIORITY,
  MONTHLY_MODULE_IDS,
  MONTHLY_MODULE_META,
  type MonthlyModuleId,
  monthlyTonePrompt,
  monthlyDimensionsPrompt,
  monthlyRhythmPrompt,
  monthlyLunarPrompt,
  monthlyDatesPrompt,
  monthlyActionsPrompt,
} from './templates/monthly';

// === 爱情专题深度报告模块 ===
export {
  loveTopicPrompts,
  loveTopicPromptMap,
  LOVE_TOPIC_MODULE_PRIORITY,
  LOVE_TOPIC_MODULE_IDS,
  LOVE_TOPIC_MODULE_META,
  type LoveTopicModuleId,
  loveTopicPersonalityPrompt,
  loveTopicPartnerPrompt,
  loveTopicGrowthPrompt,
  loveTopicForecastPrompt,
} from './templates/love-topic';

// === 事业专题深度报告模块 ===
export {
  careerTopicPrompts,
  careerTopicPromptMap,
  CAREER_TOPIC_MODULE_PRIORITY,
  CAREER_TOPIC_MODULE_IDS,
  CAREER_TOPIC_MODULE_META,
  type CareerTopicModuleId,
  careerTopicTalentPrompt,
  careerTopicWorkplacePrompt,
  careerTopicMissionPrompt,
  careerTopicForecastPrompt,
} from './templates/career-topic';

// === 财富专题深度报告模块 ===
export {
  wealthTopicPrompts,
  wealthTopicPromptMap,
  WEALTH_TOPIC_MODULE_PRIORITY,
  WEALTH_TOPIC_MODULE_IDS,
  WEALTH_TOPIC_MODULE_META,
  type WealthTopicModuleId,
  wealthTopicMoneyRelationPrompt,
  wealthTopicPotentialPrompt,
  wealthTopicBlindspotPrompt,
  wealthTopicForecastPrompt,
} from './templates/wealth-topic';

// === 模板导入 ===
import { annualPrompts } from './templates/annual';
import { natalPrompts } from './templates/natal';
import { dailyPrompts } from './templates/daily';
import { synastryPrompts } from './templates/synastry';
import { cbtPrompts } from './templates/cbt';
import { askPrompts } from './templates/ask';
import { syntheticaPrompts } from './templates/synthetica';
import { wikiPrompts } from './templates/wiki';
import { klinePrompts } from './templates/kline';
import { pairingPrompts } from './templates/pairing';
import { natalReportPrompts } from './templates/natal-report';
import { monthlyPrompts } from './templates/monthly';
import { loveTopicPrompts } from './templates/love-topic';
import { careerTopicPrompts } from './templates/career-topic';
import { wealthTopicPrompts } from './templates/wealth-topic';

// === 模板加载函数 ===
let templatesLoaded = false;

export function loadAllTemplates(): void {
  if (templatesLoaded) return;

  // 注册所有模块的模板
  registry.registerAll(annualPrompts);
  registry.registerAll(natalPrompts);
  registry.registerAll(natalReportPrompts);
  registry.registerAll(dailyPrompts);
  registry.registerAll(synastryPrompts);
  registry.registerAll(cbtPrompts);
  registry.registerAll(askPrompts);
  registry.registerAll(syntheticaPrompts);
  registry.registerAll(wikiPrompts);
  registry.registerAll(klinePrompts);
  registry.registerAll(pairingPrompts);
  registry.registerAll(monthlyPrompts);
  registry.registerAll(loveTopicPrompts);
  registry.registerAll(careerTopicPrompts);
  registry.registerAll(wealthTopicPrompts);

  const totalCount =
    annualPrompts.length +
    natalPrompts.length +
    natalReportPrompts.length +
    dailyPrompts.length +
    synastryPrompts.length +
    cbtPrompts.length +
    askPrompts.length +
    syntheticaPrompts.length +
    wikiPrompts.length +
    klinePrompts.length +
    pairingPrompts.length +
    monthlyPrompts.length +
    loveTopicPrompts.length +
    careerTopicPrompts.length +
    wealthTopicPrompts.length;

  console.log(`[Prompts] Loaded ${totalCount} prompt templates`);
  templatesLoaded = true;
}

// 自动加载模板
loadAllTemplates();
