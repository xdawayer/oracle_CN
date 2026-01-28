// INPUT: 后端 API 类型定义（含百科内容、经典分类字段与宫主星飞入星座字段）。
// OUTPUT: 导出 API 请求/响应类型（snake_case schema，含 AI 响应与百科字段）。
// POS: 后端 API 类型定义；若更新此文件，务必更新本头注释与所属文件夹的 FOLDER.md。

// === 基础类型 ===
export type Language = 'zh' | 'en';
export type AccuracyLevel = 'exact' | 'time_unknown' | 'approximate';

// === 单语言内容包装 ===
export interface LocalizedContent<T> {
  lang: Language;
  content: T;
}

export interface AIContentMeta {
  source: 'ai' | 'mock';
  cached?: boolean;
  reason?: 'missing_api_key' | 'prompt_missing' | 'timeout' | 'invalid_json' | 'error';
}

// === 用户输入 ===
export interface BirthInput {
  date: string;      // YYYY-MM-DD
  time?: string;     // HH:mm
  city: string;
  lat?: number;
  lon?: number;
  timezone: string;
  accuracy: AccuracyLevel;
}

// === Real Data 类型（天文计算结果）===
export interface PlanetPosition {
  name: string;
  sign: string;
  house?: number;
  degree: number;
  minute?: number;
  isRetrograde: boolean;
}

export interface Aspect {
  planet1: string;
  planet2: string;
  type: 'conjunction' | 'opposition' | 'square' | 'trine' | 'sextile';
  orb: number;
  isApplying: boolean;
}

export interface NatalChart {
  positions: PlanetPosition[];
  aspects: Aspect[];
  dominance: {
    elements: { fire: number; earth: number; air: number; water: number };
    modalities: { cardinal: number; fixed: number; mutable: number };
  };
  /** Placidus 宫位制的12个宫头黄道经度 (0-360) */
  houseCusps?: number[];
}

export interface TransitData {
  date: string;
  positions: PlanetPosition[];
  aspects: Aspect[];
  moonPhase: string;
}

export interface CycleData {
  id: string;
  planet: string;
  type: string;
  start: string;
  peak: string;
  end: string;
}

export interface SynastryData {
  aspects: Aspect[];
  houseOverlays: Array<{ planet: string; house: number; person: 'A' | 'B' }>;
}

export interface ExtendedNatalData {
  elements: Record<string, Record<string, string[]>>;
  planets: PlanetPosition[];
  asteroids: PlanetPosition[];
  houseRulers: Array<{ house: number; sign: string; ruler: string; fliesTo: number; fliesToSign?: string }>;
  aspects: Aspect[];
}

export interface SynastryOverlay {
  planet: string;
  house: number;
  person: 'A' | 'B';
}

export interface SynastryTechnicalData {
  natal_a: ExtendedNatalData;
  natal_b: ExtendedNatalData;
  composite: ExtendedNatalData;
  syn_ab: { aspects: Aspect[]; houseOverlays: SynastryOverlay[] };
  syn_ba: { aspects: Aspect[]; houseOverlays: SynastryOverlay[] };
}

export interface SynastrySuggestion {
  key: string;
  score: number;
}

export type SynastryTab = 'overview' | 'natal_a' | 'natal_b' | 'syn_ab' | 'syn_ba' | 'composite';

// === AI Data 类型（AI 生成内容）===
// 所有 AI 内容为单语言，结构与前端 snake_case schema 对齐

export interface NatalOverviewAI {
  sun: { title: string; keywords: string[]; description: string };
  moon: { title: string; keywords: string[]; description: string };
  rising: { title: string; keywords: string[]; description: string };
  core_melody: { keywords: string[]; explanations: string[] };
  top_talent: { title: string; example: string; advice: string };
  top_pitfall: { title: string; triggers: string[]; protection: string };
  trigger_card: { auto_reactions: string[]; inner_need: string; buffer_action: string };
  share_text: string;
}

export interface DimensionReportAI {
  dimension_key: string;
  title: string;
  pattern: string;
  root: string;
  when_triggered: string;
  what_helps: string[];
  shadow: string;
  practice: { title: string; steps: string[] };
  prompt_question: string;
  confidence: 'high' | 'med' | 'low';
}

