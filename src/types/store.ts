import type { 
  GridCell, 
  GridPosition, 
  PuzzlePieceState, 
  PlacedPiece, 
  DateTarget,
  GameStatus,
  GameStats,
  DragState,
  GameMove,
  GameDifficulty
} from './game';

// 主游戏状态接口
export interface GameState {
  // 基础游戏状态
  status: GameStatus;
  isInitialized: boolean;
  
  // 当前日期和目标
  currentDate: Date;
  dateTarget: DateTarget;
  
  // 网格状态
  gridCells: GridCell[][];          // 二维网格数组
  
  // 拼图块状态
  availablePieces: PuzzlePieceState[];  // 可用的拼图块
  placedPieces: Map<string, PlacedPiece>; // 已放置的拼图块
  
  // 交互状态
  selectedPieceId: string | null;
  dragState: DragState;
  
  // 游戏统计和历史
  currentStats: GameStats;
  moveHistory: GameMove[];
  
  // UI状态
  showHints: boolean;
  showGrid: boolean;
  soundEnabled: boolean;
  animationEnabled: boolean;
}

// 游戏状态操作接口
export interface GameActions {
  // 游戏控制
  initializeGame: (date?: Date) => void;
  startNewGame: (date?: Date) => void;
  pauseGame: () => void;
  resumeGame: () => void;
  resetGame: () => void;
  
  // 拼图块操作
  selectPiece: (pieceId: string) => void;
  deselectPiece: () => void;
  placePiece: (pieceId: string, position: GridPosition) => boolean;
  removePiece: (pieceId: string) => void;
  rotatePiece: (pieceId: string) => void;
  flipPieceHorizontally: (pieceId: string) => void;
  flipPieceVertically: (pieceId: string) => void;
  
  // 拖拽操作
  startDrag: (pieceId: string, offset: { x: number; y: number }, storageArea?: 'left' | 'right', storageIndex?: number) => void;
  updateDrag: (position: GridPosition | null) => void;
  updateGlobalDrag: (globalPosition: { x: number; y: number }, isInValidDropZone: boolean) => void;
  endDrag: (position?: GridPosition) => boolean;
  
  // 游戏验证
  checkWinCondition: () => boolean;
  validatePlacement: (pieceId: string, position: GridPosition) => boolean;
  getAvailablePositions: (pieceId: string) => GridPosition[];
  
  // 辅助功能
  getHint: () => GridPosition | null;

  // 存放区域管理
  setStorageAreaRefs: (leftRef: React.RefObject<HTMLDivElement | null>, rightRef: React.RefObject<HTMLDivElement | null>) => void;
  setGameBoardRef: (gameBoardRef: React.RefObject<HTMLCanvasElement | null>) => void;
  checkDropZone: (globalPosition: { x: number; y: number }) => 'gameboard' | 'left-storage' | 'right-storage' | 'invalid';
  undoLastMove: () => void;
  redoMove: () => void;
  
  // 设置
  toggleSound: () => void;
  toggleAnimation: () => void;
  toggleHints: () => void;
  toggleGrid: () => void;
  setDifficulty: (difficulty: GameDifficulty) => void;
}

// 组合的游戏Store类型
export type GameStore = GameState & GameActions;

// 游戏进度保存数据
export interface GameProgress {
  date: string;                    // YYYY-MM-DD格式
  isCompleted: boolean;
  moveCount: number;
  completionTime?: number;         // 完成时间（毫秒）
  solution: PlacedPiece[];         // 解题方案
  difficulty: GameDifficulty;
  
  // 时间戳
  createdAt: number;
  updatedAt: number;
}

// 用户设置
export interface UserSettings {
  soundEnabled: boolean;
  animationEnabled: boolean;
  hintsEnabled: boolean;
  gridVisible: boolean;
  difficulty: GameDifficulty;
  theme: 'light' | 'dark';
  
  // 游戏偏好
  autoSave: boolean;
  showTimer: boolean;
  showMoveCount: boolean;
}

// 游戏历史记录
export interface GameHistory {
  completedDays: string[];         // 已完成的日期列表
  totalGamesPlayed: number;
  totalGamesCompleted: number;
  averageCompletionTime: number;
  bestCompletionTime: number;
  currentStreak: number;           // 当前连续完成天数
  longestStreak: number;           // 最长连续记录
  
  // 按难度统计
  statisticsByDifficulty: {
    [key in GameDifficulty]: {
      played: number;
      completed: number;
      averageTime: number;
      bestTime: number;
    }
  };
}

// 平台适配相关类型
export interface PlatformConfig {
  platform: 'web' | 'wechat' | 'electron';
  features: {
    canShare: boolean;
    canSaveFile: boolean;
    canNotify: boolean;
    hasCloudStorage: boolean;
  };
  storage: {
    maxSize: number;        // 存储限制（字节）
    persistent: boolean;    // 是否持久化
  };
}

// 事件系统类型
export type GameEvent = 
  | { type: 'GAME_STARTED'; payload: { date: Date } }
  | { type: 'PIECE_PLACED'; payload: { pieceId: string; position: GridPosition } }
  | { type: 'PIECE_REMOVED'; payload: { pieceId: string } }
  | { type: 'GAME_COMPLETED'; payload: { stats: GameStats } }
  | { type: 'GAME_PAUSED'; payload: Record<string, never> }
  | { type: 'GAME_RESUMED'; payload: Record<string, never> }
  | { type: 'HINT_REQUESTED'; payload: Record<string, never> }
  | { type: 'SETTINGS_CHANGED'; payload: Partial<UserSettings> };

export interface GameEventHandler {
  (event: GameEvent): void;
}