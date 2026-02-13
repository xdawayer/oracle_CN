const { request } = require('../../utils/request');
const storage = require('../../utils/storage');
const { API_ENDPOINTS } = require('../../services/api');
const logger = require('../../utils/logger');

// ===== AI 响应解析工具 =====
function stripMarkdown(obj) {
  if (typeof obj === 'string') {
    return obj.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1').replace(/^#{1,6}\s+/gm, '');
  }
  if (Array.isArray(obj)) {
    return obj.map(stripMarkdown);
  }
  if (obj && typeof obj === 'object') {
    const result = {};
    for (const key of Object.keys(obj)) {
      result[key] = stripMarkdown(obj[key]);
    }
    return result;
  }
  return obj;
}

function parseAIResponse(text) {
  if (!text || typeof text !== 'string') return null;
  let cleaned = text.trim();
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim();
  }
  try {
    const parsed = JSON.parse(cleaned);
    return stripMarkdown(parsed);
  } catch {
    logger.error('Failed to parse AI response as JSON:', cleaned.substring(0, 200));
    return null;
  }
}

// ===== 心情组（5 个大类，单选） =====
const MOOD_GROUPS = [
  { id: 'happy',    label: '开心', icon: '/images/icons/mood-happy.svg',    color: '#FFB347' },
  { id: 'calm',     label: '平静', icon: '/images/icons/mood-calm.svg',     color: '#81C784' },
  { id: 'sad',      label: '低落', icon: '/images/icons/mood-sad.svg',      color: '#9575CD' },
  { id: 'angry',    label: '烦躁', icon: '/images/icons/mood-angry.svg',    color: '#EF5350' },
  { id: 'confused', label: '迷茫', icon: '/images/icons/mood-confused.svg', color: '#90A4AE' },
];

// ===== 情绪细分（每组 4 个，多选） =====
const MOOD_ITEMS = {
  happy: [
    { id: 'joyful',    label: '开心',   icon: '/images/icons/emotion-joyful.svg',  desc: '今天是好日子' },
    { id: 'excited',   label: '上头',   icon: '/images/icons/emotion-excited.svg', desc: '太上头了！' },
    { id: 'touched',   label: '破防',   icon: '/images/icons/emotion-touched.svg', desc: '被暖到了' },
    { id: 'content',   label: '小确幸', icon: '/images/icons/emotion-content.svg', desc: '小小的满足' },
  ],
  calm: [
    { id: 'calm',      label: '平静',   icon: '/images/icons/emotion-calm.svg',     desc: '岁月静好' },
    { id: 'relieved',  label: '释然',   icon: '/images/icons/emotion-relieved.svg', desc: '终于放下了' },
    { id: 'hopeful',   label: '期待',   icon: '/images/icons/emotion-hopeful.svg',  desc: '有点小期待' },
    { id: 'lazy',      label: '躺平',   icon: '/images/icons/emotion-lazy.svg',     desc: '什么都不想干' },
  ],
  sad: [
    { id: 'emo',       label: 'emo',    icon: '/images/icons/emotion-emo.svg',       desc: '突然就 emo 了' },
    { id: 'wronged',   label: '委屈',   icon: '/images/icons/emotion-wronged.svg',   desc: '明明不是我的错' },
    { id: 'lonely',    label: '孤独',   icon: '/images/icons/emotion-lonely.svg',    desc: '好像只有我一个人' },
    { id: 'nostalgic', label: '怅然',   icon: '/images/icons/emotion-nostalgic.svg', desc: '说不上来的失落' },
  ],
  angry: [
    { id: 'angry',     label: '生气',   icon: '/images/icons/emotion-angry.svg',      desc: '真的很火大' },
    { id: 'anxious',   label: '焦虑',   icon: '/images/icons/emotion-anxious.svg',    desc: '心里七上八下' },
    { id: 'suffocated',label: '窒息',   icon: '/images/icons/emotion-suffocated.svg', desc: '快窒息了' },
    { id: 'annoyed',   label: '烦',     icon: '/images/icons/emotion-annoyed.svg',    desc: '好烦好烦' },
  ],
  confused: [
    { id: 'confused',  label: '迷茫',   icon: '/images/icons/emotion-confused.svg',  desc: '不知道该怎么办' },
    { id: 'powerless', label: '摆烂',   icon: '/images/icons/emotion-powerless.svg', desc: '不想努力了' },
    { id: 'exhausted', label: '精神内耗',icon: '/images/icons/emotion-exhausted.svg', desc: '脑子停不下来' },
    { id: 'numb',      label: '麻了',   icon: '/images/icons/emotion-numb.svg',      desc: '已经无所谓了' },
  ],
};

