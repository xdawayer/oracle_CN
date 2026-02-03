/**
 * 本命盘模块 Prompt 导出
 */

export { natalOverviewPrompt } from './overview';
export { natalCoreThemesPrompt } from './core-themes';
export { natalDimensionPrompt } from './dimension';
export { detailBig3NatalPrompt } from './detail/big3';
export { detailElementsNatalPrompt } from './detail/elements';
export { detailAspectsNatalPrompt } from './detail/aspects';
export { detailPlanetsNatalPrompt } from './detail/planets';
export { detailAsteroidsNatalPrompt } from './detail/asteroids';
export { detailRulersNatalPrompt } from './detail/rulers';
export { detailDimensionNatalPrompt } from './detail/dimension';
export { detailDeepNatalPrompt } from './detail/deep';

import { natalOverviewPrompt } from './overview';
import { natalCoreThemesPrompt } from './core-themes';
import { natalDimensionPrompt } from './dimension';
import { detailBig3NatalPrompt } from './detail/big3';
import { detailElementsNatalPrompt } from './detail/elements';
import { detailAspectsNatalPrompt } from './detail/aspects';
import { detailPlanetsNatalPrompt } from './detail/planets';
import { detailAsteroidsNatalPrompt } from './detail/asteroids';
import { detailRulersNatalPrompt } from './detail/rulers';
import { detailDimensionNatalPrompt } from './detail/dimension';
import { detailDeepNatalPrompt } from './detail/deep';
import type { PromptTemplate } from '../../core/types';

/** 本命盘模块所有 Prompt */
export const natalPrompts: PromptTemplate[] = [
  natalOverviewPrompt,
  natalCoreThemesPrompt,
  natalDimensionPrompt,
  detailBig3NatalPrompt,
  detailElementsNatalPrompt,
  detailAspectsNatalPrompt,
  detailPlanetsNatalPrompt,
  detailAsteroidsNatalPrompt,
  detailRulersNatalPrompt,
  detailDimensionNatalPrompt,
  detailDeepNatalPrompt,
];
