const storage = require('./storage');
const logger = require('./logger');

const DEFAULT_BASE_URL = 'https://express-wb6g-225568-8-1404386472.sh.run.tcloudbase.com';
// 本地开发时使用本地后端，扫码真机预览需使用云托管地址
const DEFAULT_DEV_BASE_URL = DEFAULT_BASE_URL; // 原值 'http://127.0.0.1:3001'，改为使用云托管地址
const DEFAULT_TIMEOUT_MS = 30000;
const DEFAULT_STREAM_TIMEOUT_MS = 120000;

// ---- 微信云托管 callContainer 配置（绕过域名白名单限制）----
const CLOUD_HOSTING_ENV = 'prod-6gnh6drs7858f443';
const CLOUD_HOSTING_SERVICE = 'express-wb6g';

let _cloudReady = false;
let _cloudFailedUntil = 0; // 云托管失败后冷却到此时间戳，期间跳过 cloud
const CLOUD_COOLDOWN_MS = 30000; // 失败后冷却 30 秒再重试 cloud
const _useCloud = () => {
  // 本地开发时跳过云托管，直接走 wx.request 打 localhost
  if (getEnvVersion() === 'develop') return false;
  if (_cloudFailedUntil > Date.now()) return false;
  if (_cloudReady) return true;
  try {
    if (!wx.cloud || !wx.cloud.callContainer) return false;
    _cloudReady = true;
    return true;
  } catch {
    return false;
  }
};

const getEnvVersion = () => {
  try {
    if (!wx.getAccountInfoSync) return null;
    const info = wx.getAccountInfoSync();
    return info && info.miniProgram ? info.miniProgram.envVersion : null;
  } catch {
    return null;
  }
};

const getBaseUrl = () => {
  let appBaseUrl = null;
  try {
    const app = getApp();
    appBaseUrl = app && app.globalData ? app.globalData.apiBaseUrl : null;
  } catch {
    appBaseUrl = null;
  }

  const storedBaseUrl = storage.get('api_base_url');
  const envVersion = getEnvVersion();
  const defaultBaseUrl = envVersion === 'develop' ? DEFAULT_DEV_BASE_URL : DEFAULT_BASE_URL;
  const baseUrl = appBaseUrl || storedBaseUrl || defaultBaseUrl;
  return baseUrl.replace(/\/$/, '');
};

const normalizeTokens = (data) => {
  if (!data) return null;
  if (data.tokens) {
    return {
      accessToken: data.tokens.accessToken,
      refreshToken: data.tokens.refreshToken,
      expiresIn: data.tokens.expiresIn,
    };
  }
  if (data.access_token) {
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    };
  }
  return null;
};

const _directRequest = (options, resolve, reject) => {
  wx.request({
    ...options,
    success: resolve,
    fail: reject,
  });
};

const CLOUD_TIMEOUT_MS = 12000; // 云托管最多等 12 秒（留够冷启动时间），超时即降级

const wxRequest = (options) => new Promise((resolve, reject) => {
  if (_useCloud()) {
    let path = options.url || '';
    const base = getBaseUrl();
    if (path.startsWith(base)) {
      path = path.slice(base.length);
    }

    let settled = false;
    const fallback = (reason) => {
      if (settled) return;
      settled = true;
      // 进入冷却期，期间跳过 cloud；冷却结束后自动重试
      _cloudFailedUntil = Date.now() + CLOUD_COOLDOWN_MS;
      logger.warn('[request] callContainer ' + reason + ', fallback to wx.request (cooldown 30s)');
      _directRequest(options, resolve, reject);
    };

    // 云调用超时保护
    const timer = setTimeout(() => fallback('timeout'), CLOUD_TIMEOUT_MS);

    wx.cloud.callContainer({
      config: { env: CLOUD_HOSTING_ENV },
      path,
      method: options.method || 'GET',
      data: options.data,
      header: {
        'X-WX-SERVICE': CLOUD_HOSTING_SERVICE,
        ...(options.header || {}),
      },
      success: (res) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(res);
      },
      fail: (err) => {
        clearTimeout(timer);
        fallback('failed: ' + (err.errMsg || err));
      },
    });
    return;
  }
  _directRequest(options, resolve, reject);
});

