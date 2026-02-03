/**
 * Synthetica 实验室模块 Prompt 导出
 */

export { syntheticaAnalysisPrompt } from './analysis';

import { syntheticaAnalysisPrompt } from './analysis';
import type { PromptTemplate } from '../../core/types';

/** Synthetica 模块所有 Prompt */
export const syntheticaPrompts: PromptTemplate[] = [
  syntheticaAnalysisPrompt,
];
