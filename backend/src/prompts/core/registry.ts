/**
 * Prompt 注册表
 *
 * 单例模式，管理所有 Prompt 模板的注册、查询和版本控制
 */

import type { PromptTemplate, PromptModule, PromptPriority } from './types';

class PromptRegistry {
  private prompts = new Map<string, PromptTemplate>();

  /**
   * 注册 Prompt 模板
   * @param template Prompt 模板
   */
  register(template: PromptTemplate): void {
    const { id } = template.meta;
    if (this.prompts.has(id)) {
      console.warn(`[PromptRegistry] Overwriting existing prompt: ${id}`);
    }
    this.prompts.set(id, template);
  }

  /**
   * 批量注册 Prompt 模板
   * @param templates Prompt 模板数组
   */
  registerAll(templates: PromptTemplate[]): void {
    for (const template of templates) {
      this.register(template);
    }
  }

  /**
   * 获取 Prompt 模板
   * @param id Prompt ID
   * @returns Prompt 模板，未找到返回 undefined
   */
  get(id: string): PromptTemplate | undefined {
    return this.prompts.get(id);
  }

  /**
   * 检查 Prompt 是否存在
   * @param id Prompt ID
   */
  has(id: string): boolean {
    return this.prompts.has(id);
  }

  /**
   * 获取 Prompt 版本号
   * @param id Prompt ID
   * @returns 版本号，未找到返回 '0'
   */
  getVersion(id: string): string {
    return this.prompts.get(id)?.meta.version ?? '0';
  }

  /**
   * 构建缓存 Key
   *
   * 格式：ai:{promptId}:v{version}:{inputHash}
   *
   * @param promptId Prompt ID
   * @param inputHash 输入内容的哈希值
   * @returns 缓存 key
   */
  buildCacheKey(promptId: string, inputHash: string): string {
    const version = this.getVersion(promptId);
    return `ai:${promptId}:v${version}:${inputHash}`;
  }

  /**
   * 按模块列出 Prompt
   * @param module 模块名
   * @returns 该模块下的所有 Prompt
   */
  listByModule(module: PromptModule): PromptTemplate[] {
    return Array.from(this.prompts.values())
      .filter(p => p.meta.module === module);
  }

  /**
   * 按优先级列出 Prompt
   * @param priority 优先级
   * @returns 该优先级的所有 Prompt
   */
  listByPriority(priority: PromptPriority): PromptTemplate[] {
    return Array.from(this.prompts.values())
      .filter(p => p.meta.priority === priority);
  }

  /**
   * 列出所有 Prompt
   * @returns 所有已注册的 Prompt
   */
  listAll(): PromptTemplate[] {
    return Array.from(this.prompts.values());
  }

  /**
   * 获取所有 Prompt ID
   * @returns Prompt ID 数组
   */
  getAllIds(): string[] {
    return Array.from(this.prompts.keys());
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    total: number;
    byModule: Record<string, number>;
    byPriority: Record<string, number>;
  } {
    const byModule: Record<string, number> = {};
    const byPriority: Record<string, number> = {};

    for (const p of this.prompts.values()) {
      byModule[p.meta.module] = (byModule[p.meta.module] || 0) + 1;
      byPriority[p.meta.priority] = (byPriority[p.meta.priority] || 0) + 1;
    }

    return {
      total: this.prompts.size,
      byModule,
      byPriority,
    };
  }

  /**
   * 清空注册表（仅用于测试）
   */
  clear(): void {
    this.prompts.clear();
  }
}

/** 全局单例注册表 */
export const registry = new PromptRegistry();

// 导出类型供测试使用
export { PromptRegistry };
