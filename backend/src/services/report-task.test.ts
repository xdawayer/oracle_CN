import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { _normalizeBirthLookupInput as normalizeBirthLookupInput, _buildBirthLookupHash as buildBirthLookupHash } from './report-task.js';

// ========================
// normalizeBirthLookupInput
// ========================
describe('normalizeBirthLookupInput', () => {
  it('规范化标准出生信息', () => {
    const result = normalizeBirthLookupInput({
      date: '2000-01-01',
      time: '12:00',
      city: '北京, 中国',
      lat: 39.9042,
      lon: 116.4074,
      timezone: '8',
      accuracy: 'exact',
    });
    assert.equal(result.date, '2000-01-01');
    assert.equal(result.time, '12:00');
    assert.equal(result.city, '北京, 中国');
    assert.equal(result.lat, 39.9042);
    assert.equal(result.lon, 116.4074);
    assert.equal(result.timezone, '8');
    assert.equal(result.accuracy, 'exact');
  });

  it('字符串类型的经纬度转为数字', () => {
    const result = normalizeBirthLookupInput({
      date: '2000-01-01',
      lat: '39.9042' as any,
      lon: '116.4074' as any,
    });
    assert.equal(result.lat, 39.9042);
    assert.equal(result.lon, 116.4074);
  });

  it('无效经纬度返回 null', () => {
    const result = normalizeBirthLookupInput({
      date: '2000-01-01',
      lat: 'invalid' as any,
      lon: '' as any,
    });
    assert.equal(result.lat, null);
    assert.equal(result.lon, null);
  });

  it('缺失字段使用默认值', () => {
    const result = normalizeBirthLookupInput({});
    assert.equal(result.date, '');
    assert.equal(result.time, '');
    assert.equal(result.city, '');
    assert.equal(result.lat, null);
    assert.equal(result.lon, null);
    assert.equal(result.timezone, '');
    assert.equal(result.accuracy, 'exact');
  });

  it('去除 city 和 timezone 两端的空格', () => {
    const result = normalizeBirthLookupInput({
      city: '  上海  ',
      timezone: '  Asia/Shanghai  ',
    } as any);
    assert.equal(result.city, '上海');
    assert.equal(result.timezone, 'Asia/Shanghai');
  });
});

// ========================
// buildBirthLookupHash
// ========================
describe('buildBirthLookupHash', () => {
  it('相同输入产生相同 hash', () => {
    const birth = { date: '2000-01-01', time: '12:00', city: '北京', lat: 39.9, lon: 116.4 };
    const hash1 = buildBirthLookupHash(birth);
    const hash2 = buildBirthLookupHash(birth);
    assert.equal(hash1, hash2);
  });

  it('不同输入产生不同 hash', () => {
    const hash1 = buildBirthLookupHash({ date: '2000-01-01', time: '12:00' });
    const hash2 = buildBirthLookupHash({ date: '2000-01-02', time: '12:00' });
    assert.notEqual(hash1, hash2);
  });

  it('字符串和数字经纬度规范化后 hash 相同', () => {
    const hash1 = buildBirthLookupHash({ date: '2000-01-01', lat: 39.9, lon: 116.4 });
    const hash2 = buildBirthLookupHash({ date: '2000-01-01', lat: '39.9' as any, lon: '116.4' as any });
    assert.equal(hash1, hash2);
  });
});
