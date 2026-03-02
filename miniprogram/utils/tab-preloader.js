const storage = require('./storage');
const { request } = require('./request');
const { API_ENDPOINTS } = require('../services/api');
const logger = require('./logger');

const TAB_ORDER = ['self', 'daily', 'discovery', 'me'];
const USER_INTERACTION_PAUSE_MS = 1500;
const DISCOVERY_STATUS_CACHE_TTL_MS = 2 * 60 * 1000;
const PRELOAD_RETRY_BASE_MS = 2000;
const PRELOAD_RETRY_MAX_MS = 30000;
const PRELOAD_TIMEOUT_MS = 15000;
const PRELOAD_AI_TIMEOUT_MS = 60000;
const PRELOAD_CONCURRENCY = 2;

const createDeferredError = (tabId) => {
  const error = new Error('preload deferred');
  error.code = 'PRELOAD_DEFERRED';
  error.tabId = tabId;
  return error;
};

const buildDailyQuery = (profile, dateStr) => {
  if (!profile) return '';
  const params = [];
  params.push(`birthDate=${encodeURIComponent(profile.birthDate || '')}`);
  params.push(`city=${encodeURIComponent(profile.birthCity || '')}`);
  params.push(`timezone=${encodeURIComponent(profile.timezone || '')}`);
  params.push(`accuracy=${encodeURIComponent(profile.accuracyLevel || profile.accuracy || 'exact')}`);
  params.push(`date=${encodeURIComponent(dateStr)}`);
  params.push('lang=zh');

  if (profile.birthTime) params.push(`birthTime=${encodeURIComponent(profile.birthTime)}`);
  if (profile.lat !== undefined) params.push(`lat=${encodeURIComponent(profile.lat)}`);
  if (profile.lon !== undefined) params.push(`lon=${encodeURIComponent(profile.lon)}`);

  return params.join('&');
};

const buildNatalQuery = (profile) => {
  if (!profile) return '';
  const params = [];
  params.push(`date=${encodeURIComponent(profile.birthDate || '')}`);
  params.push(`city=${encodeURIComponent(profile.birthCity || '')}`);
  params.push(`timezone=${encodeURIComponent(profile.timezone || '')}`);
  params.push(`accuracy=${encodeURIComponent(profile.accuracyLevel || profile.accuracy || 'exact')}`);

  if (profile.birthTime) params.push(`time=${encodeURIComponent(profile.birthTime)}`);
  if (profile.lat !== undefined) params.push(`lat=${encodeURIComponent(profile.lat)}`);
  if (profile.lon !== undefined) params.push(`lon=${encodeURIComponent(profile.lon)}`);

  return params.join('&');
};

const buildProfileFingerprint = (profile) => {
  if (!profile || !profile.birthDate) return '';
  return [
    profile.birthDate || '',
    profile.birthTime || '',
    profile.birthCity || '',
    profile.timezone || '',
    profile.accuracyLevel || profile.accuracy || '',
    profile.lat === undefined ? '' : String(profile.lat),
    profile.lon === undefined ? '' : String(profile.lon),
  ].join('|');
};

const buildSelfChartCacheKey = (profile) => {
  if (!profile || !profile.birthDate) return null;
  const accuracy = profile.accuracyLevel || profile.accuracy || 'exact';
  const lat = profile.lat === undefined ? '' : profile.lat;
  const lon = profile.lon === undefined ? '' : profile.lon;
  return `self_natal_chart_cache_${profile.birthDate}_${profile.birthTime || ''}_${profile.birthCity || ''}_${profile.timezone || ''}_${accuracy}_${lat}_${lon}`;
};

const buildDailyTransitCacheKey = (profile, dateStr) => {
  if (!profile || !profile.birthDate) return null;
  return `daily_transit_cache_${profile.birthDate}_${profile.birthTime || ''}_${profile.birthCity || ''}_${dateStr}`;
};