// 扁平化所有情绪，方便查找
const ALL_MOODS = Object.entries(MOOD_ITEMS).flatMap(([groupId, items]) =>
  items.map(item => ({ ...item, group: groupId }))
);

// ===== 场景标签（单选） =====
const SCENE_TAGS = [
  { id: 'work',     label: '工作',   icon: '/images/icons/scene-work.svg' },
  { id: 'study',    label: '学习',   icon: '/images/icons/scene-study.svg' },
  { id: 'love',     label: '感情',   icon: '/images/icons/scene-love.svg' },
  { id: 'family',   label: '家庭',   icon: '/images/icons/scene-family.svg' },
  { id: 'social',   label: '社交',   icon: '/images/icons/scene-social.svg' },
  { id: 'health',   label: '健康',   icon: '/images/icons/scene-health.svg' },
  { id: 'money',    label: '财务',   icon: '/images/icons/scene-money.svg' },
  { id: 'growth',   label: '自我',   icon: '/images/icons/scene-growth.svg' },
];

// ===== 睡眠标签（单选） =====
const SLEEP_TAGS = [
  { id: 'great',    label: '秒睡',   icon: '/images/icons/sleep-great.svg' },
  { id: 'good',     label: '还行',   icon: '/images/icons/sleep-good.svg' },
  { id: 'normal',   label: '一般',   icon: '/images/icons/sleep-normal.svg' },
  { id: 'insomnia', label: '失眠',   icon: '/images/icons/sleep-insomnia.svg' },
  { id: 'dreams',   label: '多梦',   icon: '/images/icons/sleep-dreams.svg' },
];

// ===== 身体状态标签（多选，可选） =====
const BODY_TAGS = [
  { id: 'energetic', label: '精力充沛', icon: '/images/icons/body-energetic.svg' },
  { id: 'tired',     label: '有点累',   icon: '/images/icons/body-tired.svg' },
  { id: 'headache',  label: '头痛',     icon: '/images/icons/body-headache.svg' },
  { id: 'neck',      label: '肩颈紧',   icon: '/images/icons/body-neck.svg' },
  { id: 'stomach',   label: '胃不舒服', icon: '/images/icons/body-stomach.svg' },
  { id: 'chest',     label: '胸闷',     icon: '/images/icons/body-chest.svg' },
  { id: 'eyes',      label: '眼睛酸',   icon: '/images/icons/body-eyes.svg' },
  { id: 'exhausted', label: '全身疲惫', icon: '/images/icons/body-exhausted.svg' },
];