export interface CoreThemesAI {
  drive: { title: string; summary: string; key_points: string[] };
  fear: { title: string; summary: string; key_points: string[] };
  growth: { title: string; summary: string; key_points: string[] };
  confidence: 'high' | 'med' | 'low';
}

export interface DailyEnergyAI {
  score: number;
  feeling: string;
  scenario: string;
  action: string;
}

export interface WeeklyEventAI {
  date: string;
  description: string;
}

export interface DailyForecastAI {
  overall_score: number;
  summary?: string;
  theme_title?: string;
  theme_explanation?: string;
  tags: string[];
  lucky_color: string;
  lucky_number: string;
  lucky_direction: string;
  dimensions: {
    career: number;
    wealth: number;
    love: number;
    health: number;
  };
  advice?: {
    do: { title: string; details: string[] };
    dont: { title: string; details: string[] };
  };
  strategy: {
    best_use: string;
    avoid: string;
  };
  time_windows: {
    morning: string;
    midday: string;
    evening: string;
    morning_mood: string;
    midday_mood: string;
    evening_mood: string;
  };
  time_windows_enhanced?: Array<{
    period: string;
    time: string;
    energy_level: string;
    description: string;
    best_for: string[];
    avoid_for: string[];
  }>;
  weekly_trend?: {
    week_range: string;
    daily_scores: Array<{ date: string; score: number; label: string }>;
    key_dates: Array<{ date: string; label: string; description: string }>;
  };
  weekly_events: WeeklyEventAI[];
  share_text?: string;
}

export interface DailyDetailAI {
  theme_elaborated: string;
  how_it_shows_up: {
    emotions: string;
    relationships: string;
    work: string;
  };
  one_challenge: {
    pattern_name: string;
    description: string;
  };
  one_practice: {
    title: string;
    action: string;
  };
  one_question: string;
  under_the_hood: {
    moon_phase_sign: string;
    key_aspects: string[];
  };
  confidence: 'high' | 'med' | 'low';
}

export interface CycleNamingAI {
  cycle_id: string;
  title: string;
  one_liner: string;
  tags: string[];
  intensity: 'low' | 'med' | 'high';
  dates: { start: string; peak: string; end: string };
  actions: string[];
  prompt_question: string;
}

export interface NatalScriptAI {
  temperament: {
    elements: string;
    modalities: string;
    portrait: string;
    safety_source: string;
    attachment: string;
  };
  core_triangle: {
    sun: string;
    moon: string;
    rising: string;
    summary: string;
  };
  configurations: {
    venus: string;
    mars: string;
    mercury: string;
    houses: {
      h5: string;
      h7: string;
      h8: string;
    };
    challenges: string;
  };
  key_script: {
    love_style: string;
    pattern: string;
    conflict_role: string;
    repair_method: string;
  };
}

export interface SynastryItemAI {
  title: string;
  evidence: string;
  experience: string;
  action: string;
}

export interface SensitivityPointAI {
  mode: string;
  fear: string;
  need: string;
}

export interface InteractionItemAI {
  evidence: string;
  subjective: string;
  reaction: string;
  need: string;
  stage: string;
  advice: string;
  script: string;
}

export interface HouseOverlayAI {
  title: string;
  feeling: string;
  advice: string;
}

export interface ClosingOutputAI {
  nourishing: Array<{ mechanism: string; experience: string; usage: string }>;
  triggers: Array<{ trigger: string; scene: string; reaction: string; misunderstanding: string; mitigation: string }>;
  cycle: {
    trigger: string;
    reaction_self: string;
    reaction_partner: string;
    escalation: string;
    repair_window: string;
    scripts: string[];
  };
}

export interface PerspectiveDataAI {
  summary: string;
  keywords: string[];
  sensitivity_panel: {
    moon: SensitivityPointAI;
    venus: SensitivityPointAI;
    mars: SensitivityPointAI;
    mercury: SensitivityPointAI;
    deep: SensitivityPointAI;
  };
  main_items: InteractionItemAI[];
  overlays: HouseOverlayAI[];
  closing: ClosingOutputAI;
}

export interface PillarDataAI {
  status: string;
  risk: string;
  advice: string;
}

