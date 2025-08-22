import type { GridLayout, GridPosition } from '../types';

/**
 * 游戏网格布局配置
 * 
 * 网格布局：8行 x 7列 = 56个格子
 * 不可用位置：(7,1)、(7,2)、(1,8)、(2,8)、(3,8)、(4,8)
 * 
 * 布局说明：
 * - 前2行共6列：月份标签（1-12月）
 * - 3-6行 + 7行前3格：日期标签（1-31日）
 * - 7行后7格：星期标签（周日-周六）
 */

// 网格基础配置
export const GRID_CONFIG = {
  WIDTH: 7,  // 7列
  HEIGHT: 8, // 8行
  TOTAL_CELLS: 56,
  CELL_SIZE: 40, // 每个格子的像素大小
  GAP: 2 // 格子间隙
} as const;

// 不可用位置（基于用户坐标系：左上角(1,1)，右上角(7,1)，左下角(1,8)）
// 用户坐标格式为(列,行)，从1开始计数，我们的数组索引从0开始
const BLOCKED_POSITIONS: GridPosition[] = [
  { row: 0, col: 6 }, // (7,1) -> 第7列第1行
  { row: 1, col: 6 }, // (7,2) -> 第7列第2行
  { row: 7, col: 0 }, // (1,8) -> 第1列第8行
  { row: 7, col: 1 }, // (2,8) -> 第2列第8行
  { row: 7, col: 2 }, // (3,8) -> 第3列第8行
  { row: 7, col: 3 }  // (4,8) -> 第4列第8行
];

// 月份标签位置（1-12月）- 前2行共6列可用
const MONTH_POSITIONS: GridPosition[] = [
  // 第一行：1-6月
  { row: 0, col: 0 }, // 1月
  { row: 0, col: 1 }, // 2月
  { row: 0, col: 2 }, // 3月
  { row: 0, col: 3 }, // 4月
  { row: 0, col: 4 }, // 5月
  { row: 0, col: 5 }, // 6月
  
  // 第二行：7-12月
  { row: 1, col: 0 }, // 7月
  { row: 1, col: 1 }, // 8月
  { row: 1, col: 2 }, // 9月
  { row: 1, col: 3 }, // 10月
  { row: 1, col: 4 }, // 11月
  { row: 1, col: 5 }  // 12月
];

// 日期标签位置（1-31日）- 3-6行全部 + 7行前3格
const DAY_POSITIONS: GridPosition[] = [
  // 第3行：1-7日（全7列可用）
  { row: 2, col: 0 }, { row: 2, col: 1 }, { row: 2, col: 2 }, { row: 2, col: 3 },
  { row: 2, col: 4 }, { row: 2, col: 5 }, { row: 2, col: 6 },
  
  // 第4行：8-14日（全7列可用）
  { row: 3, col: 0 }, { row: 3, col: 1 }, { row: 3, col: 2 }, { row: 3, col: 3 },
  { row: 3, col: 4 }, { row: 3, col: 5 }, { row: 3, col: 6 },
  
  // 第5行：15-21日（全7列可用）
  { row: 4, col: 0 }, { row: 4, col: 1 }, { row: 4, col: 2 }, { row: 4, col: 3 },
  { row: 4, col: 4 }, { row: 4, col: 5 }, { row: 4, col: 6 },
  
  // 第6行：22-28日（全7列可用）
  { row: 5, col: 0 }, { row: 5, col: 1 }, { row: 5, col: 2 }, { row: 5, col: 3 },
  { row: 5, col: 4 }, { row: 5, col: 5 }, { row: 5, col: 6 },
  
  // 第7行前3格：29-31日
  { row: 6, col: 0 }, { row: 6, col: 1 }, { row: 6, col: 2 }
];

// 星期标签位置（周日到周六）- 第7行后4格 + 第8行后3格
const WEEKDAY_POSITIONS: GridPosition[] = [
  // 第7行后4格（前3格被日期占用）
  { row: 6, col: 3 }, // 周日
  { row: 6, col: 4 }, // 周一  
  { row: 6, col: 5 }, // 周二
  { row: 6, col: 6 }, // 周三
  
  // 第8行后3格（前4格不可用）
  { row: 7, col: 4 }, // 周四
  { row: 7, col: 5 }, // 周五
  { row: 7, col: 6 }  // 周六
];

// 网格布局配置
export const GRID_LAYOUT: GridLayout = {
  width: GRID_CONFIG.WIDTH,
  height: GRID_CONFIG.HEIGHT,
  totalCells: GRID_CONFIG.TOTAL_CELLS,
  reservedCells: {
    months: MONTH_POSITIONS,
    days: DAY_POSITIONS,
    weekdays: WEEKDAY_POSITIONS
  }
};

// 月份标签文本
export const MONTH_LABELS = [
  '1月', '2月', '3月', '4月', '5月', '6月',
  '7月', '8月', '9月', '10月', '11月', '12月'
];

