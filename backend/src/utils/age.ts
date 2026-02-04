/**
 * 用户年龄计算与年龄分组工具
 *
 * 用于根据出生日期计算年龄，并生成适龄内容指令注入到 Prompt 中。
 */

export type AgeGroup = 'toddler' | 'child' | 'teen' | 'adult';

/**
 * 根据出生日期计算年龄
 *
 * 无效日期返回 -1，后续函数会将其安全降级为 adult（不追加限制）。
 */
export function calculateAge(birthDate: string): number {
  const birth = new Date(birthDate);
  if (isNaN(birth.getTime())) return -1;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

/**
 * 根据年龄返回年龄分组
 *
 * 负数（无效日期）安全降级为 adult。
 */
export function getAgeGroup(age: number): AgeGroup {
  if (age < 0) return 'adult';
  if (age < 6) return 'toddler';
  if (age < 12) return 'child';
  if (age < 18) return 'teen';
  return 'adult';
}

/**
 * 根据年龄生成注入到 Prompt 中的内容适配指令
 *
 * adult（18+）不追加任何限制，返回空字符串。
 */
export function getAgeContentGuide(age: number): string {
  const group = getAgeGroup(age);

  switch (group) {
    case 'toddler':
      return `【年龄适配·最高优先级】用户仅 ${age} 岁（幼儿），分析对象实际是家长。只分析性格天赋倾向和亲子关系建议，禁止涉及爱情、事业、财富、健康预测。语气面向成年家长，给出育儿方向参考。`;

    case 'child':
      return `【年龄适配·最高优先级】用户 ${age} 岁（儿童），侧重性格特点、学习风格、社交倾向和兴趣培养方向。禁止涉及爱情、事业、财富分析。语气友善、鼓励成长。`;

    case 'teen':
      return `【年龄适配·最高优先级】用户 ${age} 岁（青少年），侧重学业方向、自我认知、情绪管理、人际关系。爱情话题仅限青春期情感萌芽的正向引导，禁止深度事业、财富分析。语气像学长学姐给建议。`;

    case 'adult':
      return '';
  }
}

/**
 * 生成合盘场景的年龄适配指令
 *
 * 当任一方为未成年人时，调整关系分析角度。
 */
export function getSynastryAgeGuide(ageA: number, ageB: number): string {
  const groupA = getAgeGroup(ageA);
  const groupB = getAgeGroup(ageB);

  // 双方都是成年人，无需额外指令
  if (groupA === 'adult' && groupB === 'adult') return '';

  const parts: string[] = [`【年龄适配·最高优先级】A（${ageA}岁）和 B（${ageB}岁）。`];

  // 任一方为幼儿/儿童
  if (groupA === 'toddler' || groupA === 'child' || groupB === 'toddler' || groupB === 'child') {
    parts.push('关系分析应侧重家庭关系、亲子互动或友谊/同学关系，禁止分析恋爱、婚姻、性吸引力维度。');
  }
  // 双方都是青少年
  else if (groupA === 'teen' && groupB === 'teen') {
    parts.push('关系分析侧重友谊、同学互动和成长陪伴，爱情仅限青春期情感萌芽的正向引导，禁止深度恋爱/婚姻分析。');
  }
  // 一方青少年一方成年
  else if (groupA === 'teen' || groupB === 'teen') {
    parts.push('关系分析应侧重师生、长辈引导或友谊关系，禁止分析恋爱、婚姻维度。');
  }

  return parts.join('');
}
