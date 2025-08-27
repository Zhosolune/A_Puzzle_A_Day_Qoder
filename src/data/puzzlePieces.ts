import type { PuzzlePieceShape } from '../types';

/**
 * 预设的拼图块形状数据
 * 每个拼图块用二维布尔数组表示形状，true表示实际占用的格子
 * 
 * 游戏规则：
 * - 网格大小：8×7 = 56格
 * - 预留位置：50格（12个月 + 31个日期 + 7个星期）
 * - 未使用位置：6格（网格角落的空白格子）
 * - 每天阻挡：3格（当天的月、日、星期）
 * - 可用空间：56 - 6 - 3 = 47格（但需要考虑不同日期的变化）
 * 
 * 为了简化设计，我们设计了总和为47格的拼图块集合
 * 
 * 拼图块命名规则：
 * - L系列：L形状的拼图块
 * - I系列：直线形状的拼图块  
 * - T系列：T形状的拼图块
 * - Z系列：Z形状的拼图块
 * - O系列：单格拼图块
 * - P系列：P形状的拼图块
 * - S系列：方形拼图块
 */

// 计算形状的实际尺寸
function calculateShapeDimensions(shape: boolean[][]): { width: number; height: number } {
  return {
    height: shape.length,
    width: shape[0]?.length || 0
  };
}

// 创建拼图块辅助函数
function createPuzzlePiece(
  id: string, 
  name: string, 
  shape: boolean[][], 
  color: string
): PuzzlePieceShape {
  const dimensions = calculateShapeDimensions(shape);
  return {
    id,
    name,
    shape,
    width: dimensions.width,
    height: dimensions.height,
    color
  };
}

// 预设拼图块数据（根据需求替换为10个新形状）
export const PUZZLE_PIECES: PuzzlePieceShape[] = [
  // 形状1：[[1,0,1],[1,1,1]]
  createPuzzlePiece('N1', '形状-1', [
    [true, false, true],
    [true, true, true]
  ], '#EF4444'),

  // 形状2：[[1,1,1],[0,1,0],[0,1,0]]
  createPuzzlePiece('N2', '形状-2', [
    [true, true, true],
    [false, true, false],
    [false, true, false]
  ], '#F59E0B'),

  // 形状3：[[1],[1],[1],[1]]
  createPuzzlePiece('N3', '形状-3', [
    [true],
    [true],
    [true],
    [true]
  ], '#10B981'),

  // 形状4：[[1,1,0],[0,1,0],[0,1,1]]
  createPuzzlePiece('N4', '形状-4', [
    [true, true, false],
    [false, true, false],
    [false, true, true]
  ], '#3B82F6'),

  // 形状5：[[1,0,0],[1,0,0],[1,1,1]]
  createPuzzlePiece('N5', '形状-5', [
    [true, false, false],
    [true, false, false],
    [true, true, true]
  ], '#8B5CF6'),

  // 形状6：[[1,1,0],[0,1,1]]
  createPuzzlePiece('N6', '形状-6', [
    [true, true, false],
    [false, true, true]
  ], '#F472B6'),

  // 形状7：[[1,0],[1,0],[1,1]]
  createPuzzlePiece('N7', '形状-7', [
    [true, false],
    [true, false],
    [true, true]
  ], '#22D3EE'),

  // 形状8：[[0,0,0,1],[1,1,1,1]]
  createPuzzlePiece('N8', '形状-8', [
    [false, false, false, true],
    [true, true, true, true]
  ], '#A3E635'),

  // 形状9：[[1,0],[1,1],[0,1],[0,1]]
  createPuzzlePiece('N9', '形状-9', [
    [true, false],
    [true, true],
    [false, true],
    [false, true]
  ], '#FB923C'),

  // 形状10：[[1,1,1],[1,1,0]]
  createPuzzlePiece('N10', '形状-10', [
    [true, true, true],
    [true, true, false]
  ], '#14B8A6')
];

