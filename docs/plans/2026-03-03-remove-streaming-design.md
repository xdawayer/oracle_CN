# 移除全部流式输出 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 移除项目中所有 SSE 流式输出代码，统一使用非流式同步 API，简化架构并减少出错概率。

**Architecture:** 项目有 4 个后端 SSE 流式端点和对应的前端流式消费代码。所有流式端点都有等效的非流式端点（/api/ask、/api/daily/full、/api/natal/full、/api/synastry/full），前端页面需从 requestStream 回调模式改为 request Promise 模式。

**Tech Stack:** Express (TypeScript) + 微信小程序原生 JS

---

### Task 1: 后端 — 删除 ask.ts 的流式端点

**Files:**
- Modify: `backend/src/api/ask.ts:9` (import)
- Modify: `backend/src/api/ask.ts:1-3` (头注释)
- Delete: `backend/src/api/ask.ts:99-207` (POST /api/ask/stream 完整路由)

**Step 1: 修改 import，移除流式函数引用**

行 9 当前：
```typescript
import { AIUnavailableError, generateAIContentWithMeta, generateAIContentStream, isStreamablePrompt } from '../services/ai.js';
```
改为：
```typescript
import { AIUnavailableError, generateAIContentWithMeta } from '../services/ai.js';
```

**Step 2: 删除 POST /api/ask/stream 路由**

删除行 99-207 的完整 `askRouter.post('/stream', ...)` 路由处理函数。

**Step 3: 更新头注释**

行 2 当前：
```
// OUTPUT: 导出 ask 路由（含类别上下文、SSE 流式输出、权益校验与 Server-Timing）。
```
改为：
```
// OUTPUT: 导出 ask 路由（含类别上下文、权益校验与 Server-Timing）。
```

**Step 4: Commit**
```bash
git add backend/src/api/ask.ts
git commit -m "refactor: remove SSE streaming endpoint from ask API"
```

---

### Task 2: 后端 — 删除 natal.ts 的流式端点

**Files:**
- Modify: `backend/src/api/natal.ts:1-3` (头注释)
- Delete: `backend/src/api/natal.ts:24-26` (writeSSE 辅助函数)
- Delete: `backend/src/api/natal.ts:246-363` (GET /api/natal/full/stream 完整路由)

**Step 1: 删除 writeSSE 辅助函数（行 24-26）**

```typescript
function writeSSE(res: any, payload: unknown) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}
```

注意：确认 writeSSE 仅在 /full/stream 路由中使用（不被其他路由引用）。

**Step 2: 删除 GET /api/natal/full/stream 路由**

删除行 246-363 的完整 `natalRouter.get('/full/stream', ...)` 路由处理函数。

**Step 3: 更新头注释**

行 2 当前：
```
// OUTPUT: 导出 natal 路由（含 overview/core/dimension/full 与模块级 stream、紧凑摘要与 Server-Timing）。
```
改为：
```
// OUTPUT: 导出 natal 路由（含 overview/core/dimension/full、紧凑摘要与 Server-Timing）。
```

**Step 4: Commit**
```bash
git add backend/src/api/natal.ts
git commit -m "refactor: remove SSE streaming endpoint from natal API"
```

---

### Task 3: 后端 — 删除 daily.ts 的流式端点

**Files:**
- Modify: `backend/src/api/daily.ts` (头注释)
- Delete: `backend/src/api/daily.ts:508-658` (GET /api/daily/full/stream 完整路由)

**Step 1: 检查 daily.ts 中 writeSSE/SSE 辅助函数是否仅被流式端点使用**

如果有 writeSSE 函数且仅被 /full/stream 使用，一并删除。

**Step 2: 删除 GET /api/daily/full/stream 路由**

删除行 508-658 的完整 `dailyRouter.get('/full/stream', ...)` 路由处理函数。

**Step 3: 更新头注释**

移除注释中对 "stream" 的提及。

**Step 4: Commit**
```bash
git add backend/src/api/daily.ts
git commit -m "refactor: remove SSE streaming endpoint from daily API"
```

---

### Task 4: 后端 — 删除 synastry.ts 的流式端点

**Files:**
- Delete: `backend/src/api/synastry.ts:1130-1328` (GET /api/synastry/full/stream 完整路由)

**Step 1: 删除 GET /api/synastry/full/stream 路由**

删除行 1130-1328 的完整 `synastryRouter.get('/full/stream', ...)` 路由处理函数。

