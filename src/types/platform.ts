import type { GameProgress, UserSettings, GameHistory } from './store';

// 存储适配器接口
export interface StorageAdapter {
  // 基础存储操作
  saveProgress(progress: GameProgress): Promise<void>;
  loadProgress(date: string): Promise<GameProgress | null>;
  getCompletedDays(): Promise<string[]>;
  
  // 设置存储
  saveSettings(settings: UserSettings): Promise<void>;
  loadSettings(): Promise<UserSettings>;
  
  // 历史记录
  saveHistory(history: GameHistory): Promise<void>;
  loadHistory(): Promise<GameHistory>;
  
  // 数据管理
  clearData(): Promise<void>;
  exportData(): Promise<string>;
  importData(data: string): Promise<void>;
  
  // 存储状态
  getStorageInfo(): Promise<StorageInfo>;
}

// 存储信息
export interface StorageInfo {
  usedSpace: number;      // 已用空间（字节）
  totalSpace?: number;    // 总空间（字节），undefined表示无限制
  isAvailable: boolean;   // 存储是否可用
  supportsBulkOperations: boolean; // 是否支持批量操作
}

// 平台API适配器接口
export interface PlatformAdapter {
  // 平台信息
  getPlatformInfo(): PlatformInfo;
  
  // 存储操作
  getStorageAdapter(): StorageAdapter;
  
  // 分享功能
  shareGame?(data: ShareData): Promise<boolean>;
  
  // 系统集成
  showNotification?(message: string): Promise<void>;
  
  // 生命周期
  onAppShow?(callback: () => void): void;
  onAppHide?(callback: () => void): void;
  onAppDestroy?(callback: () => void): void;
  
  // 性能监控
  reportPerformance?(data: PerformanceData): void;
}

// 平台信息
export interface PlatformInfo {
  name: string;           // 平台名称
  version: string;        // 平台版本
  userAgent?: string;     // 用户代理
  
  // 能力检测
  capabilities: {
    touch: boolean;       // 触摸支持
    mouse: boolean;       // 鼠标支持
    keyboard: boolean;    // 键盘支持
    gamepad: boolean;     // 手柄支持
    vibration: boolean;   // 震动支持
    fullscreen: boolean;  // 全屏支持
    offline: boolean;     // 离线支持
  };
  
  // 屏幕信息
  screen: {
    width: number;
    height: number;
    pixelRatio: number;
    orientation: 'portrait' | 'landscape';
  };
}

// 分享数据
export interface ShareData {
  title: string;
  description: string;
  imageUrl?: string;
  url?: string;
  extra?: Record<string, unknown>;
}

// 性能数据
export interface PerformanceData {
  gameLoadTime: number;     // 游戏加载时间
  averageFPS: number;       // 平均帧率
  memoryUsage: number;      // 内存使用量
  renderTime: number;       // 渲染时间
  interactionDelay: number; // 交互延迟
}

// Web平台特定类型
export interface WebPlatformConfig {
  indexedDBName: string;
  indexedDBVersion: number;
  serviceWorkerUrl?: string;
  manifestUrl?: string;
}

// 微信小游戏特定类型
export interface WechatPlatformConfig {
  appId: string;
  cloudStorageEnabled: boolean;
  shareMenuEnabled: boolean;
  vibrationEnabled: boolean;
}

// Electron桌面端特定类型
export interface ElectronPlatformConfig {
  appName: string;
  appVersion: string;
  userDataPath: string;
  autoUpdaterEnabled: boolean;
  systemTrayEnabled: boolean;
}

// 平台检测结果
export interface PlatformDetection {
  platform: 'web' | 'wechat' | 'electron' | 'unknown';
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  browser?: {
    name: string;
    version: string;
  };
  os?: {
    name: string;
    version: string;
  };
}

// 平台事件类型
export type PlatformEvent = 
  | { type: 'APP_SHOW'; payload: Record<string, never> }
  | { type: 'APP_HIDE'; payload: Record<string, never> }
  | { type: 'APP_DESTROY'; payload: Record<string, never> }
  | { type: 'NETWORK_CHANGE'; payload: { online: boolean } }
  | { type: 'ORIENTATION_CHANGE'; payload: { orientation: string } }
  | { type: 'VISIBILITY_CHANGE'; payload: { visible: boolean } }
  | { type: 'STORAGE_QUOTA_EXCEEDED'; payload: { usedSpace: number } };

export interface PlatformEventHandler {
  (event: PlatformEvent): void;
}

// 错误处理类型
export interface PlatformError extends Error {
  platform: string;
  code: string;
  details?: Record<string, unknown>;
}

// 平台初始化配置
export interface PlatformInitConfig {
  platform: 'web' | 'wechat' | 'electron';
  debug: boolean;
  autoDetect: boolean;
  fallbackPlatform: 'web';
  
  // 各平台特定配置
  web?: WebPlatformConfig;
  wechat?: WechatPlatformConfig;
  electron?: ElectronPlatformConfig;
}