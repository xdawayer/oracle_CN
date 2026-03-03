const storage = require('./storage');
const logger = require('./logger');

const DEFAULT_BASE_URL = 'https://express-wb6g-225568-8-1404386472.sh.run.tcloudbase.com';
// 本地开发时使用本地后端，扫码真机预览需使用云托管地址
const DEFAULT_DEV_BASE_URL = DEFAULT_BASE_URL; // 原值 'http://127.0.0.1:3001'，改为使用云托管地址
const DEFAULT_TIMEOUT_MS = 30000;


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

const CLOUD_TIMEOUT_MS = 12000; // 云托管默认最多等 12 秒（留够冷启动时间），超时即降级
const CLOUD_TIMEOUT_MAX_MS = 120000; // 长耗时请求（如 AI 生成）云托管最多等 120 秒

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

    // 云调用超时保护：根据请求 timeout 自适应，长耗时请求给予更多时间
    const reqTimeout = Number.isFinite(options.timeout) && options.timeout > 0 ? options.timeout : DEFAULT_TIMEOUT_MS;
    const cloudTimeout = Math.max(CLOUD_TIMEOUT_MS, Math.min(Math.floor(reqTimeout * 0.9), CLOUD_TIMEOUT_MAX_MS));
    const timer = setTimeout(() => fallback('timeout'), cloudTimeout);

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

module.exports = {
  request,
  refreshAccessToken,
  getBaseUrl,
};