export interface PracticeItemAI {
  title: string;
  content: string;
}

export interface CompositeContentAI {
  temperament: {
    dominant: string;
    mode: string;
    analogy: string;
  };
  core: {
    sun: string;
    moon: string;
    rising: string;
    summary: {
      outer: string;
      inner: string;
      growth: string;
    };
  };
  daily: {
    mercury: string;
    venus: string;
    mars: string;
    maintenance_list: string[];
  };
  karmic: {
    saturn: string;
    pluto: string;
    nodes: string;
    chiron: string;
    conclusion: {
      stuck_point: string;
      growth_point: string;
    };
  };
  synthesis: {
    house_focus: string;
    impact_on_a: string;
    impact_on_b: string;
  };
}

export interface CoreDynamicsItemAI {
  key: string;
  title: string;
  a_needs: string;
  b_needs: string;
  loop: { trigger: string; defense: string; escalation: string };
  repair: { script: string; action: string };
}

export interface RelationshipTimingAI {
  theme_7: string;
  theme_30: string;
  theme_90: string;
  windows: { big_talk: string; repair: string; cool_down: string };
  dominant_theme: string;
  reminder: string;
}

export interface SynastryHighlightsAI {
  harmony: Array<{ aspect: string; experience: string; advice: string }>;
  challenges: Array<{ aspect: string; conflict: string; mitigation: string }>;
  overlays: Array<{ overlay: string; meaning: string }>;
  accuracy_note: string;
}

export interface SynastryOverviewAI {
  overview: {
    keywords: Array<{ word: string; evidence: string }>;
    growth_task: { task: string; evidence: string };
    compatibility_scores: Array<{ dim: string; score: number; desc: string }>;
  };
  conclusion: {
    summary: string;
    disclaimer: string;
  };
}

export type SynastryTabContent = SynastryOverviewAI | NatalScriptAI | PerspectiveDataAI | CompositeContentAI;

// Overview lazy-loaded sections
export type SynastryOverviewSection =
  | 'core_dynamics'
  | 'practice_tools'
  | 'relationship_timing'
  | 'highlights'
  | 'vibe_tags'
  | 'growth_task'
  | 'conflict_loop'
  | 'weather_forecast'
  | 'action_plan';

// NEW: Vibe Tags section
export interface SynastryVibeTagsAI {
  vibe_tags: string[];
  vibe_summary: string;
}

// NEW: Growth Task section (lazy version)
export interface SynastryGrowthTaskAI {
  growth_task: {
    task: string;
    evidence: string;
    action_steps: string[];
  };
  sweet_spots?: Array<{ title: string; evidence: string; experience: string; usage: string }>;
  friction_points?: Array<{ title: string; evidence: string; trigger: string; cost: string }>;
}

// NEW: Conflict Loop section
export interface SynastryConflictLoopAI {
  conflict_loop: {
    trigger: string;
    reaction_a: string;
    defense_b: string;
    result: string;
  };
  repair_scripts: Array<{
    for_person: 'a' | 'b';
    situation: string;
    script: string;
  }>;
}

// NEW: Weather Forecast section
export interface SynastryWeatherForecastAI {
  weekly_pulse: {
    headline: string;
    wave_trend: ('up' | 'down' | 'flat')[];
    days: Array<{
      date: string;
      day_label: string;
      emoji: string;
      energy: 1 | 2 | 3 | 4 | 5;
      vibe: string;
      tip: string;
    }>;
  };
  periods: Array<{
    type: 'high_intensity' | 'sweet_spot' | 'deep_talk';
    start_date: string;
    end_date: string;
    description: string;
    advice: string;
  }>;
  critical_dates: Array<{
    date: string;
    event: string;
    dos: string[];
    donts: string[];
  }>;
}

