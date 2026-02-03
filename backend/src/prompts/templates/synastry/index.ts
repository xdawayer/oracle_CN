/**
 * 合盘模块 Prompt 导出
 */

export { synastryOverviewPrompt } from './overview';
export { synastryHighlightsPrompt } from './highlights';
export { synastryCoreDynamicsPrompt } from './core-dynamics';
export { synastryVibeTagsPrompt } from './vibe-tags';
export { synastryGrowthTaskPrompt } from './growth-task';
export { synastryConflictLoopPrompt } from './conflict-loop';
export { synastryNatalAPrompt } from './natal-a';
export { synastryNatalBPrompt } from './natal-b';
export { synastryWeatherForecastPrompt } from './weather-forecast';
export { synastryActionPlanPrompt } from './action-plan';
export { synastryPracticeToolsPrompt } from './practice-tools';
export { synastryRelationshipTimingPrompt } from './relationship-timing';
export { synastryCompareAbPrompt } from './compare-ab';
export { synastryCompareBaPrompt } from './compare-ba';
export { synastryCompositePrompt } from './composite';
export { synastryComprehensiveReportPrompt } from './comprehensive-report';
export { detailDeepSynastryPrompt } from './detail-deep';

import { synastryOverviewPrompt } from './overview';
import { synastryHighlightsPrompt } from './highlights';
import { synastryCoreDynamicsPrompt } from './core-dynamics';
import { synastryVibeTagsPrompt } from './vibe-tags';
import { synastryGrowthTaskPrompt } from './growth-task';
import { synastryConflictLoopPrompt } from './conflict-loop';
import { synastryNatalAPrompt } from './natal-a';
import { synastryNatalBPrompt } from './natal-b';
import { synastryWeatherForecastPrompt } from './weather-forecast';
import { synastryActionPlanPrompt } from './action-plan';
import { synastryPracticeToolsPrompt } from './practice-tools';
import { synastryRelationshipTimingPrompt } from './relationship-timing';
import { synastryCompareAbPrompt } from './compare-ab';
import { synastryCompareBaPrompt } from './compare-ba';
import { synastryCompositePrompt } from './composite';
import { synastryComprehensiveReportPrompt } from './comprehensive-report';
import { detailDeepSynastryPrompt } from './detail-deep';
import type { PromptTemplate } from '../../core/types';

/** 合盘模块所有 Prompt */
export const synastryPrompts: PromptTemplate[] = [
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
  detailDeepSynastryPrompt,
];
