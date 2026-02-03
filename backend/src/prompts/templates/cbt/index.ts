/**
 * CBT 模块 Prompt 导出
 */

export { cbtAnalysisPrompt } from './analysis';
export { cbtAggregateAnalysisPrompt } from './aggregate-analysis';
export { cbtSomaticAnalysisPrompt } from './somatic-analysis';
export { cbtRootAnalysisPrompt } from './root-analysis';
export { cbtMoodAnalysisPrompt } from './mood-analysis';
export { cbtCompetenceAnalysisPrompt } from './competence-analysis';

import { cbtAnalysisPrompt } from './analysis';
import { cbtAggregateAnalysisPrompt } from './aggregate-analysis';
import { cbtSomaticAnalysisPrompt } from './somatic-analysis';
import { cbtRootAnalysisPrompt } from './root-analysis';
import { cbtMoodAnalysisPrompt } from './mood-analysis';
import { cbtCompetenceAnalysisPrompt } from './competence-analysis';
import type { PromptTemplate } from '../../core/types';

/** CBT 模块所有 Prompt */
export const cbtPrompts: PromptTemplate[] = [
  cbtAnalysisPrompt,
  cbtAggregateAnalysisPrompt,
  cbtSomaticAnalysisPrompt,
  cbtRootAnalysisPrompt,
  cbtMoodAnalysisPrompt,
  cbtCompetenceAnalysisPrompt,
];
