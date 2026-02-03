const { request } = require('../../utils/request');
const storage = require('../../utils/storage');

Page({
  data: {
    name: '',
    avatarUrl: '',
    birthDate: '',
    birthTime: '',
    birthCity: '',
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
      birthDate: birthInfo.birthDate || '',
      birthTime: birthInfo.birthTime || '',
      birthCity: birthInfo.birthCity || '',
      originalData: {
        name: cached.name || '',
        avatarUrl: avatarUrl,
        birthDate: birthInfo.birthDate || '',
        birthTime: birthInfo.birthTime || '',
        birthCity: birthInfo.birthCity || '',
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
        // 尝试使用微信云存储上传（如果已配置）
        try {
          if (wx.cloud) {
            const cloudRes = await wx.cloud.uploadFile({
              cloudPath: `avatars/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`,
              filePath: avatarUrl,
            });
            if (cloudRes.fileID) {
              avatarUrl = cloudRes.fileID;
            }
          }
        } catch (err) {
          // 云存储未配置或上传失败，使用原有头像
          console.warn('头像上传失败，将保留原有头像:', err);
          avatarUrl = this.data.originalData.avatarUrl || avatarUrl;
        }
      }

      // 同步头像 URL 到后端
      if (avatarUrl && avatarUrl !== this.data.originalData.avatarUrl) {
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
