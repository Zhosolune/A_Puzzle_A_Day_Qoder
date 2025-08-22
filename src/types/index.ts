// 类型定义入口文件 - 统一导出所有类型

// 游戏核心类型
export * from './game';

// 状态管理类型  
export * from './store';

// 平台适配类型
export * from './platform';

// 常用类型别名
export type Coordinates = { x: number; y: number };
export type Size = { width: number; height: number };
export type Rectangle = Coordinates & Size;

// 颜色类型
export type Color = string; // 支持 hex、rgb、rgba、hsl 等格式

// 时间相关类型
export type Timestamp = number; // Unix时间戳（毫秒）
export type Duration = number;  // 持续时间（毫秒）

// 回调函数类型
export type Callback = () => void;
export type CallbackWithParam<T> = (param: T) => void;
export type AsyncCallback<T = void> = () => Promise<T>;

// 可选属性工具类型
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// 深度只读类型
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

// 深度可选类型
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// API响应基础类型
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: number;
}

// 分页数据类型
export interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// 配置项类型
export interface ConfigOption<T = unknown> {
  key: string;
  value: T;
  default: T;
  description?: string;
  validation?: (value: T) => boolean;
}

// 日志级别
export const LogLevel = {
  DEBUG: 'debug',
  INFO: 'info', 
  WARN: 'warn',
  ERROR: 'error'
} as const;

export type LogLevel = typeof LogLevel[keyof typeof LogLevel];

// 日志条目
export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Timestamp;
  source?: string;
  data?: unknown;
}