**Step 2: 检查并删除仅被流式端点使用的辅助函数**

若有 writeSSE 等函数仅被 /full/stream 使用，一并删除。

**Step 3: 更新头注释**

移除注释中对 "stream" 的提及。

**Step 4: Commit**
```bash
git add backend/src/api/synastry.ts
git commit -m "refactor: remove SSE streaming endpoint from synastry API"
```

---

### Task 5: 后端 — 删除 ai.ts 中流式生成函数

**Files:**
- Delete: `backend/src/services/ai.ts:301-304` (STREAMABLE_PROMPTS 常量)
- Delete: `backend/src/services/ai.ts:657-810` (StreamGenerateOptions 接口 + isStreamablePrompt + generateAIContentStream)
- Modify: `backend/src/services/ai.ts:1-3` (头注释)

**Step 1: 删除 STREAMABLE_PROMPTS 常量（行 301-304）**

```typescript
const STREAMABLE_PROMPTS = new Set<string>([
  'ask-answer',
]);
```

**Step 2: 删除流式生成相关代码（行 657-810）**

删除以下内容：
- `StreamGenerateOptions` 接口（行 657-663）
- `isStreamablePrompt()` 函数（行 665-667）
- `generateAIContentStream()` 异步生成器函数（行 669-810）

**注意：保留 `RAW_TEXT_PROMPTS`，它被非流式代码使用。**

**Step 3: 更新头注释**

行 1 当前：
```
// INPUT: AI 内容生成服务（DeepSeek chat/reasoning，含 token 预算、流式输出与缓存）。
```
改为：
```
// INPUT: AI 内容生成服务（DeepSeek chat/reasoning，含 token 预算与缓存）。
```

行 2 当前：
```
// OUTPUT: 导出 AI 调用服务（snake_case 输出、缓存/JSON 修复、流式生成与调用日志）。
```
改为：
```
// OUTPUT: 导出 AI 调用服务（snake_case 输出、缓存/JSON 修复与调用日志）。
```

**Step 4: Commit**
```bash
git add backend/src/services/ai.ts
git commit -m "refactor: remove streaming generation functions from AI service"
```

---

### Task 6: 后端 — 清理 index.ts 中间件

**Files:**
- Modify: `backend/src/index.ts:55-63` (compression 中间件)
- Modify: `backend/src/index.ts:67-77` (timeout 中间件)

**Step 1: 简化 compression 中间件（行 55-63）**

当前：
```typescript
app.use(compression({
  filter: (req, res) => {
    // SSE 流式端点不压缩，避免缓冲导致 ERR_INCOMPLETE_CHUNKED_ENCODING
    if (req.path.endsWith('/stream')) return false;
    return compression.filter(req, res);
  },
}));
```
改为：
```typescript
app.use(compression());
```

**Step 2: 简化 timeout 中间件（行 67-77）**

当前：
```typescript
app.use((req, res, next) => {
  if (req.path.endsWith('/stream')) {
    return next();
  }
  res.setTimeout(120_000, () => {
    if (!res.headersSent) {
      res.status(504).json({ error: 'Request timeout' });
    }
  });
  next();
});
```
改为：
```typescript
app.use((req, res, next) => {
  res.setTimeout(120_000, () => {
    if (!res.headersSent) {
      res.status(504).json({ error: 'Request timeout' });
    }
  });
  next();
});
```

删除注释中对 "SSE 流式端点" 的提及。

**Step 3: Commit**
```bash
git add backend/src/index.ts
git commit -m "refactor: remove /stream exceptions from compression and timeout middleware"
```

---

### Task 7: 前端 — 清理 request.js 流式函数

**Files:**
- Delete: `miniprogram/utils/request.js:8` (DEFAULT_STREAM_TIMEOUT_MS 常量)
- Delete: `miniprogram/utils/request.js:347-714` (所有流式相关函数)
- Modify: `miniprogram/utils/request.js:716-721` (module.exports)

**Step 1: 删除 DEFAULT_STREAM_TIMEOUT_MS 常量（行 8）**

```javascript
const DEFAULT_STREAM_TIMEOUT_MS = 120000;
```

**Step 2: 删除所有流式相关函数（行 347-714）**

