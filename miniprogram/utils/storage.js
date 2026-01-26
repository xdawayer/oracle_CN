const get = (key, defaultValue = null) => {
  try {
    const value = wx.getStorageSync(key);
    if (value === '' || value === undefined) {
      return defaultValue;
    }
    return value;
  } catch {
    return defaultValue;
  }
};

const set = (key, value) => {
  try {
    wx.setStorageSync(key, value);
  } catch {
    return false;
  }
  return true;
};

const remove = (key) => {
  try {
    wx.removeStorageSync(key);
  } catch {
    return false;
  }
  return true;
};

const clearTokens = () => {
  remove('access_token');
  remove('refresh_token');
};

module.exports = {
  get,
  set,
  remove,
  clearTokens,
};