Page({
  data: {
    viewMode: 'dashboard',
    recordDate: null,    // 补录日期 key（null = 当天）

    // 记录数据
    record: {
      moodGroup: '',    // 心情组 ID（单选）
      moods: [],        // 情绪细分 ID 数组（多选）
      scene: '',        // 场景 ID（单选）
      sleep: '',        // 睡眠 ID（单选）
      bodyTags: [],     // 身体状态 ID 数组（多选，可选）
      note: '',         // 补充文字（可选）
    },

    // 选中状态映射（用于 WXML 模板判断选中）
    selectedMoodsMap: {},
    selectedBodyMap: {},

    // 展示状态
    reportData: null,
    recordSummary: null,
    analyzing: false,
    expandedGroup: '',       // 当前展开的情绪细分组
    currentMoodItems: [],    // 当前心情组对应的情绪细分列表
    expandedMoodItems: [],   // 展开的其他组的情绪细分列表

    // Dashboard
    history: [],
    currentMonth: '',
    weekDays: ['日', '一', '二', '三', '四', '五', '六'],
    calendarDays: [],

    // 月度心情统计
    monthlyMoodCounts: MOOD_GROUPS.map(g => ({ id: g.id, label: g.label, icon: g.icon, count: 0, color: g.color })),

    // 常量传给模板
    moodGroups: MOOD_GROUPS,
    moodItems: MOOD_ITEMS,
    sceneTags: SCENE_TAGS,
    sleepTags: SLEEP_TAGS,
    bodyTags: BODY_TAGS,
  },

  onLoad() {
    this.initCalendar();
    this.fetchHistory();
  },

  // ===== Dashboard =====
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
      const userProfile = storage.get('user_profile');
      const userId = userProfile && userProfile.userId || 'anonymous';
      const res = await request({
        url: API_ENDPOINTS.CBT_RECORDS + '?userId=' + userId,
        method: 'GET'
      });
      const records = res && res.records ? res.records : (Array.isArray(res) ? res : []);
      if (records.length > 0) {
        const mappedHistory = records.map(item => {
          // 兼容新格式（moodGroup + moods）和旧格式（moods 数组 / 单 moodId）
          let moodLabel = '未标记';
          let primaryMoodId = 'calm';
          let moodGroupId = 'calm';

          if (item.moodGroup) {
            // 新格式
            const group = MOOD_GROUPS.find(g => g.id === (typeof item.moodGroup === 'string' ? item.moodGroup : item.moodGroup.id));
            moodGroupId = group ? group.id : 'calm';
            const moodIds = (item.moods || []).map(m => typeof m === 'string' ? m : m.id);
            primaryMoodId = moodIds[0] || 'calm';
            const labels = moodIds.map(id => (ALL_MOODS.find(m => m.id === id) || {}).label).filter(Boolean);
            moodLabel = labels.join(' · ') || (group ? group.label : '未标记');
          } else {
            // 旧格式兼容
            const moodIds = item.moods
              ? item.moods.map(m => typeof m === 'string' ? m : m.id)
              : (item.moodId ? [item.moodId] : []);
            primaryMoodId = moodIds[0] || 'calm';
            const moodConfig = ALL_MOODS.find(m => m.id === primaryMoodId);
            moodGroupId = moodConfig ? moodConfig.group : 'calm';
            const labels = moodIds.map(id => (ALL_MOODS.find(m => m.id === id) || {}).label).filter(Boolean);
            moodLabel = labels.join(' · ') || '未标记';
          }

          // 摘要：优先用 scene label，其次 situation，再 note
          let summary = item.summary || '';
          if (!summary) {
            const sceneLabel = item.scene ? (typeof item.scene === 'string' ? item.scene : item.scene.label) : '';
            const note = item.note || item.situation || '';
            summary = sceneLabel ? (sceneLabel + (note ? '：' + note : '')) : note;
          }

          // 格式化日期
          const d = new Date(item.date);
          const weekDayNames = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
          const weekDay = weekDayNames[d.getDay()];
          const dateStr = `${d.getMonth() + 1}月${d.getDate()}日`;
          const hours = d.getHours();
          const minutes = d.getMinutes();
          const ampm = hours < 12 ? '上午' : '下午';
          const displayHour = hours % 12 || 12;
          const timeStr = `${displayHour}:${minutes < 10 ? '0' + minutes : minutes} ${ampm}`;

          // 心情组图标、颜色和标签
          const moodGroupConfig = MOOD_GROUPS.find(g => g.id === moodGroupId);
          const moodGroupLabel = moodGroupConfig ? moodGroupConfig.label : '未标记';
          const moodGroupIcon = moodGroupConfig ? moodGroupConfig.icon : '/images/icons/mood-calm.svg';
          const moodGroupColor = moodGroupConfig ? moodGroupConfig.color : '#A0A0A0';

          // 提取详细标签列表（情绪、睡眠、场景、身体）
          const detailTags = [];
          // 情绪细分
          const moodIds = (item.moods || []).map(m => typeof m === 'string' ? m : (m.id || m.name));
          moodIds.forEach(id => {
            const mood = ALL_MOODS.find(m => m.id === id);
            if (mood) detailTags.push({ icon: mood.icon, label: mood.label });
          });
          // 睡眠
          if (item.sleep) {
            const sleepId = typeof item.sleep === 'string' ? item.sleep : item.sleep.id;
            const sleepConfig = SLEEP_TAGS.find(s => s.id === sleepId);
            if (sleepConfig) detailTags.push({ icon: sleepConfig.icon, label: sleepConfig.label });
          }
          // 场景
          if (item.scene) {
            const sceneId = typeof item.scene === 'string' ? item.scene : item.scene.id;
            const sceneConfig = SCENE_TAGS.find(s => s.id === sceneId);
            if (sceneConfig) detailTags.push({ icon: sceneConfig.icon, label: sceneConfig.label });
          }
          // 身体状态
          (item.bodyTags || []).forEach(b => {
            const bId = typeof b === 'string' ? b : b.id;
            const bConfig = BODY_TAGS.find(t => t.id === bId);
            if (bConfig) detailTags.push({ icon: bConfig.icon, label: bConfig.label });
          });

          const dateKey = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

          return {
            ...item,
            moodLabel,
            primaryMoodId,
            moodGroupId,
            moodGroupLabel,
            moodGroupIcon,
            moodGroupColor,
            weekDay,
            dateStr,
            timeStr,
            detailTags,
            dateKey,
            _ts: d.getTime(),
            summary: summary.slice(0, 50),
          };
        });

        // 按时间倒序排列（最新在前）
        mappedHistory.sort((a, b) => b._ts - a._ts);

        // 每天只保留最新一条记录
        const dayMap = new Map();
        mappedHistory.forEach(item => {
          if (!dayMap.has(item.dateKey)) {
            dayMap.set(item.dateKey, item);
          }
        });
        const dedupedHistory = Array.from(dayMap.values());
        dedupedHistory.sort((a, b) => b._ts - a._ts);

        // 计算天数间隔，插入 gap 标记生成展示列表
        const historyWithGaps = [];
        for (let i = 0; i < dedupedHistory.length; i++) {
          historyWithGaps.push({ type: 'record', data: dedupedHistory[i], id: dedupedHistory[i].id || ('r-' + i) });
          if (i < dedupedHistory.length - 1) {
            const curDate = new Date(dedupedHistory[i].date);
            const nextDate = new Date(dedupedHistory[i + 1].date);
            const diffDays = Math.floor((curDate.setHours(0,0,0,0) - nextDate.setHours(0,0,0,0)) / 86400000) - 1;
            if (diffDays > 0) {
              historyWithGaps.push({ type: 'gap', days: diffDays, id: 'gap-' + i });
            }
          }
        }

        this.setData({ history: historyWithGaps });

        // 更新日历标记
        const { calendarDays } = this.data;
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        const updatedDays = calendarDays.map(day => {
          if (day.empty) return day;
          const record = dedupedHistory.find(h => {
            const d = new Date(h.date);
            return d.getFullYear() === currentYear && d.getMonth() === currentMonth && d.getDate() === day.day;
          });
          return record ? { ...day, moodId: record.primaryMoodId, moodGroup: record.moodGroupId, dateKey: record.dateKey } : day;
        });
        this.setData({ calendarDays: updatedDays });

        // 计算当月心情统计
        const monthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
        const monthRecords = dedupedHistory.filter(h => h.dateKey.startsWith(monthPrefix));
        const countMap = {};
        monthRecords.forEach(h => {
          countMap[h.moodGroupId] = (countMap[h.moodGroupId] || 0) + 1;
        });
        const monthlyMoodCounts = MOOD_GROUPS.map(g => ({
          id: g.id, label: g.label, icon: g.icon, count: countMap[g.id] || 0, color: g.color,
        }));
        this.setData({ monthlyMoodCounts });
      }
    } catch (err) {
      logger.error('Failed to fetch history', err);
    }
  },

  // ===== 记录流程 =====
  // 获取日期 key (YYYY-MM-DD)
  _getDateKey(date) {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  },

  startRecord() {
    this._startRecordForDate(null);
  },

  // 为指定日期开始记录（dateKey = null 表示当天）
  _startRecordForDate(dateKey) {
    this.setData({
      viewMode: 'record',
      recordDate: dateKey,
      record: {
        moodGroup: '',
        moods: [],
        scene: '',
        sleep: '',
        bodyTags: [],
        note: '',
      },
      selectedMoodsMap: {},
      selectedBodyMap: {},
      reportData: null,
      recordSummary: null,
      analyzing: false,
      expandedGroup: '',
      currentMoodItems: [],
      expandedMoodItems: [],
    });
  },

  // 点击日历日期
  onDayTap(e) {
    const { day, mood, datekey } = e.currentTarget.dataset;
    if (!day) return;

    const now = new Date();
    const targetDate = new Date(now.getFullYear(), now.getMonth(), day);
    // 未来日期不可点
    if (day > now.getDate()) return;

    if (mood && datekey) {
      // 有记录 → 查看报告
      this._showReportForDate(datekey);
    } else {
      // 无记录 → 补录
      const dk = this._getDateKey(targetDate);
      this._startRecordForDate(dk);
    }
  },

  // 查看某天的 AI 报告
  _showReportForDate(dateKey) {
    const saved = storage.get(`cbt_report_${dateKey}`);
    if (saved && saved.reportData) {
      this.setData({
        viewMode: 'result',
        reportData: saved.reportData,
        recordSummary: saved.recordSummary || null,
        analyzing: false,
      });
    } else {
      wx.showToast({ title: '暂无报告数据', icon: 'none' });
    }
  },

  // 历史卡片 "..." 按钮 → 查看报告
  onViewReport(e) {
    const dateKey = e.currentTarget.dataset.datekey;
    if (dateKey) {
      this._showReportForDate(dateKey);
    }
  },

  exitRecord() {
    this.setData({ viewMode: 'dashboard', recordDate: null });
    this.fetchHistory();
  },

  // 选心情组（单选）— 切换时清空已选情绪并更新当前组列表
  onMoodGroupTap(e) {
    const groupId = e.currentTarget.dataset.id;
    const current = this.data.record.moodGroup;
    const isDeselect = current === groupId;
    this.setData({
      'record.moodGroup': isDeselect ? '' : groupId,
      'record.moods': isDeselect ? [] : this.data.record.moods,
      selectedMoodsMap: isDeselect ? {} : this.data.selectedMoodsMap,
      expandedGroup: isDeselect ? '' : groupId,
      currentMoodItems: isDeselect ? [] : (MOOD_ITEMS[groupId] || []),
    });
  },

  // 展开/折叠情绪细分组
  toggleMoodGroup(e) {
    const groupId = e.currentTarget.dataset.group;
    const isCollapse = this.data.expandedGroup === groupId;
    this.setData({
      expandedGroup: isCollapse ? '' : groupId,
      expandedMoodItems: isCollapse ? [] : (MOOD_ITEMS[groupId] || []),
    });
  },

  // 多选情绪细分
  onMoodToggle(e) {
    const moodId = e.currentTarget.dataset.id;
    const moods = [...this.data.record.moods];
    const map = { ...this.data.selectedMoodsMap };
    const idx = moods.indexOf(moodId);
    if (idx >= 0) {
      moods.splice(idx, 1);
      delete map[moodId];
    } else {
      moods.push(moodId);
      map[moodId] = true;
    }
    this.setData({ 'record.moods': moods, selectedMoodsMap: map });
  },

  // 选场景（单选）
  onSceneTap(e) {
    const sceneId = e.currentTarget.dataset.id;
    this.setData({
      'record.scene': this.data.record.scene === sceneId ? '' : sceneId
    });
  },

  // 选睡眠（单选）
  onSleepTap(e) {
    const sleepId = e.currentTarget.dataset.id;
    this.setData({
      'record.sleep': this.data.record.sleep === sleepId ? '' : sleepId
    });
  },

  // 多选身体状态
  onBodyToggle(e) {
    const tagId = e.currentTarget.dataset.id;
    const bodyTags = [...this.data.record.bodyTags];
    const map = { ...this.data.selectedBodyMap };
    const idx = bodyTags.indexOf(tagId);
    if (idx >= 0) {
      bodyTags.splice(idx, 1);
      delete map[tagId];
    } else {
      bodyTags.push(tagId);
      map[tagId] = true;
    }
    this.setData({ 'record.bodyTags': bodyTags, selectedBodyMap: map });
  },

  // 补充文字
  onNoteInput(e) {
    this.setData({ 'record.note': e.detail.value });
  },

  // 表单验证
  isFormValid() {
    const { record } = this.data;
    return record.moodGroup
      && record.moods.length > 0
      && record.scene
      && record.sleep;
  },

  // 提交并获取 AI 解读
  async submitRecord() {
    if (!this.isFormValid()) {
      wx.showToast({ title: '请完成必选项', icon: 'none' });
      return;
    }

    // 构建记录摘要供报告页展示
    const { record } = this.data;
    const moodGroupConfig = MOOD_GROUPS.find(g => g.id === record.moodGroup);
    const moodLabels = record.moods.map(id => {
      const m = ALL_MOODS.find(mood => mood.id === id);
      return m ? m.label : id;
    });
    const sceneConfig = SCENE_TAGS.find(s => s.id === record.scene);
    const sleepConfig = SLEEP_TAGS.find(s => s.id === record.sleep);
    const bodyLabels = record.bodyTags.map(id => {
      const t = BODY_TAGS.find(b => b.id === id);
      return t ? { label: t.label, icon: t.icon } : { label: id, icon: '' };
    });

    // 补录用指定日期，否则用当天
    const recordDateObj = this.data.recordDate
      ? new Date(this.data.recordDate + 'T12:00:00')
      : new Date();
    const reportDate = `${recordDateObj.getFullYear()}年${recordDateObj.getMonth() + 1}月${recordDateObj.getDate()}日`;
    const dateKey = this.data.recordDate || this._getDateKey(new Date());

    const recordSummary = {
      moodIcon: moodGroupConfig ? moodGroupConfig.icon : '/images/icons/mood-calm.svg',
      moodLabels: moodLabels.join(' · '),
      sceneIcon: sceneConfig ? sceneConfig.icon : '',
      sceneLabel: sceneConfig ? sceneConfig.label : '',
      sleepIcon: sleepConfig ? sleepConfig.icon : '',
      sleepLabel: sleepConfig ? sleepConfig.label : '',
      bodyLabels,
      note: record.note || '',
      date: reportDate,
    };

    const moodsPayload = record.moods.map(id => {
      const m = ALL_MOODS.find(mood => mood.id === id);
      return { id, name: m ? m.label : id };
    });
    const bodyPayload = record.bodyTags.map(id => {
      const t = BODY_TAGS.find(b => b.id === id);
      return { id, label: t ? t.label : id };
    });

    this.setData({ viewMode: 'result', analyzing: true, recordSummary });

    try {
      const userProfile = storage.get('user_profile');
      if (!userProfile || !userProfile.birthDate) {
        this.setData({
          reportData: { sections: [{ type: 'mood_echo', title: '提示', content: '请先完善出生信息后再使用分析功能。' }] },
          analyzing: false,
        });
        this.saveRecord(moodsPayload, sceneConfig, sleepConfig, bodyPayload, dateKey);
        return;
      }

      const res = await request({
        url: API_ENDPOINTS.CBT_ANALYSIS,
        method: 'POST',
        data: {
          birth: {
            date: userProfile.birthDate,
            time: userProfile.birthTime || undefined,
            city: userProfile.birthCity || '',
            lat: userProfile.lat,
            lon: userProfile.lon,
            timezone: userProfile.timezone || undefined,
            accuracy: userProfile.accuracyLevel || userProfile.accuracy || 'exact',
          },
          lang: 'zh',
          moodGroup: { id: record.moodGroup, label: moodGroupConfig ? moodGroupConfig.label : '' },
          moods: moodsPayload,
          scene: { id: record.scene, label: sceneConfig ? sceneConfig.label : '' },
          sleep: { id: record.sleep, label: sleepConfig ? sleepConfig.label : '' },
          bodyTags: bodyPayload,
          note: record.note || '',
          situation: (sceneConfig ? sceneConfig.label : '') + (record.note ? '：' + record.note : ''),
          hotThought: '',
          automaticThoughts: [],
          balancedEntries: [],
          bodySignal: bodyPayload.map(b => b.label).join('、') || undefined,
        }
      });

      if (res && res.content) {
        // res.content 可能是字符串或已解析的对象
        let parsed = null;
        if (typeof res.content === 'string') {
          parsed = parseAIResponse(res.content);
        } else if (typeof res.content === 'object') {
          parsed = stripMarkdown(res.content);
        }

        if (parsed && parsed.sections) {
          this.setData({ reportData: parsed });
          storage.set(`cbt_report_${dateKey}`, { reportData: parsed, recordSummary });
        } else {
          // 降级：包装为单 section
          const text = stripMarkdown(typeof res.content === 'string' ? res.content : JSON.stringify(res.content)).trim();
          const fallbackReport = { sections: [{ type: 'mood_echo', title: 'AI 解读', content: text }] };
          this.setData({ reportData: fallbackReport });
          storage.set(`cbt_report_${dateKey}`, { reportData: fallbackReport, recordSummary });
        }
      } else {
        this.setData({
          reportData: { sections: [{ type: 'mood_echo', title: '提示', content: '记录完成，AI 解读暂时不可用。' }] },
        });
      }

    } catch (error) {
      logger.error('Analysis Error:', error);
      this.setData({
        reportData: { sections: [{ type: 'mood_echo', title: '提示', content: 'AI 解读服务暂时不可用，记录已保存。' }] },
      });
    } finally {
      this.setData({ analyzing: false });
      // 无论 AI 是否成功，都保存心情记录
      this.saveRecord(moodsPayload, sceneConfig, sleepConfig, bodyPayload, dateKey);
    }
  },

  async saveRecord(moodsPayload, sceneConfig, sleepConfig, bodyPayload, dateKey) {
    try {
      const userProfile = storage.get('user_profile');
      const userId = userProfile && userProfile.userId || 'anonymous';
      const { record } = this.data;
      const recordDate = this.data.recordDate
        ? new Date(this.data.recordDate + 'T12:00:00')
        : new Date();
      await request({
        url: API_ENDPOINTS.CBT_RECORDS,
        method: 'POST',
        data: {
          userId,
          dateKey,
          record: {
            id: Date.now().toString(),
            timestamp: Date.now(),
            date: recordDate.toISOString(),
            dateKey,
            // 新字段
            moodGroup: { id: record.moodGroup, label: (MOOD_GROUPS.find(g => g.id === record.moodGroup) || {}).label || '' },
            moods: moodsPayload,
            scene: sceneConfig ? { id: sceneConfig.id, label: sceneConfig.label } : {},
            sleep: sleepConfig ? { id: sleepConfig.id, label: sleepConfig.label } : {},
            bodyTags: bodyPayload,
            note: record.note || '',
            // 向后兼容
            situation: (sceneConfig ? sceneConfig.label : '') + (record.note ? '：' + record.note : ''),
            automaticThoughts: [],
            hotThought: '',
            evidenceFor: [],
            evidenceAgainst: [],
            balancedEntries: [],
            bodySignal: bodyPayload.map(b => b.label).join('、') || '',
            summary: (sceneConfig ? sceneConfig.label : '') + (record.note ? '：' + record.note.slice(0, 40) : ''),
          }
        }
      });
    } catch (err) {
      logger.error('Failed to save record', err);
    }
  },

  // 解析月度报告 markdown 为多个带颜色的 section
  _parseMonthlyReport(text) {
    const cleaned = stripMarkdown(text).trim();
    const colorMap = {
      '整体回顾': 'warm',
      '重复出现的模式': 'alert',
      '星象关联': 'astro',
      '成长和力量': 'growth',
      '温柔提醒': 'warm',
    };
    // 分段：找到所有已知标题，按位置拆分
    const knownTitles = Object.keys(colorMap);
    const parts = [];
    let remaining = cleaned;
    for (const title of knownTitles) {
      const idx = remaining.indexOf(title + '\n');
      if (idx < 0) continue;
      // 跳过标题前面的内容（如果有前置段就先推入）
      if (idx > 0 && parts.length === 0) {
        const pre = remaining.substring(0, idx).trim();
        if (pre) parts.push({ type: 'mood_echo', title: '本月心情解读', content: pre, color: 'neutral' });
      }
      remaining = remaining.substring(idx + title.length + 1);
      // 找下一个标题的位置来截取内容
      let endIdx = remaining.length;
      for (const nextTitle of knownTitles) {
        const ni = remaining.indexOf(nextTitle + '\n');
        if (ni >= 0 && ni < endIdx) endIdx = ni;
      }
      const content = remaining.substring(0, endIdx).trim();
      if (content) {
        parts.push({ type: 'mood_echo', title, content, color: colorMap[title] || 'neutral' });
      }
      remaining = remaining.substring(endIdx);
    }
    // 如果没有匹配到任何标题，整段作为一个 section
    if (parts.length === 0) {
      parts.push({ type: 'mood_echo', title: '本月心情解读', content: cleaned, color: 'neutral' });
    }
    return parts;
  },

  // 月度 AI 分析
  async onMonthlyAnalysis() {
    if (this.data.analyzing) return;
    const { monthlyMoodCounts } = this.data;
    const totalRecords = monthlyMoodCounts.reduce((sum, m) => sum + m.count, 0);
    if (totalRecords === 0) {
      wx.showToast({ title: '本月还没有记录', icon: 'none' });
      return;
    }

    const now = new Date();
    const monthLabel = `${now.getFullYear()}年${now.getMonth() + 1}月`;

    // 构建 mood_stats
    const mood_stats = {};
    monthlyMoodCounts.forEach(m => { mood_stats[m.id] = m.count; });

    // 月度报告摘要
    const recordSummary = {
      headerTitle: '月度心情解读',
      date: `${monthLabel} · 共${totalRecords}条记录`,
      moodIcon: '',
      isMonthly: true,
    };

    this.setData({ viewMode: 'result', analyzing: true, recordSummary, reportData: null });

    try {
      const userProfile = storage.get('user_profile');
      if (!userProfile || !userProfile.birthDate) {
        this.setData({
          reportData: { sections: [{ type: 'mood_echo', title: '提示', content: '请先完善出生信息后再使用分析功能。' }] },
          analyzing: false,
        });
        return;
      }

      const res = await request({
        url: API_ENDPOINTS.CBT_AGGREGATE_ANALYSIS,
        method: 'POST',
        data: {
          birth: {
            date: userProfile.birthDate,
            time: userProfile.birthTime || undefined,
            city: userProfile.birthCity || '',
            lat: userProfile.lat,
            lon: userProfile.lon,
            timezone: userProfile.timezone || undefined,
            accuracy: userProfile.accuracyLevel || userProfile.accuracy || 'exact',
          },
          lang: 'zh',
          period: monthLabel,
          mood_stats,
        }
      });

      if (res && res.content) {
        const raw = typeof res.content === 'string' ? res.content : JSON.stringify(res.content);
        const sections = this._parseMonthlyReport(raw);
        this.setData({ reportData: { sections } });
      } else {
        this.setData({
          reportData: { sections: [{ type: 'mood_echo', title: '提示', content: 'AI 月度解读暂时不可用，请稍后重试。' }] },
        });
      }
    } catch (error) {
      logger.error('Monthly analysis error:', error);
      this.setData({
        reportData: { sections: [{ type: 'mood_echo', title: '提示', content: 'AI 月度解读服务暂时不可用，请稍后重试。' }] },
      });
    } finally {
      this.setData({ analyzing: false });
    }
  },

  completeAndReturn() {
    this.setData({ viewMode: 'dashboard', recordDate: null });
    this.fetchHistory();
  }
});