删除以下函数：
- `_decodeUTF8()` (行 347-380)
- `_checkUTF8Tail()` (行 386-412)
- `_downgradeStreamUrl()` (行 414-417)
- `_emitParsedSsePayload()` (行 419-441)
- `_emitFromSseText()` (行 443-461)
- `_emitFromFullJson()` (行 463-506)
- `requestStream()` (行 523)
- `_requestStreamInternal()` (行 525-714)

**Step 3: 更新 module.exports（行 716-721）**

当前：
```javascript
module.exports = {
  request,
  requestStream,
  refreshAccessToken,
  getBaseUrl,
};
```
改为：
```javascript
module.exports = {
  request,
  refreshAccessToken,
  getBaseUrl,
};
```

**Step 4: Commit**
```bash
git add miniprogram/utils/request.js
git commit -m "refactor: remove all SSE streaming functions from request utility"
```

---

### Task 8: 前端 — 改造 ask.js

**Files:**
- Modify: `miniprogram/pages/ask/ask.js:1` (import)
- Modify: `miniprogram/pages/ask/ask.js:270-328` (替换 requestStream 为 request)
- Delete: `miniprogram/pages/ask/ask.js:382-414` (_fallbackNonStream 方法)
- Modify: `miniprogram/pages/ask/ask.js:416-421` (closeReport 中的 abort 逻辑)

**Step 1: 更新 import（行 1）**

当前：
```javascript
const { request, requestStream } = require('../../utils/request');
```
改为：
```javascript
const { request } = require('../../utils/request');
```

**Step 2: 替换流式请求为非流式（行 270-328）**

当前是 requestStream 回调模式。替换为：

```javascript
    // 使用非流式请求
    request({
      url: API_ENDPOINTS.ASK,
      method: 'POST',
      data: requestData,
      timeout: 120000,
    })
      .then((res) => {
        if (res && res.content) {
          this.setData({
            reportData: this._parseReport(res.content),
            reportChartData: res.chart || null,
            reportTransitData: res.transits || null,
            reportLoading: false,
            isLoading: false
          });
        } else {
          throw new Error('No content received');
        }
        this._fetchQuota();
      })
      .catch((err) => {
        logger.error('Ask Request Error:', err);
        if (err && err.statusCode === 403) {
          this.setData({ showReport: false, reportLoading: false, reportData: null, isLoading: false });
          this._fetchQuota();
          wx.showModal({
            title: '提问次数已用完',
            content: '开通会员可享 AI 问答无限次使用',
            confirmText: '了解会员',
            cancelText: '关闭',
            success: (modalRes) => {
              if (modalRes.confirm) {
                wx.navigateTo({ url: '/pages/subscription/subscription' });
              }
            },
          });
        } else {
          wx.showToast({ title: '分析服务中断，请稍后再试', icon: 'none' });
          this.setData({ showReport: false, reportLoading: false, reportData: null, isLoading: false });
        }
      });
```

**Step 3: 删除 _fallbackNonStream 方法（行 382-414）**

不再需要降级逻辑。

**Step 4: 简化 closeReport（行 416-421）**

当前：
```javascript
  closeReport() {
    if (this._streamTask) {
      this._streamTask.abort();
      this._streamTask = null;
    }
```
改为：
```javascript
  closeReport() {
```

移除所有 `this._streamTask` 引用。

**Step 5: Commit**
```bash
git add miniprogram/pages/ask/ask.js
git commit -m "refactor: replace streaming with sync request in ask page"
```

---

### Task 9: 前端 — 改造 home.js

**Files:**
- Modify: `miniprogram/pages/home/home.js:1` (import)
- Modify: `miniprogram/pages/home/home.js:448-501` (替换 requestStream 为 request)
- Modify: `miniprogram/pages/home/home.js:97,142-144,324-326` (清理 _activeStreamTask 引用)

**Step 1: 更新 import（行 1）**

当前：
```javascript
const { request, requestStream, getBaseUrl } = require('../../utils/request');
```
改为：
```javascript
const { request, getBaseUrl } = require('../../utils/request');
```

**Step 2: 替换流式请求（行 448-501）**

将行 448-501 的 requestStream 回调替换为：