const refreshAccessToken = async () => {
  const refreshToken = storage.get('refresh_token');
  if (!refreshToken) {
    throw new Error('Missing refresh token');
  }

  const baseUrl = getBaseUrl();
  const response = await wxRequest({
    url: `${baseUrl}/api/auth/refresh`,
    method: 'POST',
    data: { refreshToken },
    header: { 'Content-Type': 'application/json' },
  });

  if (response.statusCode < 200 || response.statusCode >= 300) {
    storage.clearTokens();
    throw new Error('Token refresh failed');
  }

  const tokens = normalizeTokens(response.data);
  if (!tokens || !tokens.accessToken) {
    storage.clearTokens();
    throw new Error('Token refresh failed');
  }

  storage.set('access_token', tokens.accessToken);
  if (tokens.refreshToken) {
    storage.set('refresh_token', tokens.refreshToken);
  }

  return tokens.accessToken;
};

// 静默重新登录（token 刷新失败时的兜底）
const _silentRelogin = async () => {
  const loginResult = await new Promise((resolve, reject) => {
    wx.login({ success: resolve, fail: reject });
  });
  if (!loginResult || !loginResult.code) {
    throw new Error('wx.login failed');
  }

  const baseUrl = getBaseUrl();
  const response = await wxRequest({
    url: `${baseUrl}/api/auth/wechat`,
    method: 'POST',
    data: { code: loginResult.code },
    header: { 'Content-Type': 'application/json' },
  });

  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new Error('Silent relogin failed');
  }

  const tokens = normalizeTokens(response.data);
  if (!tokens || !tokens.accessToken) {
    throw new Error('Silent relogin failed');
  }

  storage.set('access_token', tokens.accessToken);
  if (tokens.refreshToken) {
    storage.set('refresh_token', tokens.refreshToken);
  }
  return tokens.accessToken;
};

// 确保认证有效：先刷新 token，失败则静默重登录（带并发锁）
let _authPromise = null;
const _ensureAuth = async () => {
  if (_authPromise) return _authPromise;
  _authPromise = (async () => {
    try {
      return await refreshAccessToken();
    } catch {
      return await _silentRelogin();
    }
  })().finally(() => { _authPromise = null; });
  return _authPromise;
};

const buildHeaders = (headers, skipAuth) => {
  const token = storage.get('access_token');
  const deviceFingerprint = storage.get('device_fingerprint');
  const fingerprintHeader = deviceFingerprint ? { 'x-device-fingerprint': deviceFingerprint } : {};
  const authHeader = !skipAuth && token ? { Authorization: `Bearer ${token}` } : {};
  return {
    'Content-Type': 'application/json',
    ...fingerprintHeader,
    ...authHeader,
    ...headers,
  };
};

// 请求去重 Map：相同请求指纹共享同一 Promise
const _pendingRequests = new Map();

const _requestFingerprint = (url, method, data) => {
  try {
    return `${method}:${url}:${JSON.stringify(data || '')}`;
  } catch {
    return `${method}:${url}:${Date.now()}`;
  }
};

const _extractServerErrorMessage = (data) => {
  if (!data) return '';
  if (typeof data === 'string') return data;
  if (typeof data !== 'object') return '';
  return data.detail || data.error || data.message || '';
};

const _normalizeRequestError = (error, requestOptions) => {
  if (error instanceof Error && error.name === 'RequestError') {
    return error;
  }

  const statusCode = error && typeof error.statusCode === 'number' ? error.statusCode : undefined;
  const data = error && typeof error === 'object' && Object.prototype.hasOwnProperty.call(error, 'data')
    ? error.data
    : undefined;
  const serverMessage = _extractServerErrorMessage(data);
  const fallback = error && typeof error.errMsg === 'string' ? error.errMsg : '';
  const message = serverMessage || fallback || (statusCode ? `Request failed (${statusCode})` : 'Request failed');

  const normalized = new Error(message);
  normalized.name = 'RequestError';
  normalized.statusCode = statusCode;
  normalized.data = data;
  normalized.url = requestOptions.url;
  normalized.method = requestOptions.method;
  normalized.errMsg = fallback;
  normalized.response = error;
  return normalized;
};

