const { request } = require('../../utils/request');
const storage = require('../../utils/storage');
const { API_ENDPOINTS } = require('../../services/api');

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
    console.error('Failed to parse AI response as JSON:', cleaned.substring(0, 200));
    return null;
  }
}

// ===== 心情组（5 个大类，单选） =====
const MOOD_GROUPS = [
  { id: 'happy',    label: '开心', emoji: '😊' },
  { id: 'calm',     label: '平静', emoji: '😌' },
  { id: 'sad',      label: '低落', emoji: '😢' },
  { id: 'angry',    label: '烦躁', emoji: '😤' },
  { id: 'confused', label: '迷茫', emoji: '😶' },
];

// ===== 情绪细分（每组 4 个，多选） =====
const MOOD_ITEMS = {
  happy: [
    { id: 'joyful',    label: '开心',   emoji: '😊', desc: '今天是好日子' },
    { id: 'excited',   label: '上头',   emoji: '🤩', desc: '太上头了！' },
    { id: 'touched',   label: '破防',   emoji: '🥹', desc: '被暖到了' },
    { id: 'content',   label: '小确幸', emoji: '☺️', desc: '小小的满足' },
  ],
  calm: [
    { id: 'calm',      label: '平静',   emoji: '😌', desc: '岁月静好' },
    { id: 'relieved',  label: '释然',   emoji: '😮‍💨', desc: '终于放下了' },
    { id: 'hopeful',   label: '期待',   emoji: '✨', desc: '有点小期待' },
    { id: 'lazy',      label: '躺平',   emoji: '🛋️', desc: '什么都不想干' },
  ],
  sad: [
    { id: 'emo',       label: 'emo',    emoji: '😢', desc: '突然就 emo 了' },
    { id: 'wronged',   label: '委屈',   emoji: '🥺', desc: '明明不是我的错' },
    { id: 'lonely',    label: '孤独',   emoji: '🌙', desc: '好像只有我一个人' },
    { id: 'nostalgic', label: '怅然',   emoji: '🍂', desc: '说不上来的失落' },
  ],
  angry: [
    { id: 'angry',     label: '生气',   emoji: '😤', desc: '真的很火大' },
    { id: 'anxious',   label: '焦虑',   emoji: '😰', desc: '心里七上八下' },
    { id: 'suffocated',label: '窒息',   emoji: '🤯', desc: '快窒息了' },
    { id: 'annoyed',   label: '烦',     emoji: '😒', desc: '好烦好烦' },
  ],
  confused: [
    { id: 'confused',  label: '迷茫',   emoji: '😶', desc: '不知道该怎么办' },
    { id: 'powerless', label: '摆烂',   emoji: '🫠', desc: '不想努力了' },
    { id: 'exhausted', label: '精神内耗',emoji: '😵‍💫', desc: '脑子停不下来' },
    { id: 'numb',      label: '麻了',   emoji: '🫥', desc: '已经无所谓了' },
  ],
};

// 扁平化所有情绪，方便查找
const ALL_MOODS = Object.entries(MOOD_ITEMS).flatMap(([groupId, items]) =>
  items.map(item => ({ ...item, group: groupId }))
);

// ===== 场景标签（单选） =====
const SCENE_TAGS = [
  { id: 'work',     label: '工作',   emoji: '💼' },
  { id: 'study',    label: '学习',   emoji: '📚' },
  { id: 'love',     label: '感情',   emoji: '💕' },
  { id: 'family',   label: '家庭',   emoji: '🏠' },
  { id: 'social',   label: '社交',   emoji: '👥' },
  { id: 'health',   label: '健康',   emoji: '🏃' },
  { id: 'money',    label: '财务',   emoji: '💰' },
  { id: 'growth',   label: '自我',   emoji: '🌱' },
];

// ===== 睡眠标签（单选） =====
const SLEEP_TAGS = [
  { id: 'great',    label: '秒睡',   emoji: '😴' },
  { id: 'good',     label: '还行',   emoji: '🙂' },
  { id: 'normal',   label: '一般',   emoji: '😑' },
  { id: 'insomnia', label: '失眠',   emoji: '🫠' },
  { id: 'dreams',   label: '多梦',   emoji: '💭' },
];

// ===== 身体状态标签（多选，可选） =====
const BODY_TAGS = [
  { id: 'energetic', label: '精力充沛', emoji: '⚡' },
  { id: 'tired',     label: '有点累',   emoji: '😪' },
  { id: 'headache',  label: '头痛',     emoji: '🤕' },
  { id: 'neck',      label: '肩颈紧',   emoji: '💆' },
  { id: 'stomach',   label: '胃不舒服', emoji: '🤢' },
  { id: 'chest',     label: '胸闷',     emoji: '😮‍💨' },
  { id: 'eyes',      label: '眼睛酸',   emoji: '👀' },
  { id: 'exhausted', label: '全身疲惫', emoji: '🫠' },
];

