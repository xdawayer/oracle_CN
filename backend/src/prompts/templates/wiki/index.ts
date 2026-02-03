/**
 * 百科模块 Prompt 导出
 */

export { wikiHomePrompt } from './home';

import { wikiHomePrompt } from './home';
import type { PromptTemplate } from '../../core/types';

/** 百科模块所有 Prompt */
export const wikiPrompts: PromptTemplate[] = [
  wikiHomePrompt,
];
