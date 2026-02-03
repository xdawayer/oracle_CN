/**
 * K线模块 Prompt 导出
 */

export { cycleNamingPrompt } from './cycle-naming';

import { cycleNamingPrompt } from './cycle-naming';
import type { PromptTemplate } from '../../core/types';

/** K线模块所有 Prompt */
export const klinePrompts: PromptTemplate[] = [
  cycleNamingPrompt,
];
