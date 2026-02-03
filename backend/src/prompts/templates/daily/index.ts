/**
 * 日运模块 Prompt 导出
 */

export { dailyForecastPrompt } from './forecast';
export { dailyDetailPrompt } from './detail';
export { dailyHomeCardPrompt } from './home-card';
export { detailAdviceTransitPrompt } from './transit/advice';
export { detailTimeWindowsTransitPrompt } from './transit/time-windows';
export { detailAspectMatrixTransitPrompt } from './transit/aspect-matrix';
export { detailPlanetsTransitPrompt } from './transit/planets';
export { detailWeeklyTrendTransitPrompt } from './transit/weekly-trend';
export { transitPrompts } from './transit';
export { detailAsteroidsTransitPrompt } from './transit/asteroids';
export { detailRulersTransitPrompt } from './transit/rulers';
export { detailAstroReportTransitPrompt } from './transit/astro-report';
export { detailDimensionTransitPrompt } from './transit/dimension';

import { dailyForecastPrompt } from './forecast';
import { dailyDetailPrompt } from './detail';
import { dailyHomeCardPrompt } from './home-card';
import { transitPrompts } from './transit';
import type { PromptTemplate } from '../../core/types';

/** 日运模块所有 Prompt */
export const dailyPrompts: PromptTemplate[] = [
  dailyForecastPrompt,
  dailyDetailPrompt,
  dailyHomeCardPrompt,
  ...transitPrompts,
];