```javascript
    request({
      url: `${API_ENDPOINTS.DAILY_FULL}?${query}`,
      method: 'GET',
      timeout: 120000,
    })
      .then((res) => {
        if (!this._isLatestForecast(seq)) return;
        if (fullCacheKey && res && (res.chart || res.forecast)) {
          storage.set(fullCacheKey, res);
        }
        if (fullCacheKey) {
          storage.remove(fullCacheKey + '_pending');
        }
        if (res && res.forecast) {
          this._renderCardFromFullResult(res, today);
        } else {
          this._handleForecastError(new Error('AI 未返回有效内容'));
        }
      })
      .catch((err) => {
        if (!this._isLatestForecast(seq)) return;
        if (fullCacheKey) {
          storage.remove(fullCacheKey + '_pending');
        }
        this._handleForecastError(err);
      });
```

注意：删除 `const streamState`（行 448）和 `this._activeStreamTask = streamTask`（行 501）。

**Step 3: 清理 _activeStreamTask 引用**

- 行 97: `if (this._activeStreamTask) { return; }` — 删除此检查（非流式请求不需要）
- 行 142-144: `if (this._activeStreamTask) { this._activeStreamTask.abort(); ... }` — 删除 abort 逻辑
- 行 324-326: 同上

**Step 4: Commit**
```bash
git add miniprogram/pages/home/home.js
git commit -m "refactor: replace streaming with sync request in home page"
```

---

### Task 10: 前端 — 改造 daily.js

**Files:**
- Modify: `miniprogram/pages/daily/daily.js:1` (import)
- Modify: `miniprogram/pages/daily/daily.js:815-873` (替换 canChunked/requestStream 为 request)
- Modify: `miniprogram/pages/daily/daily.js:232,239-243` (清理 _activeStreamTask)

**Step 1: 更新 import（行 1）**

当前：
```javascript
const { request, requestStream } = require('../../utils/request');
```
改为：
```javascript
const { request } = require('../../utils/request');
```

**Step 2: 替换流式/分支逻辑（行 815-873）**

删除 `canChunked` 变量（行 815）和整个三元分支（行 818-873）。

替换为：
```javascript
      const fullPromise = request({
        url: `${API_ENDPOINTS.DAILY_FULL}?${query}`,
        method: 'GET',
        timeout: 120000,
      }).catch(err => {
        logger.warn('[Daily] /full failed:', err);
        return null;
      });
```

同时删除 `const streamState`（行 816）。

**Step 3: 清理 _activeStreamTask**

- 行 232: `_activeStreamTask: null` — 删除
- 行 239-243: `_stopActiveStream()` 方法 — 删除整个方法
- 行 856, 862: `this._activeStreamTask = null` — 删除（在 fullPromise 中不需要）
- 行 868: `this._activeStreamTask = streamTask` — 删除
- 行 951: `this._activeStreamTask = null` — 删除

搜索 `_stopActiveStream` 的所有调用，改为空操作或删除。

**Step 4: Commit**
```bash
git add miniprogram/pages/daily/daily.js
git commit -m "refactor: replace streaming with sync request in daily page"
```

---

### Task 11: 前端 — 改造 self.js

**Files:**
- Modify: `miniprogram/pages/self/self.js:1` (import)
- Modify: `miniprogram/pages/self/self.js:852-916` (fetchNatalFull 方法)

**Step 1: 更新 import（行 1）**

当前：
```javascript
const { request, requestStream } = require('../../utils/request');
```
改为：
```javascript
const { request } = require('../../utils/request');
```

**Step 2: 简化 fetchNatalFull 方法（行 852-916）**

当前有 canChunked 分支。删除流式分支，只保留非流式逻辑：

```javascript
  async fetchNatalFull() {
    const profile = this.userProfile || DEFAULT_PROFILE;
    if (!profile.birthDate || !profile.birthTime) return;

    try {
      const query = this.buildNatalParams();
      const res = await request({ url: `${API_ENDPOINTS.NATAL_FULL}?${query}`, timeout: 120000 });
      if (!res) return;

      const prefetched = {};
      const blockNames = ['overview', 'coreThemes', 'dimension'];
      for (const blockName of blockNames) {
        const block = res[blockName];
        if (block && block.content) {
          prefetched[blockName] = block.content;
        }
      }

      if (Object.keys(prefetched).length > 0) {
        this.setData({ prefetchedContent: prefetched });
        logger.log('[natal/full] Prefetched blocks:', Object.keys(prefetched).join(', '));
      }
    } catch (err) {
      logger.log('[natal/full] Prefetch failed, will fallback to /api/detail:', err?.statusCode || err?.message || err);
    }
  },
```

注意：这基本就是原有 `!canChunked` 分支的代码，删除流式分支即可。