// NEW: Action Plan section
export interface SynastryActionPlanAI {
  this_week: Array<{
    text: string;
    timing: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  bigger_picture: Array<{
    text: string;
    timeline: string;
    impact: string;
  }>;
  conversation_starters: string[];
}

export interface SynastryCoreDynamicsAI {
  core_dynamics: CoreDynamicsItemAI[];
}

export interface SynastryPracticeToolsAI {
  practice_tools: {
    person_a: PracticeItemAI[];
    person_b: PracticeItemAI[];
    joint: PracticeItemAI[];
  };
}

export interface SynastryRelationshipTimingSectionAI {
  relationship_timing: RelationshipTimingAI;
}

export interface SynastryHighlightsSectionAI {
  highlights: SynastryHighlightsAI;
}

export type SynastryOverviewSectionContent =
  | SynastryCoreDynamicsAI
  | SynastryPracticeToolsAI
  | SynastryRelationshipTimingSectionAI
  | SynastryHighlightsSectionAI
  | SynastryVibeTagsAI
  | SynastryGrowthTaskAI
  | SynastryConflictLoopAI
  | SynastryWeatherForecastAI
  | SynastryActionPlanAI;

export type AskAnswerAI = string;

export interface CBTAnalysisAI {
  cognitive_analysis: {
    distortions: string[];
    summary: string;
  };
  astro_context: {
    aspect: string;
    interpretation: string;
  };
  jungian_insight: {
    archetype_active: string;
    archetype_solution: string;
    insight: string;
  };
  actions: string[];
}

// === API 端点定义 ===

// GET /api/natal/chart
export interface NatalChartRequest {
  birth: BirthInput;
}
export interface NatalChartResponse {
  chart: NatalChart;
}

// GET /api/natal/overview
export interface NatalOverviewRequest {
  birth: BirthInput;
  lang?: Language;
}
export interface NatalOverviewResponse {
  chart: NatalChart;
  lang: Language;
  content: NatalOverviewAI;
}

// GET /api/daily
export interface DailyRequest {
  birth: BirthInput;
  date: string; // YYYY-MM-DD
  lang?: Language;
}
export interface DailyResponse {
  transits: TransitData;
  natal?: NatalChart;
  technical?: {
    transit_planets: PlanetPosition[];
    transit_asteroids: PlanetPosition[];
    house_rulers: ExtendedNatalData['houseRulers'];
    cross_aspects: Aspect[];
  };
  lang: Language;
  content: DailyForecastAI;
}

// POST /api/ask
export interface AskRequest {
  birth: BirthInput;
  question: string;
  category?: string;
  context?: string;
  lang?: Language;
}
export type AskChartType = 'natal' | 'transit';

export interface AskResponse {
  lang: Language;
  content: AskAnswerAI;
  meta?: AIContentMeta;
  chart?: NatalChart;
  transits?: TransitData;
  chartType: AskChartType;
}

// GET /api/synastry
export interface SynastryRequest {
  birthA: BirthInput;
  birthB: BirthInput;
  relationType?: string;
  tab?: SynastryTab;
  lang?: Language;
}
export interface SynastryResponse {
  tab: SynastryTab;
  synastry: SynastryData;
  lang: Language;
  content: SynastryTabContent;
  meta?: AIContentMeta;
  technical?: SynastryTechnicalData;
  suggestions?: SynastrySuggestion[];
  timing?: {
    core_ms: number;
    ai_ms: number;
    total_ms: number;
  };
}

// GET /api/synastry/overview-section
export interface SynastryOverviewSectionResponse {
  section: SynastryOverviewSection;
  lang: Language;
  content: SynastryOverviewSectionContent;
  meta?: AIContentMeta;
  timing?: {
    core_ms: number;
    ai_ms: number;
    total_ms: number;
  };
}

// GET /api/synastry/technical
export interface SynastryTechnicalResponse {
  technical: SynastryTechnicalData;
}

// GET /api/natal/core-themes
export interface NatalCoreThemesResponse {
  chart: NatalChart;
  lang: Language;
  content: CoreThemesAI;
}

// GET /api/natal/dimension
export interface NatalDimensionResponse {
  chart: NatalChart;
  lang: Language;
  content: DimensionReportAI;
}

// GET /api/daily/detail
export interface DailyDetailResponse {
  transits: TransitData;
  lang: Language;
  content: DailyDetailAI;
}

// GET /api/cycle/list
export interface CycleListResponse {
  cycles: CycleData[];
}

// GET /api/cycle/naming
export interface CycleNamingResponse {
  lang: Language;
  content: CycleNamingAI;
}

// POST /api/cbt/analysis
export interface CBTAnalysisResponse {
  lang: Language;
  content: CBTAnalysisAI;
}

// === Wiki 内容类型 ===
export type WikiItemType = 'planets' | 'signs' | 'houses' | 'aspects' | 'concepts' | 'chart-types' | 'asteroids' | 'angles' | 'points';

export interface WikiDeepDiveStep {
  step: number;
  title: string;
  description: string;
}

export interface WikiLifeArea {
  area: 'career' | 'love' | 'health' | 'finance' | 'family' | 'spiritual';
  description: string;
}

export interface WikiItem {
  id: string;
  type: WikiItemType;
  title: string;
  subtitle?: string;
  symbol: string;
  keywords: string[];
  prototype: string;
  analogy: string;
  description: string;
  astronomy_myth: string;
  psychology: string;
  shadow: string;
  integration?: string;
  combinations?: string;
  color_token?: string;
  image_url?: string;
  deep_dive?: WikiDeepDiveStep[];
  related_ids?: string[];
  life_areas?: WikiLifeArea[];
  growth_path?: string;
  practical_tips?: string[];
  common_misconceptions?: string[];
  affirmation?: string;
}

export interface WikiItemSummary {
  id: string;
  type: WikiItemType;
  title: string;
  subtitle?: string;
  symbol: string;
  keywords: string[];
  description: string;
  color_token?: string;
}

export interface WikiClassicSummary {
  id: string;
  title: string;
  author: string;
  summary?: string;
  cover_url?: string | null;
  keywords?: string[];
  category?: string;
}

// Classic seed data for wiki classics (without lang/content)
export interface ClassicSeed {
  id: string;
  title: string;
  author: string;
  summary: string;
  cover_url: string | null;
  keywords: string[];
  stage: string;
  category?: string;
}

// 结构化的书籍拆解内容
export interface WikiClassicSections {
  context: {
    title: string;
    position: string;
    author_background: string;
    contribution: string;
  };
  philosophy: {
    title: string;
    core_logic: string;
    metaphor: string;
  };
  structure: {
    title: string;
    logic_flow: string;
    modules: Array<{ name: string; content: string }>;
    highlights: Array<{ topic: string; insight: string }>;
  };
  methodology: {
    title: string;
    steps: string[];
  };
  quotes: {
    title: string;
    items: Array<{ quote: string; interpretation: string }>;
  };
  criticism: {
    title: string;
    limitations: string;
    misconceptions: string;
    debates: string;
  };
  action: {
    title: string;
    phases: Array<{ phase: string; task: string }>;
    immediate_action: string;
  };
}

export interface WikiClassicDetail extends WikiClassicSummary {
  content?: string;
  enhanced?: boolean;
  sections?: WikiClassicSections;
  lang: Language;
}

export interface WikiClassicsResponse {
  lang: Language;
  items: WikiClassicSummary[];
}

export interface WikiClassicResponse {
  lang: Language;
  item: WikiClassicDetail;
}

export interface WikiPillar {
  id: WikiItemType;
  label: string;
  desc: string;
  icon: string;
}

export interface WikiDailyTransitGuidance {
  title: string;
  text: string;
}

export interface WikiDailyTransit {
  date: string;
  highlight: string;
  title: string;
  summary: string;
  energy_level: number;
  guidance: WikiDailyTransitGuidance[];
}

export interface WikiDailyWisdom {
  quote: string;
  author: string;
  source: string;
  interpretation: string;
}

export interface WikiTrendTag {
  label: string;
  item_id: string;
}

export interface WikiHomeContent {
  pillars: WikiPillar[];
  daily_transit: WikiDailyTransit;
  daily_wisdom: WikiDailyWisdom;
  trending_tags: WikiTrendTag[];
}

export interface WikiHomeResponse {
  lang: Language;
  content: WikiHomeContent;
}

export interface WikiItemsResponse {
  lang: Language;
  items: WikiItemSummary[];
}

export interface WikiItemResponse {
  lang: Language;
  item: WikiItem;
}

export interface WikiSearchMatch {
  concept: string;
  type: string;
  reason: string;
  linked_id: string;
}

export interface WikiSearchResponse {
  lang: Language;
  matches: WikiSearchMatch[];
}
