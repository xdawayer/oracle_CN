/**
 * 日运行运详情子模块导出
 */

export { detailAdviceTransitPrompt } from './advice';
export { detailTimeWindowsTransitPrompt } from './time-windows';
export { detailAspectMatrixTransitPrompt } from './aspect-matrix';
export { detailPlanetsTransitPrompt } from './planets';
export { detailWeeklyTrendTransitPrompt } from './weekly-trend';
export { detailAsteroidsTransitPrompt } from './asteroids';
export { detailRulersTransitPrompt } from './rulers';
export { detailAstroReportTransitPrompt } from './astro-report';
export { detailDimensionTransitPrompt } from './dimension';

import { detailAdviceTransitPrompt } from './advice';
import { detailTimeWindowsTransitPrompt } from './time-windows';
import { detailAspectMatrixTransitPrompt } from './aspect-matrix';
import { detailPlanetsTransitPrompt } from './planets';
import { detailWeeklyTrendTransitPrompt } from './weekly-trend';
import { detailAsteroidsTransitPrompt } from './asteroids';
import { detailRulersTransitPrompt } from './rulers';
import { detailAstroReportTransitPrompt } from './astro-report';
import { detailDimensionTransitPrompt } from './dimension';
import type { PromptTemplate } from '../../../core/types';

/** 日运行运详情 Prompts */
export const transitPrompts: PromptTemplate[] = [
  detailAdviceTransitPrompt,
  detailTimeWindowsTransitPrompt,
  detailAspectMatrixTransitPrompt,
  detailPlanetsTransitPrompt,
  detailWeeklyTrendTransitPrompt,
  detailAsteroidsTransitPrompt,
  detailRulersTransitPrompt,
  detailAstroReportTransitPrompt,
  detailDimensionTransitPrompt,
];