// 按新前缀分组（N系列）
export const PIECES_BY_TYPE = {
  N: PUZZLE_PIECES.filter(piece => piece.id.startsWith('N'))
};

// 获取拼图块形状
export function getPuzzlePieceShape(id: string): PuzzlePieceShape | null {
  return PUZZLE_PIECES.find(piece => piece.id === id) || null;
}

// 获取所有拼图块ID
export function getAllPieceIds(): string[] {
  return PUZZLE_PIECES.map(piece => piece.id);
}

// 获取拼图块总数
export function getTotalPieceCount(): number {
  return PUZZLE_PIECES.length;
}

// 计算拼图块占用的格子数
export function getPieceSize(shape: boolean[][]): number {
  return shape.flat().filter(cell => cell).length;
}

// 获取所有拼图块的总格子数
export function getTotalPieceSize(): number {
  return PUZZLE_PIECES.reduce((total, piece) => {
    return total + getPieceSize(piece.shape);
  }, 0);
}

// 根据颜色获取拼图块
export function getPiecesByColor(color: string): PuzzlePieceShape[] {
  return PUZZLE_PIECES.filter(piece => piece.color === color);
}

// 根据大小获取拼图块
export function getPiecesBySize(size: number): PuzzlePieceShape[] {
  return PUZZLE_PIECES.filter(piece => getPieceSize(piece.shape) === size);
}

// 验证拼图块形状是否有效
export function validatePieceShape(shape: boolean[][]): boolean {
  if (!shape || shape.length === 0) return false;
  
  const width = shape[0].length;
  return shape.every(row => row.length === width && row.some(cell => cell));
}

// 拼图块形状旋转函数
export function rotatePieceShape(shape: boolean[][], rotation: 0 | 90 | 180 | 270): boolean[][] {
  let result = shape;
  
  for (let i = 0; i < rotation / 90; i++) {
    // 90度顺时针旋转
    const rows = result.length;
    const cols = result[0].length;
    const rotated: boolean[][] = [];
    
    for (let j = 0; j < cols; j++) {
      rotated[j] = [];
      for (let k = 0; k < rows; k++) {
        rotated[j][k] = result[rows - 1 - k][j];
      }
    }
    
    result = rotated;
  }
  
  return result;
}

// 获取拼图块在指定旋转角度下的形状
export function getPieceShapeWithRotation(pieceId: string, rotation: 0 | 90 | 180 | 270): boolean[][] | null {
  const piece = getPuzzlePieceShape(pieceId);
  if (!piece) return null;

  return rotatePieceShape(piece.shape, rotation);
}

// 获取拼图块在指定变换下的形状（旋转+翻转）
export function getPieceShapeWithTransform(
  pieceId: string,
  rotation: 0 | 90 | 180 | 270,
  isFlippedHorizontally: boolean = false,
  isFlippedVertically: boolean = false
): boolean[][] | null {
  const piece = getPuzzlePieceShape(pieceId);
  if (!piece) return null;

  let shape = piece.shape;

  // 先应用翻转
  if (isFlippedHorizontally) {
    shape = flipPieceShapeHorizontally(shape);
  }
  if (isFlippedVertically) {
    shape = flipPieceShapeVertically(shape);
  }

  // 再应用旋转
  return rotatePieceShape(shape, rotation);
}

// 计算旋转后的拼图块尺寸
export function getRotatedPieceDimensions(pieceId: string, rotation: 0 | 90 | 180 | 270): { width: number; height: number } | null {
  const rotatedShape = getPieceShapeWithRotation(pieceId, rotation);
  if (!rotatedShape) return null;

  return calculateShapeDimensions(rotatedShape);
}

// 水平翻转拼图块形状
export function flipPieceShapeHorizontally(shape: boolean[][]): boolean[][] {
  return shape.map(row => [...row].reverse());
}

// 垂直翻转拼图块形状
export function flipPieceShapeVertically(shape: boolean[][]): boolean[][] {
  return [...shape].reverse();
}