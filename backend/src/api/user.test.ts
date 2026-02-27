import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { _isLocalAvatarUrl as isLocalAvatarUrl, _resolveLocalAvatarPath as resolveLocalAvatarPath, _sanitizeAvatarUrl as sanitizeAvatarUrl } from './user.js';

// 与 isLocalAvatarUrl 保持一致的本地域名基准
const LOCAL_BASE = process.env.PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 3001}`;

// ========================
// isLocalAvatarUrl
// ========================
describe('isLocalAvatarUrl', () => {
  it('相对路径视为本地', () => {
    assert.equal(isLocalAvatarUrl('/uploads/avatars/test.png'), true);
    assert.equal(isLocalAvatarUrl('/other/path.png'), true);
  });

  it('匹配默认本地域名的 URL 视为本地', () => {
    assert.equal(isLocalAvatarUrl(`${LOCAL_BASE}/uploads/avatars/test.png`), true);
  });

  it('外部域名不视为本地', () => {
    assert.equal(isLocalAvatarUrl('https://cdn.example.com/uploads/avatars/test.png'), false);
    assert.equal(isLocalAvatarUrl('https://example.com/uploads/avatars/test.png'), false);
  });

  it('无效 URL 不视为本地', () => {
    assert.equal(isLocalAvatarUrl('not-a-url'), false);
  });
});

// ========================
// resolveLocalAvatarPath
// ========================
describe('resolveLocalAvatarPath', () => {
  it('解析本地相对路径', () => {
    const result = resolveLocalAvatarPath('/uploads/avatars/test.png');
    assert.equal(result.local, true);
    assert.ok(result.path);
    assert.ok(result.path.endsWith(path.join('uploads', 'avatars', 'test.png')));
  });

  it('解析匹配本地域名的完整 URL', () => {
    const result = resolveLocalAvatarPath(`${LOCAL_BASE}/uploads/avatars/test.png`);
    assert.equal(result.local, true);
    assert.ok(result.path);
    assert.ok(result.path.endsWith(path.join('uploads', 'avatars', 'test.png')));
  });

  it('外部域名的 URL 返回 local=false', () => {
    const r1 = resolveLocalAvatarPath('https://cdn.example.com/uploads/avatars/test.png');
    assert.equal(r1.local, false);
    assert.equal(r1.path, null);

    const r2 = resolveLocalAvatarPath('https://example.com/uploads/avatars/test.png');
    assert.equal(r2.local, false);
    assert.equal(r2.path, null);
  });

  it('非 avatar 路径返回 local=false', () => {
    const r1 = resolveLocalAvatarPath('/other/path/file.png');
    assert.equal(r1.local, false);

    const r2 = resolveLocalAvatarPath('/uploads/other/file.png');
    assert.equal(r2.local, false);
  });

  it('路径遍历攻击返回 local=true, path=null', () => {
    const r1 = resolveLocalAvatarPath('/uploads/avatars/../../etc/passwd');
    assert.equal(r1.local, true);
    assert.equal(r1.path, null);

    const r2 = resolveLocalAvatarPath('/uploads/avatars/../../../secret');
    assert.equal(r2.local, true);
    assert.equal(r2.path, null);
  });

  it('遍历到 uploads 其他子目录返回 local=true, path=null', () => {
    const result = resolveLocalAvatarPath('/uploads/avatars/../other/file.txt');
    assert.equal(result.local, true);
    assert.equal(result.path, null);
  });

  it('编码的路径遍历攻击返回 local=true, path=null', () => {
    const result = resolveLocalAvatarPath(`${LOCAL_BASE}/uploads/avatars/..%2F..%2Fetc%2Fpasswd`);
    assert.equal(result.local, true);
    assert.equal(result.path, null);
  });
});

// ========================
// sanitizeAvatarUrl (async)
// ========================
describe('sanitizeAvatarUrl', () => {
  it('非字符串输入返回空 URL', async () => {
    assert.deepEqual(await sanitizeAvatarUrl(null), { url: '', staleLocalUpload: false });
    assert.deepEqual(await sanitizeAvatarUrl(undefined), { url: '', staleLocalUpload: false });
    assert.deepEqual(await sanitizeAvatarUrl(123), { url: '', staleLocalUpload: false });
    assert.deepEqual(await sanitizeAvatarUrl(''), { url: '', staleLocalUpload: false });
    assert.deepEqual(await sanitizeAvatarUrl('  '), { url: '', staleLocalUpload: false });
  });

  it('外部 URL 直接透传（不做本地文件检查）', async () => {
    const result = await sanitizeAvatarUrl('https://cdn.example.com/avatar.png');
    assert.equal(result.url, 'https://cdn.example.com/avatar.png');
    assert.equal(result.staleLocalUpload, false);
  });

  it('外部域名即使路径含 /uploads/avatars/ 也直接透传', async () => {
    const result = await sanitizeAvatarUrl('https://cdn.example.com/uploads/avatars/a.png');
    assert.equal(result.url, 'https://cdn.example.com/uploads/avatars/a.png');
    assert.equal(result.staleLocalUpload, false);
  });

  it('本地头像文件不存在标记 staleLocalUpload', async () => {
    const result = await sanitizeAvatarUrl('/uploads/avatars/nonexistent-file.png');
    assert.equal(result.url, '');
    assert.equal(result.staleLocalUpload, true);
  });

  it('本地头像文件存在返回原始 URL', async () => {
    const avatarsDir = path.resolve(process.cwd(), 'uploads', 'avatars');
    fs.mkdirSync(avatarsDir, { recursive: true });
    const testFile = path.join(avatarsDir, '_test_avatar.png');
    fs.writeFileSync(testFile, 'test');

    try {
      const result = await sanitizeAvatarUrl('/uploads/avatars/_test_avatar.png');
      assert.equal(result.url, '/uploads/avatars/_test_avatar.png');
      assert.equal(result.staleLocalUpload, false);
    } finally {
      fs.unlinkSync(testFile);
    }
  });

  it('本地路径遍历攻击标记 staleLocalUpload 并清空 URL', async () => {
    const result = await sanitizeAvatarUrl('/uploads/avatars/../../etc/passwd');
    assert.equal(result.url, '');
    assert.equal(result.staleLocalUpload, true);
  });

  it('遍历到 uploads 其他子目录也标记 staleLocalUpload', async () => {
    const result = await sanitizeAvatarUrl('/uploads/avatars/../other/file.txt');
    assert.equal(result.url, '');
    assert.equal(result.staleLocalUpload, true);
  });
});
