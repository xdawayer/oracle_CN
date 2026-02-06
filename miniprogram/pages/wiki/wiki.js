const { request } = require('../../utils/request');
const { API_ENDPOINTS } = require('../../services/api');

const AREA_NAMES = {
  career: '事业',
  love: '感情',
  spiritual: '灵性',
  health: '健康',
  finance: '财务',
  family: '家庭',
  social: '社交',
};

const CATEGORIES = [
  { id: 'all', name: '全部' },
  { id: 'planets', name: '天体' },
  { id: 'signs', name: '原型' },
  { id: 'houses', name: '领域' },
  { id: 'aspects', name: '关联' },
  { id: 'elements', name: '元素' },
  { id: 'modalities', name: '模式' },
  { id: 'axes', name: '轴线' },
  { id: 'chart_types', name: '分析类型' },
];

Page({
  data: {
    categories: CATEGORIES,
    selectedCat: 'all',
    searchQuery: '',
    items: [],
    filteredItems: [],
    selectedItem: null,
    detailSections: [],
    isLoading: false,
  },

  onLoad(options) {
    if (options && options.keyword) {
      this.setData({ searchQuery: decodeURIComponent(options.keyword) });
    }
    this.fetchWikiItems();
  },

  async fetchWikiItems() {
    this.setData({ isLoading: true });
    try {
      const res = await request({ url: `${API_ENDPOINTS.WIKI_ITEMS}?lang=zh` });
      let rawItems = [];
      
      if (res && res.items) {
        rawItems = res.items;
      }

      // Enrich items with category name for display
      const enrichedItems = rawItems.map(item => {
        const cat = CATEGORIES.find(c => c.id === item.type);
        return {
          ...item,
          categoryName: cat ? cat.name : item.type
        };
      });

      this.setData({
        items: enrichedItems,
        filteredItems: enrichedItems
      }, () => {
        if (this.data.searchQuery) {
          this.filterItems();
        }
      });
    } catch (error) {
      console.error('Failed to fetch wiki items:', error);
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ isLoading: false });
    }
  },

  onSelectCategory(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ selectedCat: id }, () => {
      this.filterItems();
    });
  },

  onSearchInput(e) {
    const query = e.detail.value;
    this.setData({ searchQuery: query });
    if (this._searchTimer) clearTimeout(this._searchTimer);
    this._searchTimer = setTimeout(() => this.filterItems(), 250);
  },

  onClearSearch() {
    this.setData({ searchQuery: '' }, () => {
      this.filterItems();
    });
  },

  filterItems() {
    const { items, selectedCat, searchQuery } = this.data;
    const query = searchQuery.trim().toLowerCase();

    // 空格分词，所有关键词都需匹配
    const tokens = query.split(/\s+/).filter(Boolean);

    const filtered = items.filter(item => {
      const matchCat = selectedCat === 'all' || item.type === selectedCat;
      if (!matchCat) return false;
      if (!tokens.length) return true;

      // 构建搜索文本池：title、subtitle、description、keywords、prototype、analogy
      const searchPool = [
        item.title,
        item.subtitle,
        item.description,
        item.prototype,
        item.analogy,
        ...(item.keywords || [])
      ].filter(Boolean).join(' ').toLowerCase();

      // 所有关键词都必须在搜索池中匹配
      return tokens.every(token => searchPool.includes(token));
    });

    this.setData({ filteredItems: filtered });
  },

  onSelectItem(e) {
    const item = e.currentTarget.dataset.item;
    if (!item || !item.id) return;
    this.fetchItemDetail(item.id, item);
  },

  async fetchItemDetail(id, summary) {
    this.setData({ isLoading: true });
    try {
      const res = await request({ url: `${API_ENDPOINTS.WIKI_ITEMS}/${id}?lang=zh` });
      if (res && res.item) {
        const cat = CATEGORIES.find(c => c.id === res.item.type);
        const item = { ...res.item, categoryName: cat ? cat.name : res.item.type };
        const detailSections = this.buildDetailSections(item);
        this.setData({ selectedItem: item, detailSections });
      } else if (summary) {
        const detailSections = this.buildDetailSections(summary);
        this.setData({ selectedItem: summary, detailSections });
      }
    } catch (error) {
      console.error('Failed to fetch wiki detail:', error);
      wx.showToast({ title: '加载失败', icon: 'none' });
      if (summary) {
        const detailSections = this.buildDetailSections(summary);
        this.setData({ selectedItem: summary, detailSections });
      }
    } finally {
      this.setData({ isLoading: false });
    }
  },

  /**
   * 将 WikiItem 字段映射为 detail-card 分段数据
   * 参考 design.md 的分段映射表
   */
  buildDetailSections(item) {
    if (!item) return [];
    const sections = [];

    // 1. 核心要义（始终显示）
    if (item.description) {
      sections.push({ title: '核心要义', text: item.description, cardColor: 'accent-red' });
    }

    // 2. 天文与神话
    if (item.astronomy_myth) {
      sections.push({ title: '天文与神话', text: item.astronomy_myth, cardColor: 'info' });
    }

    // 3. 心理学解读
    if (item.psychology) {
      sections.push({ title: '心理学解读', text: item.psychology, cardColor: 'info' });
    }

    // 4. 阴影面
    if (item.shadow) {
      sections.push({ title: '阴影面', text: item.shadow, cardColor: 'warning' });
    }

    // 5. 整合之道
    if (item.integration) {
      sections.push({ title: '整合之道', text: item.integration, cardColor: 'success' });
    }

    // 6. 生活领域
    if (Array.isArray(item.life_areas) && item.life_areas.length) {
      const list = item.life_areas.map(la => {
        const areaLabel = AREA_NAMES[la.area] || la.area || '';
        const desc = la.description || '';
        return areaLabel ? `${areaLabel}：${desc}` : desc;
      }).filter(Boolean);
      if (list.length) {
        sections.push({ title: '生活领域', list, cardColor: 'default' });
      }
    }

    // 7. 实用建议
    if (Array.isArray(item.practical_tips) && item.practical_tips.length) {
      sections.push({ title: '实用建议', list: item.practical_tips, cardColor: 'success' });
    }

    // 8. 常见误区
    if (Array.isArray(item.common_misconceptions) && item.common_misconceptions.length) {
      sections.push({ title: '常见误区', list: item.common_misconceptions, cardColor: 'warning' });
    }

    // 9. 成长路径
    if (item.growth_path) {
      sections.push({ title: '成长路径', text: item.growth_path, cardColor: 'success' });
    }

    // 10. 深度探索
    if (Array.isArray(item.deep_dive) && item.deep_dive.length) {
      const list = item.deep_dive.map(step => {
        const num = step.step || '';
        const title = step.title || '';
        const desc = step.description || '';
        return num ? `第${num}步 ${title}：${desc}` : `${title}：${desc}`;
      }).filter(Boolean);
      if (list.length) {
        sections.push({ title: '深度探索', list, cardColor: 'info' });
      }
    }

    // 11. 肯定语
    if (item.affirmation) {
      sections.push({ title: '肯定语', text: item.affirmation, cardColor: 'accent-red' });
    }

    // 12. 组合解读
    if (item.combinations) {
      sections.push({ title: '组合解读', text: item.combinations, cardColor: 'default' });
    }

    return sections;
  },

  onCloseDetail() {
    this.setData({ selectedItem: null, detailSections: [] });
  },

  onNavigateBack() {
    wx.navigateBack();
  },

  // Prevent tap propagation
  noop() {}
});