const buildDailyFullCacheKey = (profile, dateStr) => {
  if (!profile || !profile.birthDate) return null;
  const lat = profile.lat === undefined ? '' : profile.lat;
  const lon = profile.lon === undefined ? '' : profile.lon;
  const tz = profile.timezone || '';
  const accuracy = profile.accuracyLevel || profile.accuracy || 'exact';
  return `daily_full_${profile.birthDate}_${profile.birthTime || ''}_${profile.birthCity || ''}_${lat}_${lon}_${tz}_${accuracy}_${dateStr}`;
};

const buildDiscoveryCacheKey = (profile) => {
  const fingerprint = buildProfileFingerprint(profile);
  if (!fingerprint) return null;
  return `discovery_topic_status_cache_${fingerprint}`;
};

const updateStoredUserProfile = (res) => {
  if (!res || typeof res !== 'object') return;
  const profile = storage.get('user_profile') || {};
  profile.name = res.name || profile.name;
  if (res.points !== undefined) profile.points = res.points;
  if (res.isVip !== undefined) profile.isVip = res.isVip;
  if (res.vipExpireDate !== undefined) profile.vipExpireDate = res.vipExpireDate;
  storage.set('user_profile', profile);
  if (res.avatarUrl) {
    storage.set('user_avatar', res.avatarUrl);
  }
};

