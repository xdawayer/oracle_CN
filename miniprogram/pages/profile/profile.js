const { request } = require('../../utils/request');
const storage = require('../../utils/storage');
const logger = require('../../utils/logger');
const avatarBehavior = require('../../behaviors/avatar');

const NAME_CHARS = '星月云风雪晨夏秋瑶琳萱语梦溪岚霜璃羽翼灵芷蕊瑾璇沐澜清若曦妤熙彤昕婉悦涵筱宁恬雅柔芸茉苒忆安然初墨黛素尘烟';

function generateRandomName() {
  const len = 2 + Math.floor(Math.random() * 3); // 2-4个字
  let name = '';
  for (let i = 0; i < len; i++) {
    name += NAME_CHARS[Math.floor(Math.random() * NAME_CHARS.length)];
  }
  return name;
}

const ZODIAC_ICONS = [
  { url: '/images/astro-symbols/aries.png', label: '白羊' },
  { url: '/images/astro-symbols/taurus.png', label: '金牛' },
  { url: '/images/astro-symbols/gemini.png', label: '双子' },
  { url: '/images/astro-symbols/cancer.png', label: '巨蟹' },
  { url: '/images/astro-symbols/leo.png', label: '狮子' },
  { url: '/images/astro-symbols/virgo.png', label: '处女' },
  { url: '/images/astro-symbols/libra.png', label: '天秤' },
  { url: '/images/astro-symbols/scorpio.png', label: '天蝎' },
  { url: '/images/astro-symbols/sagittarius.png', label: '射手' },
  { url: '/images/astro-symbols/capricorn.png', label: '摩羯' },
  { url: '/images/astro-symbols/aquarius.png', label: '水瓶' },
  { url: '/images/astro-symbols/pisces.png', label: '双鱼' },
];

