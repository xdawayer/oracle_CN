const { request } = require('../../utils/request');
const logger = require('../../utils/logger');

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day} ${h}:${min}`;
};

Page({
  data: {
    records: [],
    loading: false,
    hasMore: true,
    page: 1,
    pageSize: 20,
  },

  onLoad() {
    this.fetchRecords();
  },

  async fetchRecords() {
    if (this.data.loading) return;
    this.setData({ loading: true });

    try {
      const res = await request({
        url: `/api/user/points-history?page=${this.data.page}&pageSize=${this.data.pageSize}`,
      });

      if (res && res.records) {
        const newRecords = res.records.map(item => ({
          ...item,
          dateFormatted: formatDate(item.date),
        }));

        this.setData({
          records: [...this.data.records, ...newRecords],
          hasMore: res.hasMore,
          page: this.data.page + 1,
          loading: false,
        });
      } else {
        this.setData({ loading: false, hasMore: false });
      }
    } catch (err) {
      logger.error('Fetch points history error:', err);
      this.setData({ loading: false });
    }
  },

  onLoadMore() {
    if (this.data.hasMore && !this.data.loading) {
      this.fetchRecords();
    }
  },
});
