/**
 * 问答模块 Prompt 导出
 */

export { askAnswerPrompt } from './answer';

import { askAnswerPrompt } from './answer';
import type { PromptTemplate } from '../../core/types';

/** 问答模块所有 Prompt */
export const askPrompts: PromptTemplate[] = [
  askAnswerPrompt,
];
