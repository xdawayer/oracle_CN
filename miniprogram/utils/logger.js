/**
 * 统一日志工具
 * 开发环境输出所有日志，生产环境仅保留 error
 */
const getEnvVersion = () => {
  try {
    if (!wx.getAccountInfoSync) return 'develop';
    const info = wx.getAccountInfoSync();
    return info && info.miniProgram ? info.miniProgram.envVersion : 'develop';
  } catch (e) {
    return 'develop';
  }
};

const isDev = getEnvVersion() === 'develop';

const logger = {
  log(...args) {
    if (isDev) console.log(...args);
  },
  warn(...args) {
    if (isDev) console.warn(...args);
  },
  error(...args) {
    console.error(...args);
  },
};

module.exports = logger;
module.exports.isDev = isDev;
module.exports.getEnvVersion = getEnvVersion;