// 日期标签文本
export const DAY_LABELS = Array.from({ length: 31 }, (_, i) => `${i + 1}`);

// 星期标签文本（按照周日到周六的顺序）
export const WEEKDAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

// 获取月份对应的网格位置
export function getMonthPosition(month: number): GridPosition | null {
  if (month < 1 || month > 12) return null;
  return MONTH_POSITIONS[month - 1];
}

// 获取日期对应的网格位置
export function getDayPosition(day: number): GridPosition | null {
  if (day < 1 || day > 31) return null;
  return DAY_POSITIONS[day - 1];
}

// 获取星期对应的网格位置
export function getWeekdayPosition(weekday: number): GridPosition | null {
  if (weekday < 1 || weekday > 7) return null;
  return WEEKDAY_POSITIONS[weekday - 1];
}

// 检查位置是否为不可用格子（预留格子或阻塞格子）
export function isReservedPosition(position: GridPosition): boolean {
  return isPositionInArray(position, MONTH_POSITIONS) ||
         isPositionInArray(position, DAY_POSITIONS) ||
         isPositionInArray(position, WEEKDAY_POSITIONS) ||
         isPositionInArray(position, BLOCKED_POSITIONS);
}

// 检查位置是否为阻塞格子
export function isBlockedPosition(position: GridPosition): boolean {
  return isPositionInArray(position, BLOCKED_POSITIONS);
}

// 检查位置是否在数组中
function isPositionInArray(position: GridPosition, positions: GridPosition[]): boolean {
  return positions.some(pos => pos.row === position.row && pos.col === position.col);
}

// 获取位置的标签文本
export function getPositionLabel(position: GridPosition): string | null {
  // 检查月份
  const monthIndex = MONTH_POSITIONS.findIndex(pos => 
    pos.row === position.row && pos.col === position.col
  );
  if (monthIndex !== -1) {
    return MONTH_LABELS[monthIndex];
  }
  
  // 检查日期
  const dayIndex = DAY_POSITIONS.findIndex(pos => 
    pos.row === position.row && pos.col === position.col
  );
  if (dayIndex !== -1) {
    return DAY_LABELS[dayIndex];
  }
  
  // 检查星期
  const weekdayIndex = WEEKDAY_POSITIONS.findIndex(pos => 
    pos.row === position.row && pos.col === position.col
  );
  if (weekdayIndex !== -1) {
    return WEEKDAY_LABELS[weekdayIndex];
  }
  
  return null;
}

// 获取所有可用于放置拼图块的位置
export function getAvailablePositions(): GridPosition[] {
  const allPositions: GridPosition[] = [];
  
  for (let row = 0; row < GRID_CONFIG.HEIGHT; row++) {
    for (let col = 0; col < GRID_CONFIG.WIDTH; col++) {
      const position = { row, col };
      if (!isReservedPosition(position)) {
        allPositions.push(position);
      }
    }
  }
  
  return allPositions;
}

// 检查位置是否在网格范围内
export function isValidPosition(position: GridPosition): boolean {
  return position.row >= 0 && position.row < GRID_CONFIG.HEIGHT &&
         position.col >= 0 && position.col < GRID_CONFIG.WIDTH;
}

// 计算两个位置之间的距离
export function getDistance(pos1: GridPosition, pos2: GridPosition): number {
  return Math.sqrt(Math.pow(pos2.row - pos1.row, 2) + Math.pow(pos2.col - pos1.col, 2));
}

// 获取相邻位置
export function getAdjacentPositions(position: GridPosition): GridPosition[] {
  const adjacent: GridPosition[] = [];
  const directions = [
    { row: -1, col: 0 },  // 上
    { row: 1, col: 0 },   // 下
    { row: 0, col: -1 },  // 左
    { row: 0, col: 1 }    // 右
  ];
  
  directions.forEach(dir => {
    const newPos = {
      row: position.row + dir.row,
      col: position.col + dir.col
    };
    
    if (isValidPosition(newPos)) {
      adjacent.push(newPos);
    }
  });
  
  return adjacent;
}

// 网格渲染配置
export const GRID_RENDER_CONFIG = {
  // 基础样式
  cellSize: GRID_CONFIG.CELL_SIZE,
  gap: GRID_CONFIG.GAP,
  
  // 颜色配置
  colors: {
    background: '#f8fafc',
    gridLine: '#e2e8f0',
    cellDefault: '#ffffff',
    cellReserved: '#f1f5f9',
    cellTarget: '#dbeafe',
    cellOccupied: '#f3f4f6',
    cellHighlight: '#22d3ee',
    borderDefault: '#d1d5db',
    borderTarget: '#3b82f6',
    textDefault: '#374151',
    textTarget: '#1e40af'
  },
  
  // 字体配置
  font: {
    family: 'Inter, system-ui, sans-serif',
    size: 12,
    weight: '500'
  },
  
  // 动画配置
  animation: {
    duration: 200,
    easing: 'ease-in-out'
  }
};