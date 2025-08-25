// 微信小游戏平台适配器
declare const wx: any;

export class WechatAdapter {
  static isWechat(): boolean {
    return typeof wx !== 'undefined' && wx.getSystemInfo;
  }

  // 存储相关
  static setStorage(key: string, data: any): void {
    if (this.isWechat()) {
      wx.setStorageSync(key, data);
    } else {
      localStorage.setItem(key, JSON.stringify(data));
    }
  }

  static getStorage(key: string): any {
    if (this.isWechat()) {
      return wx.getStorageSync(key);
    } else {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    }
  }

  // 分享功能
  static shareGame(data: { title: string; desc: string; imageUrl?: string }): void {
    if (this.isWechat()) {
      wx.shareAppMessage({
        title: data.title,
        desc: data.desc,
        imageUrl: data.imageUrl,
        success: () => console.log('分享成功'),
        fail: (err: any) => console.error('分享失败', err)
      });
    }
  }

  // 震动反馈
  static vibrate(type: 'short' | 'long' = 'short'): void {
    if (this.isWechat()) {
      if (type === 'short') {
        wx.vibrateShort();
      } else {
        wx.vibrateLong();
      }
    }
  }

  // 显示提示
  static showToast(title: string, icon: 'success' | 'error' | 'none' = 'none'): void {
    if (this.isWechat()) {
      wx.showToast({ title, icon });
    }
  }
}