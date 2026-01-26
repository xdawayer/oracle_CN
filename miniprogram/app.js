const auth = require('./utils/auth');
const storage = require('./utils/storage');

App({
  onLaunch() {
    const updateManager = wx.getUpdateManager()

    updateManager.onCheckForUpdate(function (res) {
    })

    updateManager.onUpdateReady(function () {
      wx.showModal({
        title: 'Update Ready',
        content: 'A new version is ready. Restart?',
        success: function (res) {
          if (res.confirm) {
            updateManager.applyUpdate()
          }
        }
      })
    })

    this.autoLogin();
  },
  async autoLogin() {
    const refreshToken = storage.get('refresh_token');
    if (refreshToken) {
      try {
        await auth.refreshToken();
        return;
      } catch {
        storage.clearTokens();
      }
    }

    try {
      const data = await auth.login();
      if (data && data.user) {
        const previousProfile = storage.get('user_profile') || {};
        const mergedProfile = {
          ...previousProfile,
          name: data.user.name || previousProfile.name || '',
        };
        storage.set('user_profile', mergedProfile);
        if (data.user.avatar) {
          storage.set('user_avatar', data.user.avatar);
        }
      }
    } catch {
    }
  },
  globalData: {
    userInfo: null,
    theme: 'dark' 
  }
})