const createTabPreloader = () => {
  const state = {
    homeReady: false,
    running: false,
    paused: false,
    resumeTimer: null,
    queue: [...TAB_ORDER],
    done: new Set(),
    profileFingerprint: '',
    activeTabs: new Set(),
    deferredTabs: new Set(),
    retryMeta: {},
    retryTimer: null,
  };

  const getProfile = () => {
    const profile = storage.get('user_profile');
    if (!profile || !profile.birthDate) return null;
    return profile;
  };

  const resetForProfile = (profileFingerprint) => {
    state.profileFingerprint = profileFingerprint || '';
    state.queue = [...TAB_ORDER];
    state.done.clear();
  };

  const ensureProfileContext = () => {
    const profile = getProfile();
    const fingerprint = buildProfileFingerprint(profile);
    if (fingerprint !== state.profileFingerprint) {
      resetForProfile(fingerprint);
    }
    return profile;
  };

  const prefetchSelfVisible = async (profile, controls = {}) => {
    if (controls.shouldDefer && controls.shouldDefer()) {
      throw createDeferredError('self');
    }

    const cacheKey = buildSelfChartCacheKey(profile);
    if (!cacheKey) return;
    const cached = storage.get(cacheKey);
    if (cached && cached.chart) return;

    const query = buildNatalQuery(profile);
    if (!query) return;
    const result = await request({ url: `${API_ENDPOINTS.NATAL_CHART}?${query}`, method: 'GET', timeout: PRELOAD_TIMEOUT_MS });
    if (result && result.chart) {
      storage.set(cacheKey, result);
    }
  };

  const prefetchDailyVisible = async (profile, controls = {}) => {
    if (controls.shouldDefer && controls.shouldDefer()) {
      throw createDeferredError('daily');
    }

    const dateStr = new Date().toISOString().slice(0, 10);
    const query = buildDailyQuery(profile, dateStr);
    if (!query) return;

    const transitCacheKey = buildDailyTransitCacheKey(profile, dateStr);

    if (transitCacheKey && !storage.get(transitCacheKey)) {
      const transitRes = await request({ url: `${API_ENDPOINTS.DAILY_TRANSIT}?${query}`, method: 'GET', timeout: PRELOAD_TIMEOUT_MS });
      if (transitRes) {
        storage.set(transitCacheKey, transitRes);
      }
    }

    // home.js 后台已触发 /daily/full，此处检查缓存是否就绪
    // 若 full 缓存不存在，主动请求以确保切到「今日」Tab 时数据可用
    if (controls.shouldDefer && controls.shouldDefer()) {
      throw createDeferredError('daily');
    }

    const fullCacheKey = buildDailyFullCacheKey(profile, dateStr);
    if (fullCacheKey && !storage.get(fullCacheKey) && !storage.get(fullCacheKey + '_pending')) {
      const fullRes = await request({ url: `${API_ENDPOINTS.DAILY_FULL}?${query}`, method: 'GET', timeout: PRELOAD_AI_TIMEOUT_MS });
      if (fullRes) {
        storage.set(fullCacheKey, fullRes);
      }
    }
  };

  const prefetchDiscoveryVisible = async (profile, controls = {}) => {
    if (controls.shouldDefer && controls.shouldDefer()) {
      throw createDeferredError('discovery');
    }

    const cacheKey = buildDiscoveryCacheKey(profile);
    if (!cacheKey) return;

    const cached = storage.get(cacheKey);
    if (cached && cached.ts && (Date.now() - cached.ts) < DISCOVERY_STATUS_CACHE_TTL_MS) {
      return;
    }

    const birth = {
      date: profile.birthDate,
      time: profile.birthTime || '12:00',
      city: profile.birthCity || '',
      lat: profile.lat,
      lon: profile.lon,
      timezone: profile.timezone || 'Asia/Shanghai',
      accuracy: profile.accuracyLevel === 'approximate' ? 'approximate' : 'exact',
    };

    const reportTypes = ['love-topic', 'career-topic', 'wealth-topic'];
    const statuses = {};

    if (controls.shouldDefer && controls.shouldDefer()) {
      throw createDeferredError('discovery');
    }

    const results = await Promise.allSettled(
      reportTypes.map((reportType) =>
        request({
          url: API_ENDPOINTS.REPORT_STATUS,
          method: 'GET',
          data: { reportType, birth: JSON.stringify(birth) },
          timeout: PRELOAD_TIMEOUT_MS,
        }).then((result) => ({ reportType, result }))
      )
    );

    results.forEach((entry, i) => {
      const reportType = reportTypes[i];
      if (entry.status === 'fulfilled') {
        const { result } = entry.value;
        statuses[reportType] = {
          status: result && result.exists ? result.status : 'none',
          progress: result && result.exists ? (result.progress || 0) : 0,
        };
      } else {
        logger.warn('[tab-preload] discovery status failed:', reportType, entry.reason?.statusCode || entry.reason?.message || entry.reason);
        statuses[reportType] = { status: 'none', progress: 0 };
      }
    });

    storage.set(cacheKey, { ts: Date.now(), statuses });
  };

  const prefetchMeVisible = async (profile, controls = {}) => {
    if (controls.shouldDefer && controls.shouldDefer()) {
      throw createDeferredError('me');
    }

    const token = storage.get('access_token');
    if (!token) return;

    const result = await request({ url: API_ENDPOINTS.USER_PROFILE, method: 'GET', timeout: PRELOAD_TIMEOUT_MS });
    if (result) {
      updateStoredUserProfile(result);
    }
  };

  const taskMap = {
    self: prefetchSelfVisible,
    daily: prefetchDailyVisible,
    discovery: prefetchDiscoveryVisible,
    me: prefetchMeVisible,
  };

  const clearRetry = (tabId) => {
    if (state.retryMeta[tabId]) {
      delete state.retryMeta[tabId];
    }
  };

  const markRetry = (tabId) => {
    const previous = state.retryMeta[tabId] || { failCount: 0, nextAt: 0 };
    const failCount = previous.failCount + 1;
    const delay = Math.min(PRELOAD_RETRY_MAX_MS, PRELOAD_RETRY_BASE_MS * Math.pow(2, failCount - 1));
    state.retryMeta[tabId] = {
      failCount,
      nextAt: Date.now() + delay,
    };
    return delay;
  };

  const isRetryCooling = (tabId) => {
    const meta = state.retryMeta[tabId];
    return !!(meta && meta.nextAt > Date.now());
  };

  const pickNextTab = (exclude) => state.queue.find((tab) => !state.done.has(tab) && !isRetryCooling(tab) && !(exclude && exclude.has(tab)));

  const scheduleRetryRun = () => {
    if (state.retryTimer) return;
    const candidates = state.queue
      .filter((tab) => !state.done.has(tab))
      .map((tab) => state.retryMeta[tab] && state.retryMeta[tab].nextAt)
      .filter(Boolean);

    if (!candidates.length) return;

    const now = Date.now();
    const nextAt = Math.min(...candidates);
    const delay = Math.max(200, nextAt - now);

    state.retryTimer = setTimeout(() => {
      state.retryTimer = null;
      run();
    }, delay);
  };

  const processTab = async (tabId, profile) => {
    const task = taskMap[tabId];
    if (!task) {
      state.done.add(tabId);
      return 'skipped';
    }
    try {
      await task(profile, {
        shouldDefer: () => state.paused || state.deferredTabs.has(tabId),
        tabId,
      });
      return 'success';
    } catch (error) {
      if (error && error.code === 'PRELOAD_DEFERRED') return 'deferred';
      throw error;
    }
  };

  const run = async () => {
    if (state.running || !state.homeReady || state.paused) return;
    if (state.retryTimer) {
      clearTimeout(state.retryTimer);
      state.retryTimer = null;
    }

    const profile = ensureProfileContext();
    if (!profile) return;

    state.running = true;
    try {
      while (!state.paused && state.homeReady) {
        const currentProfile = ensureProfileContext();
        if (!currentProfile) break;

        // 选取最多 PRELOAD_CONCURRENCY 个 Tab 并行预加载
        const batch = [];
        const picked = new Set();
        for (let i = 0; i < PRELOAD_CONCURRENCY; i++) {
          const tab = pickNextTab(picked);
          if (!tab) break;
          picked.add(tab);
          batch.push(tab);
        }

        if (batch.length === 0) {
          scheduleRetryRun();
          break;
        }

        batch.forEach((tab) => state.activeTabs.add(tab));

        const results = await Promise.allSettled(
          batch.map((tabId) => processTab(tabId, currentProfile).then(
            (status) => ({ tabId, status }),
            (error) => ({ tabId, status: 'failed', error })
          ))
        );

        state.activeTabs.clear();

        for (const entry of results) {
          const { tabId, status, error } = entry.status === 'fulfilled' ? entry.value : entry.reason || {};
          if (!tabId) continue;
          if (status === 'success' || status === 'skipped') {
            clearRetry(tabId);
            state.done.add(tabId);
          } else if (status === 'deferred') {
            logger.log('[tab-preload] task deferred by user interaction:', tabId);
            state.deferredTabs.delete(tabId);
          } else {
            const retryDelay = markRetry(tabId);
            logger.warn('[tab-preload] task failed:', tabId, error?.statusCode || error?.message || error, `retry in ${retryDelay}ms`);
          }
        }

        if (!state.queue.some((t) => !state.done.has(t) && !isRetryCooling(t))) {
          scheduleRetryRun();
          break;
        }
      }
    } finally {
      state.activeTabs.clear();
      state.deferredTabs.clear();
      state.running = false;
    }
  };

  return {
    markHomeReady() {
      state.homeReady = true;
      ensureProfileContext();
      run();
    },

    notifyTabActivated(tabId) {
      state.paused = true;
      // 标记所有正在进行的非目标 Tab 为延迟
      for (const activeTab of state.activeTabs) {
        if (activeTab !== tabId && !state.done.has(activeTab)) {
          state.deferredTabs.add(activeTab);
          state.queue = [...state.queue.filter((item) => item !== activeTab), activeTab];
        }
      }
      if (tabId && state.queue.includes(tabId)) {
        state.queue = [tabId, ...state.queue.filter((item) => item !== tabId)];
      }
      if (state.resumeTimer) clearTimeout(state.resumeTimer);
      state.resumeTimer = setTimeout(() => {
        state.paused = false;
        state.deferredTabs.clear();
        state.resumeTimer = null;
        run();
      }, USER_INTERACTION_PAUSE_MS);
    },

    reset() {
      resetForProfile('');
      state.homeReady = false;
      state.paused = false;
      state.activeTabs.clear();
      state.deferredTabs.clear();
      if (state.resumeTimer) {
        clearTimeout(state.resumeTimer);
        state.resumeTimer = null;
      }
      if (state.retryTimer) {
        clearTimeout(state.retryTimer);
        state.retryTimer = null;
      }
      state.retryMeta = {};
    },
  };
};

module.exports = {
  createTabPreloader,
  buildDailyTransitCacheKey,
  buildDailyFullCacheKey,
  buildDiscoveryCacheKey,
  buildSelfChartCacheKey,
  buildProfileFingerprint,
};
