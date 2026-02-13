const storage = require('../../utils/storage');
const auth = require('../../utils/auth');
const { request } = require('../../utils/request');

Page({
  data: {
    auditMode: false,
    userProfile: {},
    avatarUrl: '',
    isLoggedIn: false,
    authLoading: false,
    statusBarHeight: 20,
  },

  onLoad() {
    const sysInfo = wx.getSystemInfoSync();
    this.setData({
      statusBarHeight: sysInfo.statusBarHeight,
    });
  },

  onShow() {
    const app = getApp();
    if (app && app.globalData) {
      this.setData({ auditMode: !!app.globalData.auditMode });
    }
    if (app && typeof app.notifyTabActivated === 'function') {
      app.notifyTabActivated('me');
    }
    this.loadUserProfile();
  },

  loadUserProfile() {
    const profile = storage.get('user_profile') || {
      name: '星语用户',
      points: 0,
      reportCount: 0,
      matchCount: 0,
      isVip: false,
      vipExpireDate: '',
    };

    // 从本地存储读取分析记录数量
    const synastryRecords = storage.get('synastry_records') || [];
    profile.matchCount = Array.isArray(synastryRecords) ? synastryRecords.length : 0;

    const avatarUrl = storage.get('user_avatar') || '';
    const isLoggedIn = Boolean(storage.get('access_token'));
    this.setData({
      userProfile: profile,
      avatarUrl,
      isLoggedIn,
    });

    // 尝试从后端同步最新数据
    if (isLoggedIn) {
      this.syncProfile();
    }
  },

  async syncProfile() {
    try {
      const res = await request({ url: '/api/user/profile' });
      if (res) {
        const profile = storage.get('user_profile') || {};
        profile.name = res.name || profile.name;
        profile.points = res.points !== undefined ? res.points : profile.points;
        profile.isVip = res.isVip !== undefined ? res.isVip : profile.isVip;
        profile.vipExpireDate = res.vipExpireDate || profile.vipExpireDate;
        profile.reportCount = res.reportCount !== undefined ? res.reportCount : (profile.reportCount || 0);

        // 从本地存储读取分析记录数量
        const synastryRecords = storage.get('synastry_records') || [];
        profile.matchCount = Array.isArray(synastryRecords) ? synastryRecords.length : 0;

        storage.set('user_profile', profile);
        if (res.avatarUrl) {
          storage.set('user_avatar', res.avatarUrl);
        }
        this.setData({
          userProfile: profile,
          avatarUrl: res.avatarUrl || this.data.avatarUrl,
        });
      }
    } catch (err) {
      // 静默失败，使用本地数据
    }
  },

  handleLogin() {
    if (this.data.authLoading) return;
    this.setData({ authLoading: true });
    wx.getUserProfile({
      desc: '用于完善个人资料与报告展示',
      success: async (res) => {
        try {
          const data = await auth.login(res.userInfo);
          const previousProfile = storage.get('user_profile') || {};
          const mergedProfile = {
            ...previousProfile,
            name: (data && data.user && data.user.name) || res.userInfo.nickName || previousProfile.name || '',
          };
          storage.set('user_profile', mergedProfile);
          if (res.userInfo.avatarUrl) {
            storage.set('user_avatar', res.userInfo.avatarUrl);
          }
          this.setData({
            userProfile: mergedProfile,
            avatarUrl: res.userInfo.avatarUrl || this.data.avatarUrl,
            isLoggedIn: true,
            authLoading: false,
          });
          wx.showToast({ title: '登录成功', icon: 'success' });
        } catch (error) {
          this.setData({ authLoading: false });
          wx.showToast({ title: '登录失败', icon: 'none' });
        }
      },
      fail: () => {
        this.setData({ authLoading: false });
      },
    });
  },

  goToProfile() {
    wx.navigateTo({ url: '/pages/profile/profile' });
  },

  goToSubscription() {
    wx.navigateTo({ url: '/pages/subscription/subscription' });
  },

  goToPoints() {
    wx.navigateTo({ url: '/pages/points/points' });
  },

  goToReports() {
    wx.navigateTo({ url: '/pages/reports/reports' });
  },

  goToRecords() {
    wx.navigateTo({ url: '/pages/records/records' });
  },

  handleEditBirthInfo() {
    wx.navigateTo({ url: '/pages/onboarding/onboarding?mode=edit' });
  },

  goToOrders() {
    wx.navigateTo({ url: '/pages/orders/orders' });
  },

  goToAgreement(e) {
    const type = e.currentTarget.dataset.type || 'terms';
    wx.navigateTo({ url: `/pages/agreement/agreement?type=${type}` });
  },

  handleDeleteAccount() {
    wx.showModal({
      title: '注销账号',
      content: '注销后您的所有数据（包括分析报告、会员权益、积分余额）将被清除且无法恢复。请在输入框中输入"确认注销"以继续。',
      editable: true,
      placeholderText: '请输入"确认注销"',
      confirmText: '注销',
      confirmColor: '#8B0000',
      success: async (res) => {
        if (res.confirm) {
          if (res.content !== '确认注销') {
            wx.showToast({ title: '输入内容不正确', icon: 'none' });
            return;
          }
          try {
            await request({
              url: '/api/user/delete-account',
              method: 'DELETE',
              data: { confirmText: '确认注销' },
            });
            // 清除本地缓存
            auth.logout();
            storage.remove('user_profile');
            storage.remove('user_avatar');
            wx.showToast({ title: '账号已注销', icon: 'success' });
            setTimeout(() => {
              wx.reLaunch({ url: '/pages/onboarding/onboarding' });
            }, 1500);
          } catch (err) {
            wx.showToast({ title: '注销失败，请重试', icon: 'none' });
          }
        }
      },
    });
  },

  handleLogout() {
    wx.showModal({
      title: '确认退出',
      content: '退出登录后部分数据将无法同步',
      confirmText: '退出',
      confirmColor: '#333',
      success: (res) => {
        if (res.confirm) {
          auth.logout();
          storage.remove('user_profile');
          storage.remove('user_avatar');
          this.setData({
            userProfile: {},
            avatarUrl: '',
            isLoggedIn: false,
          });
          wx.showToast({ title: '已退出登录', icon: 'success' });
        }
      },
    });
  },
});
