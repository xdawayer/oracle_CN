const { request } = require('../../utils/request');
const storage = require('../../utils/storage');
const { API_ENDPOINTS } = require('../../services/api');

const STEPS = ['情境', '情绪', '想法', '证据', '平衡'];

const MOODS = [
  { id: 'happy', label: '愉悦', type: 'positive', color: 'var(--success)' },
  { id: 'meh', label: '平静', type: 'neutral', color: 'var(--info)' },
  { id: 'annoyed', label: '烦躁', type: 'negative', color: 'var(--warning)' },
  { id: 'terrible', label: '糟糕', type: 'negative', color: 'var(--danger)' }
];

Page({
  data: {
    viewMode: 'dashboard',
    step: 0,
    steps: STEPS,
    
    record: {
      situation: '',
      mood: null,
      intensity: 50,
      automaticThought: '',
      hotThought: '',
      evidenceFor: '',
      evidenceAgainst: '',
      balancedThought: ''
    },
    
    history: [],
    analysis: '',
    analyzing: false,
    
    currentMonth: '',
    weekDays: ['日', '一', '二', '三', '四', '五', '六'],
    calendarDays: [],
    
    moods: MOODS
  },

  onLoad() {
    this.initCalendar();
    this.fetchHistory();
  },

  initCalendar() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const today = now.getDate();
    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push({ empty: true, id: `empty-${i}` });
    }
    for (let i = 1; i <= totalDays; i++) {
      days.push({ 
        day: i, 
        id: i, 
        isCurrent: i === today,
        opacity: i > today ? 0.3 : 1
      });
    }
    this.setData({
      calendarDays: days,
      currentMonth: `${year}年 ${month + 1}月`
    });
  },

  async fetchHistory() {
    try {
      const res = await request({
        url: API_ENDPOINTS.CBT_RECORDS,
        method: 'GET'
      });
      if (res && Array.isArray(res)) {
        const mappedHistory = res.map(item => {
           const moodConfig = MOODS.find(m => m.id === item.moodId) || MOODS[1];
           return {
             ...item,
             color: moodConfig.color,
             moodLabel: moodConfig.label
           };
        });
        this.setData({ history: mappedHistory });
        
        const { calendarDays } = this.data;
        const updatedDays = calendarDays.map(day => {
          if (day.empty) return day;
          const record = mappedHistory.find(h => {
             const d = new Date(h.date);
             return d.getDate() === day.day;
          });
          return record ? { ...day, moodId: record.moodId } : day;
        });
        this.setData({ calendarDays: updatedDays });
      }
    } catch (err) {
      console.error('Failed to fetch CBT history', err);
    }
  },

  startDeepRecord() {
    this.setData({
      viewMode: 'guide',
      step: 0,
      record: {
        situation: '',
        mood: null,
        intensity: 50,
        automaticThought: '',
        hotThought: '',
        evidenceFor: '',
        evidenceAgainst: '',
        balancedThought: ''
      },
      analysis: ''
    });
  },

  exitGuide() {
    this.setData({ viewMode: 'dashboard' });
    this.fetchHistory();
  },

  prevStep() {
    if (this.data.step > 0) {
      this.setData({ step: this.data.step - 1 });
    } else {
      this.exitGuide();
    }
  },

  nextStep() {
    if (this.isStepValid()) {
      this.setData({ step: this.data.step + 1 });
    }
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    this.setData({
      [`record.${field}`]: value
    });
  },

  onMoodSelect(e) {
    const moodId = e.currentTarget.dataset.id;
    const mood = MOODS.find(m => m.id === moodId);
    this.setData({
      'record.mood': mood
    });
  },

  onIntensityChange(e) {
    this.setData({
      'record.intensity': parseInt(e.detail.value)
    });
  },

  isStepValid() {
    const { step, record } = this.data;
    switch (step) {
      case 0: return record.situation.trim().length > 0;
      case 1: return !!record.mood;
      case 2: return record.automaticThought.trim().length > 0;
      case 3: return record.evidenceFor.trim().length > 0;
      case 4: return record.balancedThought.trim().length > 0;
      default: return true;
    }
  },

  async finishAnalysis() {
    if (!this.isStepValid()) return;
    
    this.setData({ 
      step: this.data.step + 1, 
      analyzing: true 
    });

    try {
      const userProfile = storage.get('user_profile');
      
      const res = await request({
        url: API_ENDPOINTS.CBT_ANALYSIS,
        method: 'POST',
        data: {
          record: this.data.record,
          userContext: userProfile || {}
        }
      });

      if (res && res.analysis) {
        this.setData({ analysis: res.analysis });
      } else {
        this.setData({ analysis: '分析完成，但未返回详细内容。请保持觉察。' });
      }
      
    } catch (error) {
      console.error('CBT Analysis Error:', error);
      this.setData({ analysis: '分析服务暂时不可用，请稍后重试。' });
    } finally {
      this.setData({ analyzing: false });
    }
  },

  completeAndReturn() {
    this.setData({ viewMode: 'dashboard' });
    this.fetchHistory();
  }
});