const _requestInternal = async (options) => {
  const {
    url,
    method = 'GET',
    data,
    headers = {},
    skipAuth = false,
    retry = 0,
    timeout,
  } = options || {};

  const baseUrl = getBaseUrl();
  const timeoutMs = Number.isFinite(timeout) && timeout > 0 ? timeout : DEFAULT_TIMEOUT_MS;
  const requestOptions = {
    url: `${baseUrl}${url}`,
    method,
    data,
    header: buildHeaders(headers, skipAuth),
    ...(timeoutMs ? { timeout: timeoutMs } : {}),
  };

  try {
    const response = await wxRequest(requestOptions);

    if (response.statusCode === 401 && !skipAuth) {
      try {
        await _ensureAuth();
      } catch {
        throw _normalizeRequestError(response, requestOptions);
      }
      const retryResponse = await wxRequest({
        ...requestOptions,
        header: buildHeaders(headers, false),
      });
      if (retryResponse.statusCode >= 200 && retryResponse.statusCode < 300) {
        return retryResponse.data;
      }
      throw _normalizeRequestError(retryResponse, requestOptions);
    }

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return response.data;
    }

    throw _normalizeRequestError(response, requestOptions);
  } catch (error) {
    if (retry > 0) {
      return _requestInternal({ ...options, retry: retry - 1 });
    }
    throw _normalizeRequestError(error, requestOptions);
  }
};

const request = async (options) => {
  const { url, method = 'GET', data, dedupe = true } = options || {};

  // POST 请求默认去重（防止快速双击），GET 不去重
  if (!dedupe || method === 'GET') {
    return _requestInternal(options);
  }

  const fingerprint = _requestFingerprint(url, method, data);
  const pending = _pendingRequests.get(fingerprint);
  if (pending) return pending;

  const promise = _requestInternal(options).finally(() => {
    _pendingRequests.delete(fingerprint);
  });

  _pendingRequests.set(fingerprint, promise);
  return promise;
};

/**
 * 将 ArrayBuffer (UTF-8) 解码为字符串。
 * 微信小程序没有 TextDecoder，需要手动解码 UTF-8 多字节序列（中文等）。
 */
const _decodeUTF8 = (arrayBuffer) => {
  const bytes = new Uint8Array(arrayBuffer);
  let result = '';
  let i = 0;
  while (i < bytes.length) {
    const byte = bytes[i];
    let codePoint;
    if (byte < 0x80) {
      codePoint = byte;
      i += 1;
    } else if ((byte & 0xE0) === 0xC0) {
      codePoint = ((byte & 0x1F) << 6) | (bytes[i + 1] & 0x3F);
      i += 2;
    } else if ((byte & 0xF0) === 0xE0) {
      codePoint = ((byte & 0x0F) << 12) | ((bytes[i + 1] & 0x3F) << 6) | (bytes[i + 2] & 0x3F);
      i += 3;
    } else if ((byte & 0xF8) === 0xF0) {
      codePoint = ((byte & 0x07) << 18) | ((bytes[i + 1] & 0x3F) << 12) | ((bytes[i + 2] & 0x3F) << 6) | (bytes[i + 3] & 0x3F);
      i += 4;
    } else {
      // 无效字节，跳过
      codePoint = 0xFFFD;
      i += 1;
    }
    if (codePoint <= 0xFFFF) {
      result += String.fromCharCode(codePoint);
    } else {
      // 代理对（emoji 等 4 字节字符）
      codePoint -= 0x10000;
      result += String.fromCharCode(0xD800 + (codePoint >> 10), 0xDC00 + (codePoint & 0x3FF));
    }
  }
  return result;
};

/**
 * 检查 Uint8Array 末尾是否有不完整的 UTF-8 多字节序列。
 * 返回需要保留到下一个 chunk 的字节数（0 表示完整）。
 */
