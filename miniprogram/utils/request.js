const storage = require('./storage');

const DEFAULT_BASE_URL = 'https://api.astromind.com';
const DEFAULT_DEV_BASE_URL = 'http://127.0.0.1:3001';

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
  const authHeader = !skipAuth && token ? { Authorization: `Bearer ${token}` } : {};
  return {
    'Content-Type': 'application/json',
    ...authHeader,
    ...headers,
  };
};

const request = async (options) => {
  const {
    url,
    method = 'GET',
    data,
    headers = {},
    skipAuth = false,
    retry = 0,
  } = options || {};

  const baseUrl = getBaseUrl();
  const requestOptions = {
    url: `${baseUrl}${url}`,
    method,
    data,
    header: buildHeaders(headers, skipAuth),
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
      return request({ ...options, retry: retry - 1 });
    }
    throw error;
  }
};

module.exports = {
  request,
  refreshAccessToken,
  getBaseUrl,
};