Page({
  behaviors: [avatarBehavior],
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
    showAvatarPicker: false,
    avatarOptions: [],
    showNameEditor: false,
    editingName: '',
  },

  onLoad(options) {
    // 头像选项：微信头像（如有缓存）+ 预设星座头像
    const wechatAvatar = storage.get('wechat_avatar') || '';
    const avatarOptions = [];
    if (wechatAvatar) {
      avatarOptions.push({ url: wechatAvatar, label: '微信' });
    }
    avatarOptions.push(...ZODIAC_ICONS);
    this.setData({ avatarOptions });
    this._focusField = options.focus || '';
    this.loadProfile();
  },

  async loadProfile() {
    // 先从本地缓存加载
    const cached = storage.get('user_profile') || {};
    const avatarUrl = storage.get('user_avatar') || '';
    const birthInfo = storage.get('astro_user') || {};

    const name = cached.name || generateRandomName();

    this.setData({
      name: name,
      avatarUrl: avatarUrl,
      birthDate: birthInfo.birthDate || '2000-01-01',
      birthTime: birthInfo.birthTime || '12:00',
      birthCity: birthInfo.birthCity || '北京, 中国',
      originalData: {
        name: name,
        avatarUrl: avatarUrl,
        birthDate: birthInfo.birthDate || '2000-01-01',
        birthTime: birthInfo.birthTime || '12:00',
        birthCity: birthInfo.birthCity || '北京, 中国',
      },
    });

    // 如果昵称是新生成的，保存到缓存
    if (!cached.name) {
      const profile = storage.get('user_profile') || {};
      profile.name = name;
      storage.set('user_profile', profile);
    }

    // 尝试从后端获取最新数据
    try {
      const res = await request({ url: '/api/user/profile' });
      if (res) {
        const serverName = res.name || this.data.name;
        const hasAvatarField = Object.prototype.hasOwnProperty.call(res, 'avatarUrl');
        const serverAvatar = hasAvatarField ? (res.avatarUrl || '') : this.data.avatarUrl;
        // 出生信息优先使用本地缓存（后端可能有编码问题）
        const localBirthDate = this.data.birthDate;
        const localBirthTime = this.data.birthTime;
        const localBirthCity = this.data.birthCity;
        const finalBirthDate = localBirthDate !== '2000-01-01' ? localBirthDate : (res.birthDate || localBirthDate);
        const finalBirthTime = localBirthTime !== '12:00' ? localBirthTime : (res.birthTime || localBirthTime);
        const finalBirthCity = localBirthCity !== '北京, 中国' ? localBirthCity : (res.birthCity || localBirthCity);
        this.setData({
          name: serverName,
          avatarUrl: serverAvatar,
          birthDate: finalBirthDate,
          birthTime: finalBirthTime,
          birthCity: finalBirthCity,
          originalData: {
            name: serverName,
            avatarUrl: serverAvatar,
            birthDate: finalBirthDate,
            birthTime: finalBirthTime,
            birthCity: finalBirthCity,
          },
        });
        if (hasAvatarField) {
          if (serverAvatar) {
            storage.set('user_avatar', serverAvatar);
          } else {
            storage.remove('user_avatar');
          }
        }
      }
    } catch (err) {
      // 使用本地数据
    }

    // 从"我的"页面跳转过来时，自动触发城市编辑
    if (this._focusField === 'birthCity') {
      this._focusField = '';
      setTimeout(() => this.onEditBirthCity(), 300);
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
    this.setData({ showAvatarPicker: true });
  },

  onChooseWechatAvatar(e) {
    const { avatarUrl } = e.detail;
    if (!avatarUrl) return;

    const savedPath = `${wx.env.USER_DATA_PATH}/wechat_avatar.jpg`;
    try {
      const fs = wx.getFileSystemManager();
      try { fs.unlinkSync(savedPath); } catch (_) { /* ignore */ }
      fs.saveFileSync(avatarUrl, savedPath);
      storage.set('wechat_avatar', savedPath);
      this.setData({ avatarUrl: savedPath, showAvatarPicker: false });
    } catch (err) {
      this.setData({ avatarUrl, showAvatarPicker: false });
    }
    this.checkChanges();

    // 更新头像选项列表，确保微信头像在首位
    const opts = this.data.avatarOptions.filter(item => item.label !== '微信');
    opts.unshift({ url: this.data.avatarUrl, label: '微信' });
    this.setData({ avatarOptions: opts });
  },

  onSelectAvatar(e) {
    const url = e.currentTarget.dataset.url;
    this.setData({
      avatarUrl: url,
      showAvatarPicker: false,
    });
    this.checkChanges();
  },

  onCloseAvatarPicker() {
    this.setData({ showAvatarPicker: false });
  },

  // 覆盖 avatarBehavior 的默认实现，额外标记 hasChanges
  onAvatarLoadError() {
    // 首次失败可能是瞬时网络抖动，重试一次
    if (!this.data._avatarRetried && this.data.avatarUrl) {
      this.setData({ _avatarRetried: true });
      const url = this.data.avatarUrl;
      this.setData({ avatarUrl: '' });
      setTimeout(() => {
        this.setData({ avatarUrl: url });
      }, 1000);
      return;
    }
    storage.remove('user_avatar');
    if (this.data.avatarUrl) {
      this.setData({ avatarUrl: '', hasChanges: true, _avatarRetried: false });
    }
  },

  onNoop() {},

  onEditName() {
    this.setData({ showNameEditor: true, editingName: this.data.name });
  },

  onNameInput(e) {
    this.setData({ editingName: e.detail.value });
  },

  onNicknameReview() {
    // 微信昵称审核回调，无需额外处理
  },

  onConfirmName() {
    const name = (this.data.editingName || '').trim();
    if (name) {
      this.setData({ name, showNameEditor: false });
      this.checkChanges();
    } else {
      this.setData({ showNameEditor: false });
    }
  },

  onCloseNameEditor() {
    this.setData({ showNameEditor: false });
  },

  onDateChange(e) {
    this.setData({ birthDate: e.detail.value });
    this.checkChanges();
  },

  onTimeChange(e) {
    this.setData({ birthTime: e.detail.value });
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
      let avatarUrl = this.data.avatarUrl;

      // 头像变更时同步到后端（URL或本地路径直接同步，不需要上传文件）
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
      if (avatarUrl) {
        storage.set('user_avatar', avatarUrl);
      } else {
        storage.remove('user_avatar');
      }

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
