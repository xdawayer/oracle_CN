const storage = require('../utils/storage');

module.exports = Behavior({
  data: {
    _avatarRetried: false,
  },
  methods: {
    onAvatarLoadError() {
      // 首次失败可能是瞬时网络抖动，重试一次
      if (!this.data._avatarRetried && this.data.avatarUrl) {
        this.setData({ _avatarRetried: true });
        // 通过清空再恢复 src 触发重新加载
        const url = this.data.avatarUrl;
        this.setData({ avatarUrl: '' });
        setTimeout(() => {
          this.setData({ avatarUrl: url });
        }, 1000);
        return;
      }
      // 重试后仍失败，确认头像失效
      storage.remove('user_avatar');
      if (this.data.avatarUrl) {
        this.setData({ avatarUrl: '', _avatarRetried: false });
      }
    },
  },
});
