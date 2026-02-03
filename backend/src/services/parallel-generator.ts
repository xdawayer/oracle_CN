/**
 * 并行 AI 内容生成服务
 *
 * 支持多个 prompt 同时调用，通过种子摘要保证一致性
 */

import { generateAIContentWithMeta } from './ai.js';
import type { AIContentMeta, LocalizedContent, Language } from '../types/api.js';

/** 单个 prompt 的并行生成结果 */
export interface ParallelResult<T = unknown> {
  promptId: string;
  success: boolean;
  content?: LocalizedContent<T>;
  meta?: AIContentMeta;
  error?: string;
}

/** 并行生成选项 */
export interface ParallelGenerateOptions {
  /** 要并行生成的 prompt ID 列表 */
  promptIds: string[];
  /** 共享上下文（所有 prompt 共用，当 contextMap 中无对应条目时使用） */
  sharedContext: Record<string, unknown>;
  /** 每个 prompt 的独立上下文（优先级高于 sharedContext） */
  contextMap?: Record<string, Record<string, unknown>>;
  /** 种子摘要（注入到每个 prompt 的上下文中，保证一致性） */
  seedSummary?: string;
  /** 语言 */
  lang?: Language;
  /** 单个 prompt 的超时（毫秒），默认 120000 */
  timeoutMs?: number;
  /** 各 prompt 的 maxTokens 覆盖 */
  maxTokensMap?: Record<string, number>;
}

/** 并行生成结果集 */
export interface ParallelGenerateResult<T = unknown> {
  /** 按 promptId 索引的结果 */
  results: Map<string, ParallelResult<T>>;
  /** 成功数量 */
  successCount: number;
  /** 失败数量 */
  failCount: number;
  /** 总耗时（毫秒） */
  totalMs: number;
}

/**
 * 并行生成多个 AI 内容
 *
 * 特点:
 * - 所有 prompt 并行调用，总耗时 ≈ 最慢的单次调用
 * - 支持种子摘要注入保证内容一致性
 * - 单个 prompt 失败不影响其他
 * - 超时控制：整体超时 = 单次超时（不叠加）
 */
export async function generateParallel<T = unknown>(
  options: ParallelGenerateOptions
): Promise<ParallelGenerateResult<T>> {
  const {
    promptIds,
    sharedContext,
    contextMap,
    seedSummary,
    lang,
    timeoutMs,
    maxTokensMap,
  } = options;

  const startTime = performance.now();

  // 并行调用所有 prompt
  const promises = promptIds.map(async (promptId): Promise<ParallelResult<T>> => {
    try {
      // 优先使用 contextMap 中的独立上下文，否则使用 sharedContext
      const baseContext = contextMap?.[promptId] ?? sharedContext;
      // 注入种子摘要
      const context = seedSummary
        ? { ...baseContext, _seedSummary: seedSummary }
        : baseContext;

      const result = await generateAIContentWithMeta<T>({
        promptId,
        context,
        lang,
        timeoutMs,
        maxTokens: maxTokensMap?.[promptId],
      });

      return {
        promptId,
        success: true,
        content: result.content,
        meta: result.meta,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`[ParallelGenerator] Failed for ${promptId}: ${errorMsg}`);
      return {
        promptId,
        success: false,
        error: errorMsg,
      };
    }
  });

  const settled = await Promise.all(promises);

  // 构建结果 Map
  const results = new Map<string, ParallelResult<T>>();
  let successCount = 0;
  let failCount = 0;

  for (const result of settled) {
    results.set(result.promptId, result);
    if (result.success) successCount++;
    else failCount++;
  }

  const totalMs = performance.now() - startTime;

  console.log(
    `[ParallelGenerator] ${promptIds.length} prompts: ${successCount} ok, ${failCount} failed, ${totalMs.toFixed(0)}ms`
  );

  return { results, successCount, failCount, totalMs };
}

/**
 * 从并行结果中提取成功的内容
 *
 * 便捷函数，将 Map<string, ParallelResult<T>> 转为 Record<string, T>
 */
export function extractSuccessContent<T>(
  results: Map<string, ParallelResult<T>>
): Record<string, T> {
  const output: Record<string, T> = {};
  for (const [promptId, result] of results) {
    if (result.success && result.content) {
      output[promptId] = result.content.content as T;
    }
  }
  return output;
}
