const storage = require('./storage');

const DEFAULT_BASE_URL = 'https://express-wb6g-225568-8-1404386472.sh.run.tcloudbase.com';
const DEFAULT_DEV_BASE_URL = 'http://127.0.0.1:3001';
const DEFAULT_TIMEOUT_MS = 120000;

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

const wxRequest = (options) => new Promise((resolve, reject) => {
  wx.request({
    ...options,
    success: resolve,
    fail: reject,
  });
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
      await refreshAccessToken();
      const retryResponse = await wxRequest({
        ...requestOptions,
        header: buildHeaders(headers, false),
      });
      if (retryResponse.statusCode >= 200 && retryResponse.statusCode < 300) {
        return retryResponse.data;
      }
      throw retryResponse;
    }

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return response.data;
    }

    throw response;
  } catch (error) {
    if (retry > 0) {
      return _requestInternal({ ...options, retry: retry - 1 });
    }
    throw error;
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
const requestStream = (options) => {
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

  const baseUrl = getBaseUrl();
  const timeoutMs = Number.isFinite(options?.timeout) && options.timeout > 0 ? options.timeout : DEFAULT_TIMEOUT_MS;
  let buffer = '';
  let aborted = false;
  let byteRemainder = null; // UTF-8 多字节字符跨 chunk 时的残留字节

  // 检查是否支持 enableChunked（基础库 2.20.1+）
  const canChunked = wx.canIUse && wx.canIUse('request.object.enableChunked');

  if (!canChunked) {
    // 降级：普通非流式请求（跳过去重，避免与流式请求冲突）
    request({ url, method, data, headers, skipAuth, dedupe: false })
      .then((res) => {
        if (res && res.content) {
          if (onMeta) onMeta({ type: 'meta', chart: res.chart, transits: res.transits, chartType: res.chartType, lang: res.lang });
          if (onChunk) onChunk(typeof res.content === 'string' ? res.content : JSON.stringify(res.content));
          if (onDone) onDone();
        }
      })
      .catch((err) => {
        if (onError) onError(err);
      });
    return { abort: () => {} };
  }

  const requestTask = wx.request({
    url: `${baseUrl}${url}`,
    method,
    data,
    header: buildHeaders(headers, skipAuth),
    enableChunked: true,
    responseType: 'text',
    timeout: timeoutMs,
    success: () => {},
    fail: (err) => {
      if (!aborted && onError) onError(err);
    },
  });

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
          onMeta(parsed);
        } else if (parsed.type === 'chunk' && onChunk) {
          onChunk(parsed.text);
        } else if (parsed.type === 'module') {
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

  return {
    abort: () => {
      aborted = true;
      if (requestTask && requestTask.abort) requestTask.abort();
    },
  };
};

module.exports = {
  request,
  requestStream,
  refreshAccessToken,
  getBaseUrl,
};
