// 游戏基础类型定义

// 网格位置坐标
export interface GridPosition {
  row: number;
  col: number;
}

// 网格单元状态
export const CellState = {
  EMPTY: 'empty',        // 空格子
  OCCUPIED: 'occupied',  // 被拼图块占用
  RESERVED: 'reserved',  // 日期相关的目标格子
  BLOCKED: 'blocked'     // 不可用格子
} as const;

export type CellState = typeof CellState[keyof typeof CellState];

// 网格布局配置
export interface GridLayout {
  width: number;          // 网格宽度（列数）
  height: number;         // 网格高度（行数）
  totalCells: number;     // 总格子数
  
  // 预留格子位置定义
  reservedCells: {
    months: GridPosition[];    // 月份标签位置（1-12月）
    days: GridPosition[];      // 日期标签位置（1-31日）  
    weekdays: GridPosition[];  // 星期标签位置（周一到周日）
  };
}

// 网格单元数据
export interface GridCell {
  position: GridPosition;
  state: CellState;
  pieceId?: string;       // 占用该格子的拼图块ID
  label?: string;         // 格子标签（月份、日期、星期）
  isTarget?: boolean;     // 是否为当日目标空格
}

// 拼图块形状数据
export interface PuzzlePieceShape {
  id: string;
  name: string;
  shape: boolean[][];     // 二维数组表示形状，true为实际占用的格子
  width: number;          // 形状宽度
  height: number;         // 形状高度
  color: string;          // 拼图块颜色
}

// 拼图块状态
export interface PuzzlePieceState {
  id: string;
  shapeId: string;        // 对应的形状ID
  isPlaced: boolean;      // 是否已放置在网格上
  position?: GridPosition; // 放置位置（左上角）
  rotation: 0 | 90 | 180 | 270; // 旋转角度
  isFlippedHorizontally: boolean; // 是否水平翻转
  isFlippedVertically: boolean;   // 是否垂直翻转
  isDragging: boolean;    // 是否正在拖拽
  isSelected: boolean;    // 是否被选中
}

// 已放置的拼图块
export interface PlacedPiece {
  pieceId: string;
  shapeId: string;
  position: GridPosition; // 左上角位置
  rotation: 0 | 90 | 180 | 270;
  isFlippedHorizontally: boolean; // 是否水平翻转
  isFlippedVertically: boolean;   // 是否垂直翻转
  occupiedCells: GridPosition[]; // 实际占用的格子列表
  zIndex: number; // 放置顺序（后放置的值更大）
}

// 日期目标配置
export interface DateTarget {
  date: Date;
  targetPositions: {
    month: GridPosition;    // 月份目标位置
    day: GridPosition;      // 日期目标位置
    weekday: GridPosition;  // 星期目标位置
  };
}

// 游戏难度等级
export type GameDifficulty = 'easy' | 'medium' | 'hard';

// 游戏状态常量
export const GameStatus = {
  MENU: 'menu',           // 主菜单
  PLAYING: 'playing',     // 游戏中
  PAUSED: 'paused',       // 暂停
  COMPLETED: 'completed', // 完成
  FAILED: 'failed'        // 失败
} as const;

export type GameStatus = typeof GameStatus[keyof typeof GameStatus];

// 移动操作记录
export interface GameMove {
  id: string;
  timestamp: number;
  type: 'place' | 'remove' | 'rotate';
  pieceId: string;
  fromPosition?: GridPosition;
  toPosition?: GridPosition;
  rotation?: number;
}

// 游戏统计数据
export interface GameStats {
  moveCount: number;       // 移动次数
  startTime: number;       // 开始时间戳
  endTime?: number;        // 结束时间戳
  elapsedTime: number;     // 已用时间（毫秒）
  hintsUsed: number;       // 提示使用次数
  difficulty: GameDifficulty;
}

// 拖拽状态
export interface DragState {
  isDragging: boolean;
  draggedPiece: PuzzlePieceState | null;
  dragOffset: { x: number; y: number };
  currentGridPosition: GridPosition | null;
  isValidPosition: boolean;
  previewCells: GridPosition[];     // 预览占用的格子
  // 全局拖拽坐标（相对于页面）
  globalMousePosition: { x: number; y: number } | null;
  // 是否在有效拖拽区域内（GameBoard区域）
  isInValidDropZone: boolean;
  // 存放区域信息
  originalStorageArea?: 'left' | 'right';
  originalStorageIndex?: number;
}