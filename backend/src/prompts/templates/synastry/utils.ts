/**
 * 合盘模块共享工具函数
 */

import type { PromptContext } from '../../core/types';

/** 关系类型映射表（同时支持英文 ID 和中文 label） */
const RELATION_TYPE_MAP: Record<string, string> = {
  // 英文 ID（后端内部使用）
  romantic: '恋人',
  married: '夫妻',
  spouse: '夫妻',   // 前端 id='spouse'
  friend: '朋友',
  family: '家人',
  colleague: '同事',
  business: '同事',
  // 中文 label（前端 relationType 参数直接传中文）
  '恋人': '恋人',
  '配偶': '夫妻',
  '夫妻': '夫妻',
  '朋友': '朋友',
  '家人': '家人',
  '同事': '同事',
  '伴侣': '伴侣',
};

/** 解析关系类型 */
export function resolveRelationType(ctx: PromptContext): string {
  const type = String(ctx.relationship_type || '').trim();
  return RELATION_TYPE_MAP[type] || '伴侣';
}

/** 解析合盘姓名（双人） */
export function resolvePairName(ctx: PromptContext, key: 'nameA' | 'nameB'): string {
  const raw = String(ctx[key] || '').trim();
  if (raw) return raw;
  return key === 'nameA' ? '甲方' : '乙方';
}

/** 解析单人姓名（A） */
export function resolveNameA(ctx: PromptContext): string {
  const raw = String(ctx.nameA || ctx.name_a || '').trim();
  return raw || '甲方';
}

/** 解析单人姓名（B） */
export function resolveNameB(ctx: PromptContext): string {
  const raw = String(ctx.nameB || ctx.name_b || '').trim();
  return raw || '乙方';
}

/** 判断是否为恋爱/婚姻类关系（用于 fallback 默认分支） */
export function isRomanticType(relationType: string): boolean {
  return relationType === '恋人' || relationType === '夫妻' || relationType === '伴侣';
}
