const storage = require('../../utils/storage');
const auth = require('../../utils/auth');

const ROUTE_TITLES = {
  editProfile: '个人资料',
  subscription: 'VIP 会员',
  pointsRecharge: '积分充值',
  reports: '我的报告',
  records: '合盘记录',
  settings: '偏好设置',
  help: '帮助与反馈',
};

const NAVIGATE_ROUTES = {
  reports: '/pages/reports/reports',
  records: '/pages/records/records',
};

Page({
  data: {
    currentRoute: 'menu',
    routeTitle: '',
    userProfile: {},
    avatarUrl: '',
    isLoggedIn: false,
    authLoading: false,
    statusBarHeight: 20,
  },

  onLoad() {
    const sysInfo = wx.getSystemInfoSync();
    this.setData({
      statusBarHeight: sysInfo.statusBarHeight
    });
  },

  onShow() {
    this.loadUserProfile();
  },

  loadUserProfile() {
    const profile = storage.get('user_profile') || {
      name: 'Astrology Fan',
      points: 8422,
      reportCount: 12,
      matchCount: 5,
      isVip: true,
      vipExpireDate: '2026-12-31'
    };
    const avatarUrl = storage.get('user_avatar') || 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0';
    const isLoggedIn = Boolean(storage.get('access_token'));
    this.setData({
      userProfile: profile,
      avatarUrl,
      isLoggedIn,
    });
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

  handleNav(e) {
    const route = e.currentTarget.dataset.route;
    if (!route) return;
    if (NAVIGATE_ROUTES[route]) {
      wx.navigateTo({ url: NAVIGATE_ROUTES[route] });
      return;
    }
    this.setData({
      currentRoute: route,
      routeTitle: ROUTE_TITLES[route] || '',
    });
  },

  handleBack() {
    this.setData({
      currentRoute: 'menu',
      routeTitle: '',
    });
  },

  handleLogout() {
    auth.logout();
    storage.remove('user_profile');
    storage.remove('user_avatar');
    this.setData({
      currentRoute: 'menu',
      routeTitle: '',
      userProfile: {},
      avatarUrl: '',
      isLoggedIn: false,
    });
    wx.showToast({
      title: '已退出登录',
      icon: 'success',
    });
  },
});
