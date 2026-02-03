/**
 * K线模块 Prompt 导出
 */

export { cycleNamingPrompt } from './cycle-naming';
export { klineYearCorePrompt } from './year-core';
export { klineYearDimensionsPrompt } from './year-dimensions';
export { klineYearTacticalPrompt } from './year-tactical';
export { klineLifeScrollPrompt } from './life-scroll';

import { cycleNamingPrompt } from './cycle-naming';
import { klineYearCorePrompt } from './year-core';
import { klineYearDimensionsPrompt } from './year-dimensions';
import { klineYearTacticalPrompt } from './year-tactical';
import { klineLifeScrollPrompt } from './life-scroll';
import type { PromptTemplate } from '../../core/types';

/** K线模块所有 Prompt */
export const klinePrompts: PromptTemplate[] = [
  cycleNamingPrompt,
  klineYearCorePrompt,
  klineYearDimensionsPrompt,
  klineYearTacticalPrompt,
  klineLifeScrollPrompt,
];
