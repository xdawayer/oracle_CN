const storage = require('./storage');
const { request, refreshAccessToken } = require('./request');

const setTokens = (tokens) => {
  if (!tokens) return;
  if (tokens.accessToken) storage.set('access_token', tokens.accessToken);
  if (tokens.refreshToken) storage.set('refresh_token', tokens.refreshToken);
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

const login = async (userInfo) => {
  const loginResult = await wx.login();
  if (!loginResult || !loginResult.code) {
    throw new Error('WeChat login failed');
  }

  const data = await request({
    url: '/api/auth/wechat',
    method: 'POST',
    data: {
      code: loginResult.code,
      userInfo: userInfo || undefined,
    },
    skipAuth: true,
  });

  const tokens = normalizeTokens(data);
  if (!tokens || !tokens.accessToken) {
    throw new Error('WeChat login failed');
  }
  setTokens(tokens);
  return data;
};

const getToken = () => storage.get('access_token');

const getRefreshToken = () => storage.get('refresh_token');

const refreshToken = async () => {
  const token = await refreshAccessToken();
  return token;
};

// 确保已登录：已有 token 返回 true，否则重试 login 并返回登录数据，失败返回 false
const ensureLogin = async (retries = 2) => {
  if (storage.get('access_token')) return true;

  for (let i = 0; i <= retries; i++) {
    try {
      const data = await login();
      return data || true;
    } catch {
      if (i < retries) await new Promise(r => setTimeout(r, 1000));
    }
  }
  return false;
};

const logout = () => {
  storage.clearTokens();
};

module.exports = {
  login,
  ensureLogin,
  getToken,
  getRefreshToken,
  refreshToken,
  logout,
};