Page({
  data: {
    viewMode: 'dashboard',

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

          // 心情组 emoji 和标签
          const moodGroupConfig = MOOD_GROUPS.find(g => g.id === moodGroupId);
          const moodGroupLabel = moodGroupConfig ? moodGroupConfig.label : '未标记';
          const moodGroupEmoji = moodGroupConfig ? moodGroupConfig.emoji : '😶';

          // 提取详细标签列表（情绪、睡眠、场景、身体）
          const detailTags = [];
          // 情绪细分
          const moodIds = (item.moods || []).map(m => typeof m === 'string' ? m : (m.id || m.name));
          moodIds.forEach(id => {
            const mood = ALL_MOODS.find(m => m.id === id);
            if (mood) detailTags.push({ emoji: mood.emoji, label: mood.label });
          });
          // 睡眠
          if (item.sleep) {
            const sleepId = typeof item.sleep === 'string' ? item.sleep : item.sleep.id;
            const sleepConfig = SLEEP_TAGS.find(s => s.id === sleepId);
            if (sleepConfig) detailTags.push({ emoji: sleepConfig.emoji, label: sleepConfig.label });
          }
          // 场景
          if (item.scene) {
            const sceneId = typeof item.scene === 'string' ? item.scene : item.scene.id;
            const sceneConfig = SCENE_TAGS.find(s => s.id === sceneId);
            if (sceneConfig) detailTags.push({ emoji: sceneConfig.emoji, label: sceneConfig.label });
          }
          // 身体状态
          (item.bodyTags || []).forEach(b => {
            const bId = typeof b === 'string' ? b : b.id;
            const bConfig = BODY_TAGS.find(t => t.id === bId);
            if (bConfig) detailTags.push({ emoji: bConfig.emoji, label: bConfig.label });
          });

          return {
            ...item,
            moodLabel,
            primaryMoodId,
            moodGroupId,
            moodGroupLabel,
            moodGroupEmoji,
            weekDay,
            dateStr,
            timeStr,
            detailTags,
            _ts: d.getTime(),
            summary: summary.slice(0, 50),
          };
        });

        // 按时间倒序排列（最新在前）
        mappedHistory.sort((a, b) => b._ts - a._ts);

        // 计算天数间隔，插入 gap 标记生成展示列表
        const historyWithGaps = [];
        for (let i = 0; i < mappedHistory.length; i++) {
          historyWithGaps.push({ type: 'record', data: mappedHistory[i], id: mappedHistory[i].id || ('r-' + i) });
          if (i < mappedHistory.length - 1) {
            const curDate = new Date(mappedHistory[i].date);
            const nextDate = new Date(mappedHistory[i + 1].date);
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
          const record = mappedHistory.find(h => {
            const d = new Date(h.date);
            return d.getFullYear() === currentYear && d.getMonth() === currentMonth && d.getDate() === day.day;
          });
          return record ? { ...day, moodId: record.primaryMoodId, moodGroup: record.moodGroupId } : day;
        });
        this.setData({ calendarDays: updatedDays });
      }
    } catch (err) {
      console.error('Failed to fetch history', err);
    }
  },

  // ===== 记录流程 =====
  startRecord() {
    this.setData({
      viewMode: 'record',
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

  exitRecord() {
    this.setData({ viewMode: 'dashboard' });
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
      return t ? { label: t.label, emoji: t.emoji } : { label: id, emoji: '' };
    });

    const now = new Date();
    const reportDate = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;

    const recordSummary = {
      moodEmoji: moodGroupConfig ? moodGroupConfig.emoji : '',
      moodLabels: moodLabels.join(' · '),
      sceneEmoji: sceneConfig ? sceneConfig.emoji : '',
      sceneLabel: sceneConfig ? sceneConfig.label : '',
      sleepEmoji: sleepConfig ? sleepConfig.emoji : '',
      sleepLabel: sleepConfig ? sleepConfig.label : '',
      bodyLabels,
      note: record.note || '',
      date: reportDate,
    };

    this.setData({ viewMode: 'result', analyzing: true, recordSummary });

    try {
      const userProfile = storage.get('user_profile');
      if (!userProfile || !userProfile.birthDate) {
        this.setData({
          reportData: { sections: [{ type: 'mood_echo', title: '提示', content: '请先完善出生信息后再使用分析功能。' }] },
          analyzing: false,
        });
        return;
      }

      const moodsPayload = record.moods.map(id => {
        const m = ALL_MOODS.find(mood => mood.id === id);
        return { id, name: m ? m.label : id };
      });
      const bodyPayload = record.bodyTags.map(id => {
        const t = BODY_TAGS.find(b => b.id === id);
        return { id, label: t ? t.label : id };
      });

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
        } else {
          // 降级：包装为单 section
          const text = typeof res.content === 'string'
            ? res.content.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1').replace(/^#+\s+/gm, '').trim()
            : JSON.stringify(res.content);
          this.setData({
            reportData: { sections: [{ type: 'mood_echo', title: '星象解读', content: text }] },
          });
        }
      } else {
        this.setData({
          reportData: { sections: [{ type: 'mood_echo', title: '提示', content: '记录完成，星象解读暂时不可用。' }] },
        });
      }

      // 保存记录
      this.saveRecord(moodsPayload, sceneConfig, sleepConfig, bodyPayload);
    } catch (error) {
      console.error('Analysis Error:', error);
      this.setData({
        reportData: { sections: [{ type: 'mood_echo', title: '提示', content: '星象解读服务暂时不可用，请稍后重试。' }] },
      });
    } finally {
      this.setData({ analyzing: false });
    }
  },

  async saveRecord(moodsPayload, sceneConfig, sleepConfig, bodyPayload) {
    try {
      const userProfile = storage.get('user_profile');
      const userId = userProfile && userProfile.userId || 'anonymous';
      const { record } = this.data;
      await request({
        url: API_ENDPOINTS.CBT_RECORDS,
        method: 'POST',
        data: {
          userId,
          record: {
            id: Date.now().toString(),
            timestamp: Date.now(),
            date: new Date().toISOString(),
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
      console.error('Failed to save record', err);
    }
  },

  completeAndReturn() {
    this.setData({ viewMode: 'dashboard' });
    this.fetchHistory();
  }
});
