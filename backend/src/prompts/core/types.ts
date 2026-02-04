/**
 * Prompt 核心类型定义
 *
 * 注意：本系统仅支持简体中文，无多语言切换
 */

// === Prompt 元数据 ===

/** Prompt 所属模块 */
export type PromptModule =
  | 'natal'         // 本命盘
  | 'daily'         // 日运
  | 'synastry'      // 合盘
  | 'cbt'           // CBT 情绪
  | 'ask'           // 问答
  | 'synthetica'    // 实验室
  | 'kline'         // K线
  | 'wiki'          // 百科
  | 'annual'        // 流年运势
  | 'natal-report'  // 本命深度解读
  | 'monthly'       // 月度运势深度解读
  | 'love-topic'    // 爱情专题深度报告
  | 'career-topic'  // 事业专题深度报告
  | 'wealth-topic'; // 财富专题深度报告

/** Prompt 优先级 */
export type PromptPriority = 'P0' | 'P1' | 'P2';

/** Prompt 元数据 */
export interface PromptMeta {
  /** 唯一标识，如 'natal-overview' */
  id: string;
  /** 版本号，如 '1.0' */
  version: string;
  /** 所属模块 */
  module: PromptModule;
  /** 优先级：P0 核心 / P1 重要 / P2 增强 */
  priority: PromptPriority;
  /** 用途描述 */
  description: string;
  /** 最后更新日期，如 '2026-01-29' */
  lastUpdated: string;
}

// === Prompt 上下文 ===

/** 星盘摘要（紧凑版） */
export interface ChartSummary {
  sun: { sign: string; house: number };
  moon: { sign: string; house: number };
  rising: string;
  planets: Array<{ name: string; sign: string; house: number }>;
  aspects: Array<{ planet1: string; aspect: string; planet2: string; orb: number }>;
  elements: { fire: number; earth: number; air: number; water: number };
  [key: string]: unknown;
}

/** 行运摘要 */
export interface TransitSummary {
  date: string;
  moon_phase: string;
  major_aspects: Array<{ transit: string; natal: string; aspect: string }>;
  [key: string]: unknown;
}

/** 行运相位 */
export interface TransitAspect {
  transit: string;
  natal: string;
  aspect: string;
  orb: number;
  [key: string]: unknown;
}

/** 特殊星象事件 */
export interface SpecialEvents {
  [key: string]: unknown;
}

/** 合盘信号 */
export interface SynastrySignals {
  harmony: Array<{ aspect: string; description: string }>;
  challenge: Array<{ aspect: string; description: string }>;
  overlays: Array<{ planet: string; house: number; person: 'A' | 'B' }>;
  [key: string]: unknown;
}

/** 关系类型 */
export type RelationshipType =
  | 'romantic'   // 恋人
  | 'married'    // 夫妻
  | 'friend'     // 朋友
  | 'family'     // 家人
  | 'colleague'  // 同事
  | 'business';  // 合作伙伴

/** CBT 记录 */
export interface CBTRecord {
  situation: string;
  moods: Array<{ name: string; intensity: number }>;
  automaticThoughts: string[];
  hotThought: string;
  evidenceFor: string[];
  evidenceAgainst: string[];
  balancedEntries: string[];
  [key: string]: unknown;
}

/** 周期统计 */
export interface PeriodStats {
  period: string;
  [key: string]: unknown;
}

/** 对话消息 */
export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

/** Synthetica 配置 */
export interface SyntheticaConfig {
  planet?: string;
  sign?: string;
  house?: number;
  aspects?: string[];
  consultGoal?: 'LOVE' | 'SELF' | 'HEALING' | 'CAREER' | 'TIMING' | 'SOCIAL';
  [key: string]: unknown;
}

/** 完整星盘数据 */
export interface ChartData {
  [key: string]: unknown;
}

/** Prompt 上下文（通用字段） */
export interface PromptContext {
  // 本命盘
  chart_summary?: ChartSummary;
  chartData?: ChartData;

  // 行运
  transit_summary?: TransitSummary;
  transit_aspects?: TransitAspect[];
  special_events?: SpecialEvents;
  date?: string;

  // 合盘
  chartA?: ChartData;
  chartB?: ChartData;
  chartA_summary?: ChartSummary;
  chartB_summary?: ChartSummary;
  synastry?: unknown;
  synastry_signals?: SynastrySignals;
  relationship_type?: RelationshipType;
  nameA?: string;
  nameB?: string;
  birth_accuracy?: { nameA?: string; nameB?: string };
  comparison?: unknown;
  composite?: unknown;

  // CBT
  cbt_record?: CBTRecord;
  period_stats?: PeriodStats;

  // 问答
  question?: string;
  category?: 'personality' | 'time_cycles' | 'guidance';
  conversation_history?: Message[];

  // 实验室
  synthetica_config?: SyntheticaConfig;

  // K线
  planet?: string;
  cycleType?: string;
  dates?: { start: string; end: string };

  // 通用
  dimension?: string;

  // 用户年龄信息（由 API 路由自动注入）
  userAge?: number;
  userAgeGroup?: 'toddler' | 'child' | 'teen' | 'adult';
  userBirthDate?: string;

  // 合盘场景双方年龄
  ageA?: number;
  ageB?: number;
  ageGroupA?: 'toddler' | 'child' | 'teen' | 'adult';
  ageGroupB?: 'toddler' | 'child' | 'teen' | 'adult';

  // 预留字段（Phase 2+）
  /** 星盘种子摘要，用于个性化注入 */
  _seedSummary?: string;
  /** 用户画像标签，用于语气/内容微调 */
  _userPortrait?: string;

  // 扩展字段
  [key: string]: unknown;
}

/** 文化配置 */
export interface CulturalConfig {
  persona: {
    default: string;
    healing: string;
    analytical: string;
  };
  tone: {
    guide: string;
    outputRules: string;
  };
  metaphors: {
    planets: Record<string, PlanetMetaphor>;
    aspects: Record<string, AspectMetaphor>;
    houses: Record<number, HouseMetaphor>;
  };
  scenarios: Record<string, Record<string, string[]>>;
  psychology: Record<string, Record<string, unknown>>;
}

/** 行星比喻 */
export interface PlanetMetaphor {
  name: string;
  zhCN: string;
  description: string;
  metaphor: string;
  questions: string[];
}

/** 相位比喻 */
export interface AspectMetaphor {
  name: string;
  symbol: string;
  zhCN: string;
  feeling: string;
  nature: 'neutral' | 'harmonious' | 'challenging';
}

/** 宫位比喻 */
export interface HouseMetaphor {
  name: string;
  zhCN: string;
  description: string;
}

// === Prompt 模板 ===

/** System prompt 可以是字符串或动态生成函数 */
export type PromptSystem = string | ((ctx: PromptContext) => string);

/** Prompt 模板 */
export interface PromptTemplate {
  meta: PromptMeta;
  /** System prompt（可静态或动态） */
  system: PromptSystem;
  /** User prompt 生成函数 */
  user: (ctx: PromptContext) => string;
}

// === 构建结果 ===

/** Prompt 构建结果 */
export interface BuildResult {
  /** 构建后的 system prompt */
  system: string;
  /** 构建后的 user prompt */
  user: string;
  /** 缓存 key */
  cacheKey: string;
}
