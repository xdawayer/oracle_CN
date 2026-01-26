const { request } = require('../../utils/request');
const { API_ENDPOINTS } = require('../../services/api');

const CATEGORIES = [
  { id: 'all', name: '全部' },
  { id: 'planets', name: '行星' },
  { id: 'signs', name: '星座' },
  { id: 'houses', name: '宫位' },
  { id: 'aspects', name: '相位' },
  { id: 'elements', name: '元素' },
  { id: 'modalities', name: '模式' },
  { id: 'axes', name: '轴线' },
  { id: 'chart_types', name: '盘型' },
];

Page({
  data: {
    categories: CATEGORIES,
    selectedCat: 'all',
    searchQuery: '',
    items: [],
    filteredItems: [],
    selectedItem: null,
    isLoading: false,
  },

  onLoad() {
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
    this.setData({ searchQuery: query }, () => {
      this.filterItems();
    });
  },

  onClearSearch() {
    this.setData({ searchQuery: '' }, () => {
      this.filterItems();
    });
  },

  filterItems() {
    const { items, selectedCat, searchQuery } = this.data;
    const query = searchQuery.toLowerCase();
    
    const filtered = items.filter(item => {
      const matchCat = selectedCat === 'all' || item.type === selectedCat;
      const matchSearch = !query || 
        (item.title && item.title.toLowerCase().includes(query)) || 
        (item.description && item.description.toLowerCase().includes(query));
      return matchCat && matchSearch;
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
        this.setData({ selectedItem: { ...res.item, categoryName: cat ? cat.name : res.item.type } });
      } else if (summary) {
        this.setData({ selectedItem: summary });
      }
    } catch (error) {
      console.error('Failed to fetch wiki detail:', error);
      wx.showToast({ title: '加载失败', icon: 'none' });
      if (summary) {
        this.setData({ selectedItem: summary });
      }
    } finally {
      this.setData({ isLoading: false });
    }
  },

  onCloseDetail() {
    this.setData({ selectedItem: null });
  },

  onNavigateBack() {
    wx.navigateBack();
  },

  // Prevent tap propagation
  noop() {}
});
