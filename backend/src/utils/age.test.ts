import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateAge, getAgeGroup, getAgeContentGuide, getSynastryAgeGuide } from './age.js';

// ========================
// calculateAge
// ========================
describe('calculateAge', () => {
  it('正确计算已过生日的年龄', () => {
    const today = new Date();
    const birthYear = today.getFullYear() - 25;
    // 用 1 月 1 日确保今天已过生日
    const age = calculateAge(`${birthYear}-01-01`);
    assert.equal(age, 25);
  });

  it('正确计算未过生日的年龄（生日在年底）', () => {
    const today = new Date();
    const birthYear = today.getFullYear() - 25;
    // 用 12 月 31 日确保今天未过生日（除非今天就是 12/31）
    const age = calculateAge(`${birthYear}-12-31`);
    const isLastDay = today.getMonth() === 11 && today.getDate() === 31;
    assert.equal(age, isLastDay ? 25 : 24);
  });

  it('今天生日返回正确年龄', () => {
    const today = new Date();
    const birthYear = today.getFullYear() - 30;
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const age = calculateAge(`${birthYear}-${month}-${day}`);
    assert.equal(age, 30);
  });

  it('新生儿返回 0', () => {
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const age = calculateAge(`${today.getFullYear()}-${month}-${day}`);
    assert.equal(age, 0);
  });

  it('无效日期返回 -1', () => {
    assert.equal(calculateAge('not-a-date'), -1);
    assert.equal(calculateAge(''), -1);
    assert.equal(calculateAge('2025-13-45'), -1);
    assert.equal(calculateAge('abc-de-fg'), -1);
  });

  it('边界格式日期正常处理', () => {
    // ISO 格式带时间
    const age = calculateAge('2000-06-15T00:00:00Z');
    assert.ok(age > 20);
  });
});

// ========================
// getAgeGroup
// ========================
describe('getAgeGroup', () => {
  it('负数（无效日期）降级为 adult', () => {
    assert.equal(getAgeGroup(-1), 'adult');
    assert.equal(getAgeGroup(-100), 'adult');
  });

  it('0-5 岁为 toddler', () => {
    assert.equal(getAgeGroup(0), 'toddler');
    assert.equal(getAgeGroup(3), 'toddler');
    assert.equal(getAgeGroup(5), 'toddler');
  });

  it('6-11 岁为 child', () => {
    assert.equal(getAgeGroup(6), 'child');
    assert.equal(getAgeGroup(8), 'child');
    assert.equal(getAgeGroup(11), 'child');
  });

  it('12-17 岁为 teen', () => {
    assert.equal(getAgeGroup(12), 'teen');
    assert.equal(getAgeGroup(15), 'teen');
    assert.equal(getAgeGroup(17), 'teen');
  });

  it('18+ 岁为 adult', () => {
    assert.equal(getAgeGroup(18), 'adult');
    assert.equal(getAgeGroup(25), 'adult');
    assert.equal(getAgeGroup(80), 'adult');
  });

  it('边界值正确', () => {
    assert.equal(getAgeGroup(5), 'toddler');
    assert.equal(getAgeGroup(6), 'child');
    assert.equal(getAgeGroup(11), 'child');
    assert.equal(getAgeGroup(12), 'teen');
    assert.equal(getAgeGroup(17), 'teen');
    assert.equal(getAgeGroup(18), 'adult');
  });
});

// ========================
// getAgeContentGuide
// ========================
describe('getAgeContentGuide', () => {
  it('幼儿返回面向家长的指令', () => {
    const guide = getAgeContentGuide(3);
    assert.ok(guide.includes('3 岁'));
    assert.ok(guide.includes('幼儿'));
    assert.ok(guide.includes('家长'));
    assert.ok(guide.includes('禁止'));
    assert.ok(guide.includes('最高优先级'));
  });

  it('儿童返回学习导向指令', () => {
    const guide = getAgeContentGuide(9);
    assert.ok(guide.includes('9 岁'));
    assert.ok(guide.includes('儿童'));
    assert.ok(guide.includes('学习风格'));
    assert.ok(guide.includes('禁止'));
  });

  it('青少年返回学业导向指令', () => {
    const guide = getAgeContentGuide(15);
    assert.ok(guide.includes('15 岁'));
    assert.ok(guide.includes('青少年'));
    assert.ok(guide.includes('学业'));
    assert.ok(guide.includes('禁止深度'));
  });

  it('成人返回空字符串', () => {
    assert.equal(getAgeContentGuide(25), '');
    assert.equal(getAgeContentGuide(18), '');
  });

  it('无效年龄（-1）返回空字符串（降级为 adult）', () => {
    assert.equal(getAgeContentGuide(-1), '');
  });
});

// ========================
// getSynastryAgeGuide
// ========================
describe('getSynastryAgeGuide', () => {
  it('双方成年返回空字符串', () => {
    assert.equal(getSynastryAgeGuide(25, 30), '');
    assert.equal(getSynastryAgeGuide(18, 18), '');
  });

  it('一方为幼儿返回家庭关系指令', () => {
    const guide = getSynastryAgeGuide(3, 30);
    assert.ok(guide.includes('3岁'));
    assert.ok(guide.includes('30岁'));
    assert.ok(guide.includes('家庭关系'));
    assert.ok(guide.includes('禁止'));
  });

  it('一方为儿童返回家庭关系指令', () => {
    const guide = getSynastryAgeGuide(25, 8);
    assert.ok(guide.includes('家庭关系'));
    assert.ok(guide.includes('禁止'));
  });

  it('双方儿童返回家庭/友谊指令', () => {
    const guide = getSynastryAgeGuide(8, 9);
    assert.ok(guide.includes('家庭关系'));
    assert.ok(guide.includes('友谊'));
  });

  it('双方青少年返回友谊导向指令', () => {
    const guide = getSynastryAgeGuide(15, 16);
    assert.ok(guide.includes('友谊'));
    assert.ok(guide.includes('同学'));
    assert.ok(guide.includes('禁止深度'));
  });

  it('一方青少年一方成年返回师生/友谊指令', () => {
    const guide = getSynastryAgeGuide(15, 30);
    assert.ok(guide.includes('师生'));
    assert.ok(guide.includes('禁止'));
  });

  it('无效年龄（-1）降级为 adult', () => {
    // -1 + 25 = 双方 adult，返回空
    assert.equal(getSynastryAgeGuide(-1, 25), '');
    // -1 + 10 = adult + child，应返回家庭关系指令
    const guide = getSynastryAgeGuide(-1, 10);
    assert.ok(guide.includes('家庭关系'));
  });
});
