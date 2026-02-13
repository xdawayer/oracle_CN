const storage = require('../../utils/storage');
const { request } = require('../../utils/request');
const { searchCities, formatCityDisplay, getCityCoordinates } = require('../../utils/city-search');
const logger = require('../../utils/logger');

const CALENDAR_TYPES = [
  { value: 'solar', label: '阳历/公历' },
  { value: 'lunar', label: '农历' }
];
const CITY_PLACEHOLDER = '输入城市名称、拼音或首字母';

Page({
  data: {
    step: 1,
    isEditMode: false,

    // 步骤一数据
    calendarTypes: CALENDAR_TYPES,
    calendarTypeIndex: 0,
    birthDate: '2000-01-01',
    birthTime: '12:00',
    timeUncertain: false,
    maxDate: '',

    // 农历转换后的公历日期（阳历模式下与 birthDate 同步）
    solarBirthDate: '2000-01-01',

    // 步骤二数据
    cityInput: '北京, 中国',
    cityPlaceholder: CITY_PLACEHOLDER,
    cityResults: [],
    selectedCity: { id: 'beijing', name: '北京', province: '北京', country: '中国', lat: 39.9042, lon: 116.4074, displayText: '北京, 中国', timezone: '8' },
    showCityDropdown: false,

    // 状态
    loading: false,
    loadingText: '处理中...',
    canProceed: false,
    agreedTerms: false
  },

  // 搜索防抖定时器（不放在 data 中）
  searchTimer: null,

  onLoad(options) {
    // 设置最大日期为今天
    const today = new Date();
    const maxDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    this.setData({ maxDate });

    // 判断是否为编辑模式
    if (options.mode === 'edit') {
      this.setData({ isEditMode: true });
      this.loadExistingProfile();
    }

    this.checkCanProceed();
  },

  loadExistingProfile() {
    const profile = storage.get('user_profile') || {};

    if (profile.birthDate) {
      this.setData({
        birthDate: profile.birthDate,
        solarBirthDate: profile.birthDate
      });
    }

    if (profile.birthTime) {
      this.setData({ birthTime: profile.birthTime });
    }

    if (profile.accuracyLevel === 'approximate') {
      this.setData({
        timeUncertain: true,
        birthTime: '12:00'
      });
    }

    if (profile.calendarType === 'lunar') {
      this.setData({ calendarTypeIndex: 1 });
    }

    if (profile.birthCity) {
      this.setData({
        cityInput: profile.birthCity,
        selectedCity: {
          name: profile.birthCity,
          lat: profile.lat,
          lon: profile.lon,
          displayText: profile.birthCity,
          timezone: profile.timezone || '8'
        }
      });
    }

    this.checkCanProceed();
  },

  // 日历类型切换
  onCalendarTypeChange(e) {
    const index = parseInt(e.detail.value, 10);
    this.setData({
      calendarTypeIndex: index,
      birthDate: '2000-01-01',
      solarBirthDate: index === 0 ? '2000-01-01' : ''
    });
    this.checkCanProceed();
  },

  // 日期选择
  async onDateChange(e) {
    const date = e.detail.value;
    this.setData({ birthDate: date });

    // 如果是农历，需要转换
    if (this.data.calendarTypeIndex === 1) {
      await this.convertLunarToSolar(date);
    } else {
      this.setData({ solarBirthDate: date });
    }

    this.checkCanProceed();
  },

  // 农历转公历
  async convertLunarToSolar(lunarDateStr) {
    const parts = lunarDateStr.split('-');
    if (parts.length !== 3) return;

    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);

    this.setData({
      loading: true,
      loadingText: '正在转换农历日期...'
    });

    try {
      const res = await request({
        url: '/api/calendar/lunar-to-solar',
        method: 'POST',
        data: { year, month, day, isLeapMonth: false }
      });

      if (res.success && res.solarDate) {
        this.setData({ solarBirthDate: res.solarDate });
        wx.showToast({
          title: `已转换为公历 ${res.solarDate}`,
          icon: 'none',
          duration: 2000
        });
      } else {
        wx.showToast({
          title: res.error || '日期转换失败',
          icon: 'none'
        });
        this.setData({ solarBirthDate: '' });
      }
    } catch (err) {
      logger.error('Lunar conversion failed:', err);
      wx.showToast({
        title: '日期转换失败，请稍后重试',
        icon: 'none'
      });
      this.setData({ solarBirthDate: '' });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 时间选择
  onTimeChange(e) {
    this.setData({ birthTime: e.detail.value });
    this.checkCanProceed();
  },

  // 不确定时间勾选
  toggleTimeUncertain() {
    const newValue = !this.data.timeUncertain;
    this.setData({
      timeUncertain: newValue,
      birthTime: newValue ? '12:00' : ''
    });
    this.checkCanProceed();
  },

  // 城市输入
  onCityInput(e) {
    const value = e.detail.value;
    this.setData({
      cityInput: value,
      selectedCity: null
    });

    // 防抖搜索
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }

    if (!value.trim()) {
      this.setData({
        cityResults: [],
        showCityDropdown: false
      });
      this.checkCanProceed();
      return;
    }

    this.searchTimer = setTimeout(() => {
      const results = searchCities(value, 5);
      const formattedResults = results.map(city => ({
        ...city,
        displayText: formatCityDisplay(city)
      }));

      this.setData({
        cityResults: formattedResults,
        showCityDropdown: true
      });
    }, 300);

    this.checkCanProceed();
  },

  onCityInputFocus() {
    this.setData({ cityPlaceholder: '' });
    if (this.data.cityInput && this.data.cityResults.length > 0) {
      this.setData({ showCityDropdown: true });
    }
  },

  onCityInputBlur() {
    // 延迟关闭，以便点击事件能够触发
    setTimeout(() => {
      this.setData({
        showCityDropdown: false,
        cityPlaceholder: CITY_PLACEHOLDER
      });
    }, 200);
  },

  // 选择城市
  onSelectCity(e) {
    const city = e.currentTarget.dataset.city;
    const coords = getCityCoordinates(city);

    this.setData({
      cityInput: city.displayText,
      selectedCity: {
        ...city,
        ...coords
      },
      showCityDropdown: false,
      cityResults: []
    });

    this.checkCanProceed();
  },

  // 检查是否可以继续
  checkCanProceed() {
    const { step, birthDate, birthTime, timeUncertain, selectedCity, cityInput, calendarTypeIndex, solarBirthDate } = this.data;

    let canProceed = false;

    if (step === 1) {
      const hasDate = calendarTypeIndex === 1 ? !!solarBirthDate : !!birthDate;
      const hasTime = timeUncertain || !!birthTime;
      canProceed = hasDate && hasTime;
    } else if (step === 2) {
      canProceed = !!selectedCity || !!cityInput.trim();
    }

    this.setData({ canProceed });
  },

  // 上一步
  goBack() {
    if (this.data.step > 1) {
      this.setData({ step: this.data.step - 1 });
      this.checkCanProceed();
    }
  },

  // 下一步/完成
  async goNext() {
    if (!this.data.canProceed || !this.data.agreedTerms) {
      if (!this.data.agreedTerms) {
        wx.showToast({ title: '请先同意用户协议和隐私政策', icon: 'none' });
      }
      return;
    }

    if (this.data.step === 1) {
      this.setData({ step: 2 });
      this.checkCanProceed();
    } else {
      await this.saveProfile();
    }
  },

  // 保存用户资料
  async saveProfile() {
    const {
      birthDate,
      birthTime,
      timeUncertain,
      calendarTypeIndex,
      solarBirthDate,
      selectedCity,
      cityInput,
      isEditMode
    } = this.data;

    this.setData({
      loading: true,
      loadingText: '保存中...'
    });

    try {
      const existingProfile = storage.get('user_profile') || {};

      // 使用转换后的公历日期
      const finalBirthDate = calendarTypeIndex === 1 ? solarBirthDate : birthDate;

      const newProfile = {
        ...existingProfile,
        birthDate: finalBirthDate,
        birthTime: birthTime,
        accuracyLevel: timeUncertain ? 'approximate' : 'exact',
        calendarType: calendarTypeIndex === 0 ? 'solar' : 'lunar',
        birthCity: selectedCity ? selectedCity.displayText : cityInput,
        lat: selectedCity ? selectedCity.lat : null,
        lon: selectedCity ? selectedCity.lon : null,
        timezone: selectedCity ? selectedCity.timezone : '8',
        onboardingCompleted: true
      };

      storage.set('user_profile', newProfile);

      wx.showToast({
        title: isEditMode ? '保存成功' : '设置完成',
        icon: 'success'
      });

      // 延迟跳转
      setTimeout(() => {
        if (isEditMode) {
          wx.navigateBack();
        } else {
          wx.switchTab({ url: '/pages/home/home' });
        }
      }, 1500);

    } catch (err) {
      logger.error('Save profile failed:', err);
      wx.showToast({
        title: '保存失败，请重试',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  toggleAgreed() {
    this.setData({ agreedTerms: !this.data.agreedTerms });
  },

  goToTerms() {
    wx.navigateTo({ url: '/pages/agreement/agreement?type=terms' });
  },

  goToPrivacy() {
    wx.navigateTo({ url: '/pages/agreement/agreement?type=privacy' });
  },

  onUnload() {
    // 清理定时器
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
  }
});