const _checkUTF8Tail = (bytes) => {
  const len = bytes.length;
  if (!len) return 0;
  let i = len - 1;
  const last = bytes[i];
  if ((last & 0x80) === 0) return 0; // 末尾是 ASCII，完整

  let continuation = 0;
  while (i >= 0 && (bytes[i] & 0xC0) === 0x80) {
    continuation += 1;
    i -= 1;
    if (continuation >= 3) break; // UTF-8 最多 3 个续延字节
  }

  if (i < 0) return Math.min(continuation, len);

  const start = bytes[i];
  let expected = 0;
  if ((start & 0xE0) === 0xC0) expected = 2;
  else if ((start & 0xF0) === 0xE0) expected = 3;
  else if ((start & 0xF8) === 0xF0) expected = 4;
  else if ((start & 0x80) === 0) return 0;
  else return Math.min(continuation, len);

  const available = len - i;
  return available < expected ? available : 0;
};

const _downgradeStreamUrl = (url) => {
  if (typeof url !== 'string') return url;
  return url.replace(/\/stream(?=\?|$)/, '');
};

const _emitParsedSsePayload = (payload, handlers) => {
  const { onMeta, onChunk, onModule, onError } = handlers;
  if (!payload || payload === '[DONE]') return payload === '[DONE]';

  try {
    const parsed = JSON.parse(payload);
    if (parsed.type === 'meta' && onMeta) {
      onMeta(parsed);
    } else if (parsed.type === 'chunk' && onChunk) {
      onChunk(parsed.text || '');
    } else if (parsed.type === 'module' && onModule) {
      onModule(parsed);
    } else if (parsed.type === 'error' && onError) {
      onError(new Error(parsed.message || 'stream error'));
    } else if (parsed.type === 'done') {
      return true;
    }
  } catch {
    if (onChunk) onChunk(payload);
  }

  return false;
};

const _emitFromSseText = (text, handlers) => {
  if (typeof text !== 'string' || !text) return false;
  let sawSseData = false;
  let done = false;

  const lines = text.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || !trimmed.startsWith('data:')) continue;
    sawSseData = true;
    const payload = trimmed.slice(5).trim();
    if (_emitParsedSsePayload(payload, handlers)) {
      done = true;
      break;
    }
  }

  return sawSseData || done;
};

const _emitFromFullJson = (res, handlers) => {
  const { onMeta, onChunk, onModule } = handlers;
  if (!res || typeof res !== 'object') return false;

  if (Object.prototype.hasOwnProperty.call(res, 'content')) {
    if (onMeta) onMeta({ type: 'meta', chart: res.chart, transits: res.transits, chartType: res.chartType, lang: res.lang });
    if (onChunk && res.content !== undefined && res.content !== null) {
      onChunk(typeof res.content === 'string' ? res.content : JSON.stringify(res.content));
    }
    return true;
  }

  if (Object.prototype.hasOwnProperty.call(res, 'forecast')
      || Object.prototype.hasOwnProperty.call(res, 'detail')
      || Object.prototype.hasOwnProperty.call(res, 'chart')) {
    if (onMeta && res.chart) onMeta({ type: 'meta', chart: res.chart, lucky: res.lucky, lang: res.lang });
    if (onModule && res.forecast) onModule({ type: 'module', moduleId: 'forecast', content: res.forecast });
    if (onModule && res.detail) onModule({ type: 'module', moduleId: 'detail', content: res.detail });
    return true;
  }

  if (Object.prototype.hasOwnProperty.call(res, 'coreThemes')
      || Object.prototype.hasOwnProperty.call(res, 'dimension')
      || (res.overview && typeof res.overview === 'object' && Object.prototype.hasOwnProperty.call(res.overview, 'content'))) {
    if (onModule && res.overview) onModule({ type: 'module', moduleId: 'overview', content: res.overview.content || res.overview });
    if (onModule && res.coreThemes) onModule({ type: 'module', moduleId: 'coreThemes', content: res.coreThemes.content || res.coreThemes });
    if (onModule && res.dimension) onModule({ type: 'module', moduleId: 'dimension', content: res.dimension.content || res.dimension });
    return true;
  }

  if (Object.prototype.hasOwnProperty.call(res, 'coreDynamics')
      || Object.prototype.hasOwnProperty.call(res, 'highlights')
      || Object.prototype.hasOwnProperty.call(res, 'chartA')
      || Object.prototype.hasOwnProperty.call(res, 'chartB')
      || Object.prototype.hasOwnProperty.call(res, 'synastryCore')) {
    if (onMeta) onMeta({ type: 'meta', chartA: res.chartA, chartB: res.chartB, synastryCore: res.synastryCore || {}, lang: res.lang });
    if (onModule && res.overview) onModule({ type: 'module', moduleId: 'overview', content: res.overview });
    if (onModule && res.coreDynamics) onModule({ type: 'module', moduleId: 'coreDynamics', content: res.coreDynamics });
    if (onModule && res.highlights) onModule({ type: 'module', moduleId: 'highlights', content: res.highlights });
    return true;
  }

  return false;
};