**Step 3: 清理 _natalStreamTask**

搜索所有 `_natalStreamTask` 引用，确认仅在 fetchNatalFull 的流式分支中使用，删除即可。

**Step 4: Commit**
```bash
git add miniprogram/pages/self/self.js
git commit -m "refactor: replace streaming with sync request in self page"
```

---

### Task 12: 前端 — 改造 synastry.js

**Files:**
- Modify: `miniprogram/pages/synastry/synastry.js:1` (import)
- Modify: `miniprogram/pages/synastry/synastry.js:1243-1363` (替换 canChunked/requestStream)

**Step 1: 更新 import（行 1）**

当前：
```javascript
const { request, requestStream } = require('../../utils/request');
```
改为：
```javascript
const { request } = require('../../utils/request');
```

**Step 2: 替换流式/分支逻辑（行 1243-1313）**

删除 `canChunked`（行 1243）、`streamSuccess`（行 1244）和整个三元分支（行 1246-1313）。

替换为：
```javascript
      const fullPromise = request({
        url: `${API_ENDPOINTS.SYNASTRY_FULL}?${fullQuery}`,
        method: 'GET',
        timeout: 120000,
      }).catch(err => {
        logger.warn('[Synastry] /full failed:', err);
        return null;
      });
```

**Step 3: 统一 fullRes 处理逻辑（行 1326-1363）**

当前有 `if (fullRes && !canChunked)` 和 `else if (fullRes && canChunked)` 分支。简化为：

```javascript
      if (fullRes) {
        try {
          const chartData = technicalRes ? {} : this.prepareChartDataFromFullResponse(fullRes);
          const overviewContent = fullRes.overview || {};
          const overviewData = this.parseOverview(overviewContent);
          const tabContents = { overview: overviewContent };
          const statusUpdate = { 'tabLoadStatus.overview': 'loaded' };

          if (fullRes.coreDynamics) {
            tabContents.coreDynamics = fullRes.coreDynamics;
            statusUpdate['tabLoadStatus.coreDynamics'] = 'loaded';
          } else {
            statusUpdate['tabLoadStatus.coreDynamics'] = 'error';
          }

          if (fullRes.highlights) {
            tabContents.highlights = fullRes.highlights;
            statusUpdate['tabLoadStatus.highlights'] = 'loaded';
          } else {
            statusUpdate['tabLoadStatus.highlights'] = 'error';
          }

          this.setData(Object.assign({
            overviewData,
            tabContents
          }, chartData, statusUpdate));

          fullSuccess = true;
        } catch (parseErr) {
          logger.error('[Synastry] Failed to parse /full response:', parseErr);
        }
      }
```

**Step 4: Commit**
```bash
git add miniprogram/pages/synastry/synastry.js
git commit -m "refactor: replace streaming with sync request in synastry page"
```

---

### Task 13: 前端 — 清理 API 常量

**Files:**
- Modify: `miniprogram/services/api.js`

**Step 1: 删除 3 个流式 URL 常量**

删除以下行：
- 行 4: `NATAL_FULL_STREAM: '/api/natal/full/stream',`
- 行 11: `DAILY_FULL_STREAM: '/api/daily/full/stream',`
- 行 42: `SYNASTRY_FULL_STREAM: '/api/synastry/full/stream',`

**Step 2: 验证无其他引用**

搜索 `NATAL_FULL_STREAM`、`DAILY_FULL_STREAM`、`SYNASTRY_FULL_STREAM` 确认无残留引用。

**Step 3: Commit**
```bash
git add miniprogram/services/api.js
git commit -m "refactor: remove streaming API endpoint constants"
```

---

### Task 14: 最终验证

**Step 1: 全局搜索残留引用**

```bash
grep -r "requestStream\|_streamTask\|_activeStreamTask\|_natalStreamTask\|FULL_STREAM\|/stream\|enableChunked\|canChunked\|onChunk\|onModule\|onMeta\|writeSSE\|STREAMABLE\|isStreamable\|generateAIContentStream\|StreamGenerate" --include="*.ts" --include="*.js" backend/src/ miniprogram/
```

预期结果：无匹配项（除测试文件外）。

**Step 2: 后端编译检查**

```bash
cd backend && npx tsc --noEmit
```

预期：无编译错误。

**Step 3: Commit（如果有遗漏清理）**
```bash
git add -A
git commit -m "refactor: final cleanup of streaming code remnants"
```
