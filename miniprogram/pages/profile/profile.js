const { request, getBaseUrl } = require('../../utils/request');
const storage = require('../../utils/storage');
const logger = require('../../utils/logger');

Page({
  data: {
    name: '',
    avatarUrl: '',
    birthDate: '2000-01-01',
    birthTime: '12:00',
    birthCity: '北京, 中国',
    hasChanges: false,
    originalData: {},
    showDatePicker: false,
    showTimePicker: false,
  },

  onLoad() {
    this.loadProfile();
  },

  async loadProfile() {
    // 先从本地缓存加载
    const cached = storage.get('user_profile') || {};
    const avatarUrl = storage.get('user_avatar') || '';
    const birthInfo = storage.get('astro_user') || {};

    this.setData({
      name: cached.name || '',
      avatarUrl: avatarUrl,
      birthDate: birthInfo.birthDate || '2000-01-01',
      birthTime: birthInfo.birthTime || '12:00',
      birthCity: birthInfo.birthCity || '北京, 中国',
      originalData: {
        name: cached.name || '',
        avatarUrl: avatarUrl,
        birthDate: birthInfo.birthDate || '2000-01-01',
        birthTime: birthInfo.birthTime || '12:00',
        birthCity: birthInfo.birthCity || '北京, 中国',
      },
    });

    // 尝试从后端获取最新数据
    try {
      const res = await request({ url: '/api/user/profile' });
      if (res) {
        this.setData({
          name: res.name || this.data.name,
          avatarUrl: res.avatarUrl || this.data.avatarUrl,
          birthDate: res.birthDate || this.data.birthDate,
          birthTime: res.birthTime || this.data.birthTime,
          birthCity: res.birthCity || this.data.birthCity,
          originalData: {
            name: res.name || this.data.name,
            avatarUrl: res.avatarUrl || this.data.avatarUrl,
            birthDate: res.birthDate || this.data.birthDate,
            birthTime: res.birthTime || this.data.birthTime,
            birthCity: res.birthCity || this.data.birthCity,
          },
        });
      }
    } catch (err) {
      // 使用本地数据
    }
  },

  checkChanges() {
    const { name, avatarUrl, birthDate, birthTime, birthCity, originalData } = this.data;
    const hasChanges = name !== originalData.name ||
      avatarUrl !== originalData.avatarUrl ||
      birthDate !== originalData.birthDate ||
      birthTime !== originalData.birthTime ||
      birthCity !== originalData.birthCity;
    this.setData({ hasChanges });
  },

  onChooseAvatar() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        this.setData({ avatarUrl: tempFilePath });
        this.checkChanges();
      },
    });
  },

  onEditName() {
    wx.showModal({
      title: '修改昵称',
      editable: true,
      placeholderText: '请输入昵称',
      content: this.data.name,
      success: (res) => {
        if (res.confirm && res.content) {
          this.setData({ name: res.content.trim() });
          this.checkChanges();
        }
      },
    });
  },

  onEditBirthDate() {
    // 使用 picker 组件
    this.setData({ showDatePicker: true });
    // picker 需要用户点击触发，这里通过编程方式不可行
    // 改用 wx.showActionSheet 或内联 picker
  },

  onDateChange(e) {
    this.setData({ birthDate: e.detail.value, showDatePicker: false });
    this.checkChanges();
  },

  onEditBirthTime() {
    this.setData({ showTimePicker: true });
  },

  onTimeChange(e) {
    this.setData({ birthTime: e.detail.value, showTimePicker: false });
    this.checkChanges();
  },

  onEditBirthCity() {
    // 跳转到 onboarding 的编辑模式
    wx.navigateTo({
      url: '/pages/onboarding/onboarding?mode=editCity',
      events: {
        selectCity: (data) => {
          if (data && data.city) {
            this.setData({ birthCity: data.city });
            this.checkChanges();
          }
        },
      },
    });
  },

  async onSave() {
    if (!this.data.hasChanges) return;

    wx.showLoading({ title: '保存中' });

    try {
      // 头像处理
      // 微信登录头像 URL 是永久的，可直接存储
      // 本地临时文件（wxfile://）需要上传到云存储才能持久化
      let avatarUrl = this.data.avatarUrl;
      const isLocalTemp = avatarUrl && (avatarUrl.startsWith('wxfile://') || avatarUrl.startsWith('http://tmp'));

      if (isLocalTemp) {
        // 通过后端接口上传头像文件
        try {
          const uploadRes = await new Promise((resolve, reject) => {
            wx.uploadFile({
              url: getBaseUrl() + '/api/user/avatar/upload',
              filePath: avatarUrl,
              name: 'file',
              header: {
                Authorization: `Bearer ${storage.get('access_token')}`,
              },
              success: (res) => {
                try {
                  resolve(JSON.parse(res.data));
                } catch (e) {
                  reject(e);
                }
              },
              fail: reject,
            });
          });
          if (uploadRes && uploadRes.url) {
            avatarUrl = uploadRes.url;
          }
        } catch (err) {
          // 上传失败，保留原有头像
          avatarUrl = this.data.originalData.avatarUrl || avatarUrl;
        }
      } else if (avatarUrl && avatarUrl !== this.data.originalData.avatarUrl) {
        // 非本地临时文件（如微信头像 URL），直接同步到后端
        try {
          await request({
            url: '/api/user/avatar',
            method: 'POST',
            data: { avatarUrl },
          });
        } catch (err) {
          // 头像同步失败不阻断保存
        }
      }

      // 保存资料
      await request({
        url: '/api/user/profile',
        method: 'PUT',
        data: {
          name: this.data.name,
          birthDate: this.data.birthDate,
          birthTime: this.data.birthTime,
          birthCity: this.data.birthCity,
        },
      });

      // 更新本地缓存
      const profile = storage.get('user_profile') || {};
      profile.name = this.data.name;
      storage.set('user_profile', profile);
      storage.set('user_avatar', avatarUrl);

      const astroUser = storage.get('astro_user') || {};
      astroUser.birthDate = this.data.birthDate;
      astroUser.birthTime = this.data.birthTime;
      astroUser.birthCity = this.data.birthCity;
      storage.set('astro_user', astroUser);

      this.setData({
        hasChanges: false,
        originalData: {
          name: this.data.name,
          avatarUrl: this.data.avatarUrl,
          birthDate: this.data.birthDate,
          birthTime: this.data.birthTime,
          birthCity: this.data.birthCity,
        },
      });

      wx.hideLoading();
      wx.showToast({ title: '保存成功', icon: 'success' });

      setTimeout(() => {
        wx.navigateBack();
      }, 800);
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '保存失败', icon: 'none' });
    }
  },
});