/**
 * SSE 流式请求
 * @param {Object} options
 * @param {string} options.url - API 路径（如 /api/ask/stream）
 * @param {string} [options.method='POST']
 * @param {Object} [options.data] - 请求体
 * @param {Object} [options.headers]
 * @param {boolean} [options.skipAuth]
 * @param {function} options.onMeta - 收到 meta 事件回调 (data) => void
 * @param {function} options.onChunk - 收到文本 chunk 回调 (text) => void
 * @param {function} [options.onModule] - 收到模块事件回调 (data) => void
 * @param {function} options.onDone - 流式完成回调 () => void
 * @param {function} [options.onError] - 错误回调 (error) => void
 * @returns {{ abort: function }} 可调用 abort() 取消请求
 */
const requestStream = (options) => _requestStreamInternal(options, 0);

const _requestStreamInternal = (options, _retryCount) => {
  const {
    url,
    method = 'POST',
    data,
    headers = {},
    skipAuth = false,
    onMeta,
    onChunk,
    onModule,
    onDone,
    onError,
  } = options || {};

  const retryCount = _retryCount || 0;
  const baseUrl = getBaseUrl();
  const timeoutMs = Number.isFinite(options?.timeout) && options.timeout > 0 ? options.timeout : DEFAULT_STREAM_TIMEOUT_MS;
  let buffer = '';
  let aborted = false;
  let hasEmitted = false; // 是否已向上层输出过数据（防止部分输出后降级导致重复）
  let byteRemainder = null; // UTF-8 多字节字符跨 chunk 时的残留字节

  // handle 对象：外部持有此引用调用 abort()，重试时内部替换 _inner
  const handle = { _inner: null };
  handle.abort = () => {
    aborted = true;
    if (handle._inner && handle._inner.abort) handle._inner.abort();
  };

  // 只要客户端支持 chunked，就优先走原生 wx.request 流式。
  // callContainer 不支持 chunked，会导致流式退化为”长时间等待整包返回”。
  const canChunked = wx.canIUse && wx.canIUse('request.object.enableChunked');

  // 降级到非 stream 端点，走 request()（含 callContainer / 401 重试逻辑）
  const _fallbackToNonStream = () => {
    const fallbackUrl = _downgradeStreamUrl(url);
    request({ url: fallbackUrl, method, data, headers, skipAuth, dedupe: false, timeout: timeoutMs })
      .then((res) => {
        if (aborted) return;
        const handlers = { onMeta, onChunk, onModule, onError };
        const emitted = _emitFromFullJson(res, handlers);
        if (!emitted) {
          const text = typeof res === 'string' ? res : '';
          _emitFromSseText(text, handlers);
        }
        if (!aborted && onDone) onDone();
      })
      .catch((err) => {
        if (!aborted && onError) onError(err);
      });
  };

  if (!canChunked) {
    _fallbackToNonStream();
    return handle;
  }

  const requestTask = wx.request({
    url: `${baseUrl}${url}`,
    method,
    data,
    header: buildHeaders(headers, skipAuth),
    enableChunked: true,
    responseType: 'text',
    timeout: timeoutMs,
    success: (res) => {
      if (aborted) return;
      // 401 自动刷新 token 并重试（最多 1 次，15s 超时保护）
      if (res.statusCode === 401 && !skipAuth && retryCount < 1) {
        let authTimedOut = false;
        const authTimer = setTimeout(() => {
          authTimedOut = true;
          if (!aborted && onError) {
            const err = new Error('Authentication refresh timeout');
            err.statusCode = 401;
            onError(err);
          }
        }, 15000);
        _ensureAuth()
          .then(() => {
            clearTimeout(authTimer);
            if (aborted || authTimedOut) return;
            const retryHandle = _requestStreamInternal(options, retryCount + 1);
            handle._inner = retryHandle;
            if (aborted) retryHandle.abort();
          })
          .catch((authErr) => {
            clearTimeout(authTimer);
            if (authTimedOut) return;
            logger.warn('[requestStream] auth refresh failed:', authErr);
            if (!aborted && onError) {
              const err = new Error(authErr.message || 'Authentication failed');
              err.statusCode = 401;
              err.cause = authErr;
              onError(err);
            }
          });
        return;
      }
      // 非 2xx 状态码（如 403 配额不足）需要触发 onError，否则页面永远卡在 loading
      if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300) && onError) {
        const errData = typeof res.data === 'string' ? (() => { try { return JSON.parse(res.data); } catch(_) { return {}; } })() : (res.data || {});
        const err = new Error(errData.error || `HTTP ${res.statusCode}`);
        err.statusCode = res.statusCode;
        err.data = errData;
        onError(err);
      }
    },
    fail: (err) => {
      if (aborted) return;
      if (hasEmitted) {
        // 已有部分数据输出，降级会导致重复，直接报错
        if (onError) onError(err);
        return;
      }
      // wx.request 失败（域名白名单、网络异常等），降级到非 stream 端点走 callContainer
      logger.warn('[requestStream] chunked request failed, fallback to non-stream:', err.errMsg || err);
      _fallbackToNonStream();
    },
  });

  handle._inner = requestTask;

  requestTask.onChunkReceived((res) => {
    if (aborted) return;
    // res.data 是 ArrayBuffer (UTF-8)，需要正确解码中文
    // 处理 UTF-8 多字节字符跨 chunk 边界的情况
    let bytes = new Uint8Array(res.data);
    if (byteRemainder) {
      const merged = new Uint8Array(byteRemainder.length + bytes.length);
      merged.set(byteRemainder);
      merged.set(bytes, byteRemainder.length);
      bytes = merged;
      byteRemainder = null;
    }
    // 检查末尾是否有不完整的 UTF-8 序列
    const tailCheck = _checkUTF8Tail(bytes);
    let decodable = bytes;
    if (tailCheck > 0) {
      byteRemainder = bytes.slice(bytes.length - tailCheck);
      decodable = bytes.slice(0, bytes.length - tailCheck);
    }
    const text = _decodeUTF8(decodable.buffer ? decodable.buffer : decodable);

    buffer += text;
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;

      const payload = trimmed.slice(6);
      if (payload === '[DONE]') {
        if (onDone) onDone();
        return;
      }

      try {
        const parsed = JSON.parse(payload);
        if (parsed.type === 'meta' && onMeta) {
          hasEmitted = true;
          onMeta(parsed);
        } else if (parsed.type === 'chunk' && onChunk) {
          hasEmitted = true;
          onChunk(parsed.text);
        } else if (parsed.type === 'module') {
          hasEmitted = true;
          if (onModule) onModule(parsed);
        } else if (parsed.type === 'done') {
          if (onDone) onDone(parsed);
        } else if (parsed.type === 'error' && onError) {
          onError(new Error(parsed.message));
        }
      } catch {
        // 忽略无法解析的行
      }
    }
  });

  return handle;
};

module.exports = {
  request,
  requestStream,
  refreshAccessToken,
  getBaseUrl,
};
