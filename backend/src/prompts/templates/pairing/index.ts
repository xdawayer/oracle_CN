/**
 * 配对模块 Prompt 导出
 */

export { pairingAnalysisPrompt } from './analysis';

import { pairingAnalysisPrompt } from './analysis';
import type { PromptTemplate } from '../../core/types';

/** 配对模块所有 Prompt */
export const pairingPrompts: PromptTemplate[] = [
  pairingAnalysisPrompt,
];
