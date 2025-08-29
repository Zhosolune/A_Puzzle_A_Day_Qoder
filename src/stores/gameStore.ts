import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import {
  GameStatus,
  CellState
} from '../types';
import type {
  GameStore,
  GridCell,
  GridPosition,
  PuzzlePieceState,
  GameStats,
  DragState,
  GameMove,
  GameDifficulty,
  PlacedPiece,
  ToastNotification
} from '../types';
import { PUZZLE_PIECES, getPieceShapeWithTransform } from '../data/puzzlePieces';
import { GRID_LAYOUT, isReservedPosition, isValidPosition, getPositionLabel, isBlockedPosition } from '../data/gridLayout';
import { getCurrentDate, generateDateTarget } from '../utils/dateUtils';

// 初始拖拽状态
const initialDragState: DragState = {
  isDragging: false,
  draggedPiece: null,
  dragOffset: { x: 0, y: 0 },
  currentGridPosition: null,
  isValidPosition: false,
  previewCells: [],
  globalMousePosition: null,
  isInValidDropZone: false,
  originalStorageArea: undefined,
  originalStorageIndex: undefined
};

// 存放区域引用
let leftStorageRef: React.RefObject<HTMLDivElement | null> | null = null;
let rightStorageRef: React.RefObject<HTMLDivElement | null> | null = null;
let gameBoardRef: React.RefObject<HTMLCanvasElement | null> | null = null;

// 初始游戏统计
const initialStats: GameStats = {
  moveCount: 0,
  startTime: Date.now(),
  elapsedTime: 0,
  hintsUsed: 0,
  difficulty: 'medium'
};

// 创建初始网格
function createInitialGrid(): GridCell[][] {
  const grid: GridCell[][] = [];

  for (let row = 0; row < GRID_LAYOUT.height; row++) {
    grid[row] = [];
    for (let col = 0; col < GRID_LAYOUT.width; col++) {
      const position: GridPosition = { row, col };
      const isReserved = isReservedPosition(position);

      grid[row][col] = {
        position,
        state: isReserved ? CellState.RESERVED : CellState.EMPTY,
        label: isReserved ? getGridCellLabel(position) : undefined
      };
    }
  }

  return grid;
}

// 获取网格单元标签
function getGridCellLabel(position: GridPosition): string {
  return getPositionLabel(position) || '';
}

// 创建初始拼图块状态
function createInitialPieces(): PuzzlePieceState[] {
  return PUZZLE_PIECES.map(piece => ({
    id: piece.id,
    shapeId: piece.id,
    isPlaced: false,
    rotation: 0,
    isFlippedHorizontally: false,
    isFlippedVertically: false,
    isDragging: false,
    isSelected: false
  }));
}

// 生成移动ID
function generateMoveId(): string {
  return `move_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// 基于 placedPieces 重建网格占用（支持重叠，后放置覆盖前者的pieceId）
function rebuildGridFromPlacedPieces(placed: Map<string, PlacedPiece>): GridCell[][] {
  const baseGrid = createInitialGrid();

  // 按插入顺序覆盖，占用状态为 OCCUPIED，pieceId 为最后覆盖者
  for (const [, placedPiece] of placed) {
    for (const pos of placedPiece.occupiedCells) {
      if (isValidPosition(pos)) {
        const cell = baseGrid[pos.row][pos.col];
        // 目标/阻塞格子仍保持其状态，不允许覆盖
        if (cell.state === CellState.RESERVED || cell.state === CellState.BLOCKED) continue;
        cell.state = CellState.OCCUPIED;
        cell.pieceId = placedPiece.pieceId;
      }
    }
  }

  return baseGrid;
}


// 创建游戏Store
export const useGameStore = create<GameStore>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      // 游戏状态
      status: GameStatus.MENU,
      isInitialized: false,
      currentDate: getCurrentDate(),
      dateTarget: generateDateTarget(getCurrentDate()),
      gridCells: createInitialGrid(),
      availablePieces: createInitialPieces(),
      placedPieces: new Map(),
      selectedPieceId: null,
      dragState: initialDragState,
      currentStats: initialStats,
      moveHistory: [],
      showHints: false,
      showGrid: true,
      soundEnabled: true,
      animationEnabled: true,

      // 通知状态
      notifications: [],

      // 游戏控制方法
      initializeGame: (date = getCurrentDate()) => {
        const target = generateDateTarget(date);

        set({
          currentDate: date,
          dateTarget: target,
          gridCells: createInitialGrid(),
          availablePieces: createInitialPieces(),
          placedPieces: new Map(),
          selectedPieceId: null,
          dragState: initialDragState,
          currentStats: {
            ...initialStats,
            startTime: Date.now()
          },
          moveHistory: [],
          status: GameStatus.MENU,
          isInitialized: true
        });
      },

      startNewGame: (date = getCurrentDate()) => {
        get().initializeGame(date);
        set({ status: GameStatus.PLAYING });
      },

      pauseGame: () => {
        const state = get();
        if (state.status === GameStatus.PLAYING) {
          set({ status: GameStatus.PAUSED });
        }
      },

      resumeGame: () => {
        const state = get();
        if (state.status === GameStatus.PAUSED) {
          set({ status: GameStatus.PLAYING });
        }
      },

      resetGame: () => {
        const state = get();
        get().initializeGame(state.currentDate);
      },

      // 拼图块操作
      selectPiece: (pieceId: string) => {
        set({ selectedPieceId: pieceId });

        // 更新拼图块选中状态
        const state = get();
        const updatedPieces = state.availablePieces.map(piece => ({
          ...piece,
          isSelected: piece.id === pieceId
        }));

        set({ availablePieces: updatedPieces });
      },

      deselectPiece: () => {
        set({ selectedPieceId: null });

        const state = get();
        const updatedPieces = state.availablePieces.map(piece => ({
          ...piece,
          isSelected: false
        }));

        set({ availablePieces: updatedPieces });
      },

      placePiece: (pieceId: string, position: GridPosition): boolean => {
        const state = get();

        // 放宽验证：仅检查边界与目标格子，不检查与其他拼图块的重叠
        if (!get().validatePlacement(pieceId, position)) {
          return false;
        }

        const piece = state.availablePieces.find(p => p.id === pieceId);
        if (!piece || piece.isPlaced) {
          return false;
        }

        const shape = getPieceShapeWithTransform(piece.shapeId, piece.rotation, piece.isFlippedHorizontally, piece.isFlippedVertically);
        if (!shape) return false;

        // 计算占用的格子（仅记录有效区域内，且不包含阻塞/当天目标格子的格子）
        const occupiedCells: GridPosition[] = [];
        const { month, day, weekday } = state.dateTarget.targetPositions;
        for (let r = 0; r < shape.length; r++) {
          for (let c = 0; c < shape[r].length; c++) {
            if (shape[r][c]) {
              const cellPos = { row: position.row + r, col: position.col + c };
              if (!isValidPosition(cellPos)) continue;
              const isTarget = (cellPos.row === month.row && cellPos.col === month.col) ||
                               (cellPos.row === day.row && cellPos.col === day.col) ||
                               (cellPos.row === weekday.row && cellPos.col === weekday.col);
              if (!isBlockedPosition(cellPos) && !isTarget) {
                occupiedCells.push(cellPos);
              }
            }
          }
        }

        // 更新拼图块状态
        const updatedPieces = state.availablePieces.map(p =>
          p.id === pieceId
            ? { ...p, isPlaced: true, position, isDragging: false, isSelected: false }
            : p
        );

        // 添加已放置的拼图块记录（维护层级：zIndex 递增）
        const newPlacedPieces = new Map(state.placedPieces);
        const nextZ = newPlacedPieces.size + 1;
        newPlacedPieces.set(pieceId, {
          pieceId,
          shapeId: piece.shapeId,
          position,
          rotation: piece.rotation,
          isFlippedHorizontally: piece.isFlippedHorizontally,
          isFlippedVertically: piece.isFlippedVertically,
          occupiedCells,
          zIndex: nextZ
        });

        // 基于 placedPieces 重建网格占用（支持重叠，后放置覆盖前者）
        const newGrid = rebuildGridFromPlacedPieces(newPlacedPieces);

        // 记录移动
        const move: GameMove = {
          id: generateMoveId(),
          timestamp: Date.now(),
          type: 'place',
          pieceId,
          toPosition: position
        };

        // 更新统计
        const newStats = {
          ...state.currentStats,
          moveCount: state.currentStats.moveCount + 1,
          elapsedTime: Date.now() - state.currentStats.startTime
        };

        set({
          gridCells: newGrid,
          availablePieces: updatedPieces,
          placedPieces: newPlacedPieces,
          selectedPieceId: null,
          currentStats: newStats,
          moveHistory: [...state.moveHistory, move]
        });

        // 检查胜利条件
        if (get().checkWinCondition()) {
          set({
            status: GameStatus.COMPLETED,
            currentStats: {
              ...newStats,
              endTime: Date.now()
            }
          });
        }

        return true;
      },

      removePiece: (pieceId: string) => {
        const state = get();
        const placedPiece = state.placedPieces.get(pieceId);

        if (!placedPiece) return;

        // 更新网格状态 - 清除该拼图块，并重建占用（考虑重叠）
        const tempPlaced = new Map(state.placedPieces);
        tempPlaced.delete(pieceId);
        const newGrid = rebuildGridFromPlacedPieces(tempPlaced);

        // 更新拼图块状态
        const updatedPieces = state.availablePieces.map(p =>
          p.id === pieceId
            ? { ...p, isPlaced: false, position: undefined }
            : p
        );

        // 移除已放置的记录
        const newPlacedPieces = new Map(state.placedPieces);
        newPlacedPieces.delete(pieceId);

        // 记录移动
        const move: GameMove = {
          id: generateMoveId(),
          timestamp: Date.now(),
          type: 'remove',
          pieceId,
          fromPosition: placedPiece.position
        };

        set({
          gridCells: newGrid,
          availablePieces: updatedPieces,
          placedPieces: newPlacedPieces,
          moveHistory: [...state.moveHistory, move]
        });
      },

      rotatePiece: (pieceId: string) => {
        const state = get();
        const piece = state.availablePieces.find(p => p.id === pieceId);

        if (!piece) return;

        const newRotation = ((piece.rotation + 90) % 360) as 0 | 90 | 180 | 270;
        const wasPlaced = piece.isPlaced;
        const placedPiece = state.placedPieces.get(pieceId);
        const originalPosition = placedPiece?.position;

        // 如果拼图块已放置，需要检查旋转后是否仍然合法
        if (wasPlaced && originalPosition && placedPiece) {
          // 使用新的旋转角度来检查
          const tempShape = getPieceShapeWithTransform(piece.shapeId, newRotation, piece.isFlippedHorizontally, piece.isFlippedVertically);

          if (!tempShape) return;

          // 计算旋转后占用的格子
          const newOccupiedCells: GridPosition[] = [];
          for (let r = 0; r < tempShape.length; r++) {
            for (let c = 0; c < tempShape[r].length; c++) {
              if (tempShape[r][c]) {
                newOccupiedCells.push({
                  row: originalPosition.row + r,
                  col: originalPosition.col + c
                });
              }
            }
          }

          // 检查旋转后是否仍在网格内且不冲突
          let isValid = true;
          for (const pos of newOccupiedCells) {
            if (!isValidPosition(pos) ||
                (isReservedPosition(pos) &&
                 (pos.row === state.dateTarget.targetPositions.month.row &&
                  pos.col === state.dateTarget.targetPositions.month.col))) {
              isValid = false;
              break;
            }
          }

          if (!isValid) {
            get().addNotification('旋转后位置超出边界或与目标格子冲突', 'warning');
            return;
          }

          // 直接更新所有相关状态
          const updatedPieces = state.availablePieces.map(p =>
            p.id === pieceId ? { ...p, rotation: newRotation } : p
          );

          const newPlacedPieces = new Map(state.placedPieces);
          const existingPlacedPiece = newPlacedPieces.get(pieceId);

          if (existingPlacedPiece) {
            // 确保所有旋转/翻转状态都正确更新
            newPlacedPieces.set(pieceId, {
              ...existingPlacedPiece,
              rotation: newRotation,
              isFlippedHorizontally: piece.isFlippedHorizontally,
              isFlippedVertically: piece.isFlippedVertically,
              occupiedCells: newOccupiedCells
            });
          }

          // 重建网格
          const newGrid = rebuildGridFromPlacedPieces(newPlacedPieces);

          // 记录移动
          const move: GameMove = {
            id: generateMoveId(),
            timestamp: Date.now(),
            type: 'rotate',
            pieceId,
            fromPosition: originalPosition,
            toPosition: originalPosition
          };

          set({
            gridCells: newGrid,
            availablePieces: updatedPieces,
            placedPieces: newPlacedPieces,
            moveHistory: [...state.moveHistory, move]
          });
        } else {
          // 如果拼图块未放置，只更新旋转角度
          const updatedPieces = state.availablePieces.map(p =>
            p.id === pieceId ? { ...p, rotation: newRotation } : p
          );

          set({ availablePieces: updatedPieces });
        }
      },

      flipPieceHorizontally: (pieceId: string) => {
        const state = get();
        const piece = state.availablePieces.find(p => p.id === pieceId);

        if (!piece) return;

        const newFlippedState = !piece.isFlippedHorizontally;
        const wasPlaced = piece.isPlaced;
        const placedPiece = state.placedPieces.get(pieceId);
        const originalPosition = placedPiece?.position;

        // 如果拼图块已放置，需要检查翻转后是否仍然合法
        if (wasPlaced && originalPosition && placedPiece) {
          const tempShape = getPieceShapeWithTransform(
            piece.shapeId,
            piece.rotation,
            newFlippedState,
            piece.isFlippedVertically
          );

          if (!tempShape) return;

          // 计算翻转后占用的格子
          const newOccupiedCells: GridPosition[] = [];
          for (let r = 0; r < tempShape.length; r++) {
            for (let c = 0; c < tempShape[r].length; c++) {
              if (tempShape[r][c]) {
                newOccupiedCells.push({
                  row: originalPosition.row + r,
                  col: originalPosition.col + c
                });
              }
            }
          }

          // 检查翻转后是否仍在网格内且不冲突
          let isValid = true;
          for (const pos of newOccupiedCells) {
            if (!isValidPosition(pos) ||
                (isReservedPosition(pos) &&
                 (pos.row === state.dateTarget.targetPositions.month.row &&
                  pos.col === state.dateTarget.targetPositions.month.col))) {
              isValid = false;
              break;
            }
          }

          if (!isValid) {
            get().addNotification('翻转后位置超出边界或与目标格子冲突', 'warning');
            return;
          }

          // 直接更新所有相关状态
          const updatedPieces = state.availablePieces.map(p =>
            p.id === pieceId ? { ...p, isFlippedHorizontally: newFlippedState } : p
          );

          const newPlacedPieces = new Map(state.placedPieces);
          const existingPlacedPiece = newPlacedPieces.get(pieceId);
          if (existingPlacedPiece) {
            // 确保所有旋转/翻转状态都正确更新
            newPlacedPieces.set(pieceId, {
              ...existingPlacedPiece,
              rotation: piece.rotation,
              isFlippedHorizontally: newFlippedState,
              isFlippedVertically: piece.isFlippedVertically,
              occupiedCells: newOccupiedCells
            });
          }

          // 重建网格
          const newGrid = rebuildGridFromPlacedPieces(newPlacedPieces);

          // 记录移动
          const move: GameMove = {
            id: generateMoveId(),
            timestamp: Date.now(),
            type: 'rotate', // 使用 'rotate' 类型，因为 GameMove 类型中没有 'flip'
            pieceId,
            fromPosition: originalPosition,
            toPosition: originalPosition
          };

          set({
            gridCells: newGrid,
            availablePieces: updatedPieces,
            placedPieces: newPlacedPieces,
            moveHistory: [...state.moveHistory, move]
          });
        } else {
          // 如果拼图块未放置，只更新翻转状态
          const updatedPieces = state.availablePieces.map(p =>
            p.id === pieceId ? { ...p, isFlippedHorizontally: newFlippedState } : p
          );

          set({ availablePieces: updatedPieces });
        }
      },

      flipPieceVertically: (pieceId: string) => {
        const state = get();
        const piece = state.availablePieces.find(p => p.id === pieceId);

        if (!piece) return;

        const newFlippedState = !piece.isFlippedVertically;
        const wasPlaced = piece.isPlaced;
        const placedPiece = state.placedPieces.get(pieceId);
        const originalPosition = placedPiece?.position;

        // 如果拼图块已放置，需要检查翻转后是否仍然合法
        if (wasPlaced && originalPosition && placedPiece) {
          const tempShape = getPieceShapeWithTransform(
            piece.shapeId,
            piece.rotation,
            piece.isFlippedHorizontally,
            newFlippedState
          );

          if (!tempShape) return;

          // 检查翻转后是否仍在网格内且不冲突
          let isValid = true;
          for (let r = 0; r < tempShape.length && isValid; r++) {
            for (let c = 0; c < tempShape[r].length && isValid; c++) {
              if (tempShape[r][c]) {
                const newPos = {
                  row: originalPosition.row + r,
                  col: originalPosition.col + c
                };

                if (!isValidPosition(newPos) ||
                    (isReservedPosition(newPos) &&
                     (newPos.row === state.dateTarget.targetPositions.month.row &&
                      newPos.col === state.dateTarget.targetPositions.month.col))) {
                  isValid = false;
                }
              }
            }
          }

          if (!isValid) {
            get().addNotification('翻转后位置超出边界或与目标格子冲突', 'warning');
            return;
          }

          // 计算翻转后占用的格子
          const newOccupiedCells: GridPosition[] = [];
          for (let r = 0; r < tempShape.length; r++) {
            for (let c = 0; c < tempShape[r].length; c++) {
              if (tempShape[r][c]) {
                newOccupiedCells.push({
                  row: originalPosition.row + r,
                  col: originalPosition.col + c
                });
              }
            }
          }

          // 直接更新所有相关状态
          const updatedPieces = state.availablePieces.map(p =>
            p.id === pieceId ? { ...p, isFlippedVertically: newFlippedState } : p
          );

          const newPlacedPieces = new Map(state.placedPieces);
          const existingPlacedPiece = newPlacedPieces.get(pieceId);
          if (existingPlacedPiece) {
            // 确保所有旋转/翻转状态都正确更新
            newPlacedPieces.set(pieceId, {
              ...existingPlacedPiece,
              rotation: piece.rotation,
              isFlippedHorizontally: piece.isFlippedHorizontally,
              isFlippedVertically: newFlippedState,
              occupiedCells: newOccupiedCells
            });
          }

          // 重建网格
          const newGrid = rebuildGridFromPlacedPieces(newPlacedPieces);

          // 记录移动
          const move: GameMove = {
            id: generateMoveId(),
            timestamp: Date.now(),
            type: 'rotate', // 使用 'rotate' 类型，因为 GameMove 类型中没有 'flip'
            pieceId,
            fromPosition: originalPosition,
            toPosition: originalPosition
          };

          set({
            gridCells: newGrid,
            availablePieces: updatedPieces,
            placedPieces: newPlacedPieces,
            moveHistory: [...state.moveHistory, move]
          });
        } else {
          // 如果拼图块未放置，只更新翻转状态
          const updatedPieces = state.availablePieces.map(p =>
            p.id === pieceId ? { ...p, isFlippedVertically: newFlippedState } : p
          );

          set({ availablePieces: updatedPieces });
        }
      },

      // 拖拽操作
      startDrag: (pieceId: string, offset: { x: number; y: number }, storageArea?: 'left' | 'right', storageIndex?: number) => {
        const state = get();
        const piece = state.availablePieces.find(p => p.id === pieceId);

        if (!piece) return;

        const updatedPieces = state.availablePieces.map(p =>
          p.id === pieceId ? { ...p, isDragging: true } : p
        );

        set({
          availablePieces: updatedPieces,
          dragState: {
            isDragging: true,
            draggedPiece: { ...piece, isDragging: true },
            dragOffset: offset,
            currentGridPosition: null,
            isValidPosition: false,
            previewCells: [],
            globalMousePosition: null,
            isInValidDropZone: false,
            originalStorageArea: storageArea,
            originalStorageIndex: storageIndex
          }
        });
      },

      updateDrag: (position: GridPosition | null) => {
        const state = get();
        if (!state.dragState.isDragging || !state.dragState.draggedPiece) return;

        // 如果位置为null（拖拽到网格外），设置为无效状态
        if (position === null) {
          set({
            dragState: {
              ...state.dragState,
              currentGridPosition: null,
              isValidPosition: false,
              previewCells: []
            }
          });
          return;
        }

        // 放宽校验：边界和目标格子；重叠无阻挡
        const isValid = get().validatePlacement(state.dragState.draggedPiece.id, position);

        // 计算预览格子
        const previewCells: GridPosition[] = [];
        if (isValid) {
          const shape = getPieceShapeWithTransform(
            state.dragState.draggedPiece.shapeId,
            state.dragState.draggedPiece.rotation,
            state.dragState.draggedPiece.isFlippedHorizontally,
            state.dragState.draggedPiece.isFlippedVertically
          );

          if (shape) {
            for (let r = 0; r < shape.length; r++) {
              for (let c = 0; c < shape[r].length; c++) {
                if (shape[r][c]) {
                  previewCells.push({
                    row: position.row + r,
                    col: position.col + c
                  });
                }
              }
            }
          }
        }

        set({
          dragState: {
            ...state.dragState,
            currentGridPosition: position,
            isValidPosition: isValid,
            previewCells
          }
        });
      },

      updateGlobalDrag: (globalPosition: { x: number; y: number }, isInValidDropZone: boolean) => {
        const state = get();
        if (!state.dragState.isDragging) return;

        set({
          dragState: {
            ...state.dragState,
            globalMousePosition: globalPosition,
            isInValidDropZone
          }
        });
      },

      // 检查拖拽位置是否在正确的存放区域内
      isInCorrectStorageArea: (_globalPosition: { x: number; y: number }): boolean => {
        const state = get();
        if (!state.dragState.isDragging || !state.dragState.draggedPiece || !state.dragState.originalStorageArea) {
          return false;
        }

        // 这里需要根据实际的DOM元素位置来判断
        // 暂时返回false，后续会通过DOM查询来实现
        return false;
      },

      endDrag: (position?: GridPosition): boolean => {
        const state = get();
        if (!state.dragState.isDragging || !state.dragState.draggedPiece) {
          return false;
        }

        const pieceId = state.dragState.draggedPiece.id;
        const wasFromBoard = !state.dragState.originalStorageArea; // 如果没有原始存放区域，说明是从面板拖拽的
        let success = false;

        // 允许重叠放置：仅在边界/目标格子合法时放置
        if (position && get().validatePlacement(pieceId, position)) {
          success = get().placePiece(pieceId, position);
        }

        // 如果放置失败且拼图块原本是从面板拖拽的，保持未放置状态
        // 如果是从存放区域拖拽的，会自动回到存放区域（通过availablePieces的状态管理）

        // 更新拼图块拖拽状态
        const updatedPieces = state.availablePieces.map(p =>
          p.id === pieceId ? {
            ...p,
            isDragging: false,
            // 如果是从面板拖拽且放置失败，保持未放置状态
            isPlaced: success || (wasFromBoard ? false : p.isPlaced)
          } : p
        );

        set({
          availablePieces: updatedPieces,
          dragState: initialDragState
        });

        return success;
      },

      // 游戏验证
      checkWinCondition: (): boolean => {
        const state = get();
        const { month, day, weekday } = state.dateTarget.targetPositions;

        // 检查目标位置是否为空
        const monthCell = state.gridCells[month.row][month.col];
        const dayCell = state.gridCells[day.row][day.col];
        const weekdayCell = state.gridCells[weekday.row][weekday.col];

        const isMonthEmpty = monthCell.state === CellState.RESERVED;
        const isDayEmpty = dayCell.state === CellState.RESERVED;
        const isWeekdayEmpty = weekdayCell.state === CellState.RESERVED;

        // 检查所有非目标位置是否都被占用
        let allNonTargetsFilled = true;
        for (let row = 0; row < GRID_LAYOUT.height; row++) {
          for (let col = 0; col < GRID_LAYOUT.width; col++) {
            const cell = state.gridCells[row][col];
            const isTargetCell = (row === month.row && col === month.col) ||
                               (row === day.row && col === day.col) ||
                               (row === weekday.row && col === weekday.col);

            if (!isTargetCell && cell.state === CellState.EMPTY) {
              allNonTargetsFilled = false;
              break;
            }
          }
          if (!allNonTargetsFilled) break;
        }

        return isMonthEmpty && isDayEmpty && isWeekdayEmpty && allNonTargetsFilled;
      },

      validatePlacement: (pieceId: string, position: GridPosition): boolean => {
        const state = get();
        const piece = state.availablePieces.find(p => p.id === pieceId);
        if (!piece) return false;

        const shape = getPieceShapeWithTransform(
          piece.shapeId,
          piece.rotation,
          piece.isFlippedHorizontally,
          piece.isFlippedVertically
        );
        if (!shape) return false;

        // 宽松面积比例判断：仅对落在有效区域的格子计数；禁止覆盖目标/阻塞格
        let totalCells = 0;
        let inBoundsValidCells = 0;
        for (let r = 0; r < shape.length; r++) {
          for (let c = 0; c < shape[r].length; c++) {
            if (!shape[r][c]) continue;
            totalCells += 1;
            const cellPos = { row: position.row + r, col: position.col + c };
            if (isValidPosition(cellPos)) {
              // 不允许覆盖阻塞格子或当天目标格子（月份/日期/星期）
              const isTargetCell = (
                cellPos.row === state.dateTarget.targetPositions.month.row && cellPos.col === state.dateTarget.targetPositions.month.col
              ) || (
                cellPos.row === state.dateTarget.targetPositions.day.row && cellPos.col === state.dateTarget.targetPositions.day.col
              ) || (
                cellPos.row === state.dateTarget.targetPositions.weekday.row && cellPos.col === state.dateTarget.targetPositions.weekday.col
              );
              if (isBlockedPosition(cellPos) || isTargetCell) {
                return false;
              }
              inBoundsValidCells += 1;
            }
          }
        }

        if (totalCells === 0) return false;
        const ratio = inBoundsValidCells / totalCells;
        return ratio >= 0.5; // >=50% 在有效区域内则允许
      },

      getAvailablePositions: (pieceId: string): GridPosition[] => {
        const availablePositions: GridPosition[] = [];

        for (let row = 0; row < GRID_LAYOUT.height; row++) {
          for (let col = 0; col < GRID_LAYOUT.width; col++) {
            const position = { row, col };
            if (get().validatePlacement(pieceId, position)) {
              availablePositions.push(position);
            }
          }
        }

        return availablePositions;
      },

      // 辅助功能
      getHint: (): GridPosition | null => {
        const state = get();

        // 找到第一个未放置的拼图块
        const unplacedPiece = state.availablePieces.find(p => !p.isPlaced);
        if (!unplacedPiece) return null;

        // 获取该拼图块的可用位置
        const availablePositions = get().getAvailablePositions(unplacedPiece.id);
        if (availablePositions.length === 0) return null;

        // 更新提示使用计数
        set({
          currentStats: {
            ...state.currentStats,
            hintsUsed: state.currentStats.hintsUsed + 1
          }
        });

        return availablePositions[0];
      },

      undoLastMove: () => {
        const state = get();
        if (state.moveHistory.length === 0) return;

        const lastMove = state.moveHistory[state.moveHistory.length - 1];

        if (lastMove.type === 'place') {
          get().removePiece(lastMove.pieceId);
        }

        // 移除最后一个移动记录
        set({
          moveHistory: state.moveHistory.slice(0, -1)
        });
      },

      redoMove: () => {
        // TODO: 实现重做功能
      },

      // 设置
      toggleSound: () => {
        const state = get();
        set({ soundEnabled: !state.soundEnabled });
      },

      toggleAnimation: () => {
        const state = get();
        set({ animationEnabled: !state.animationEnabled });
      },

      toggleHints: () => {
        const state = get();
        set({ showHints: !state.showHints });
      },

      toggleGrid: () => {
        const state = get();
        set({ showGrid: !state.showGrid });
      },

      setDifficulty: (difficulty: GameDifficulty) => {
        const state = get();
        set({
          currentStats: {
            ...state.currentStats,
            difficulty
          }
        });
      },

      // 存放区域管理
      setStorageAreaRefs: (leftRef: React.RefObject<HTMLDivElement | null>, rightRef: React.RefObject<HTMLDivElement | null>) => {
        leftStorageRef = leftRef;
        rightStorageRef = rightRef;
      },

      setGameBoardRef: (ref: React.RefObject<HTMLCanvasElement | null>) => {
        gameBoardRef = ref;
      },

      checkDropZone: (globalPosition: { x: number; y: number }): 'gameboard' | 'left-storage' | 'right-storage' | 'invalid' => {
        // 检查是否在GameBoard区域
        if (gameBoardRef?.current) {
          const gameBoardRect = gameBoardRef.current.getBoundingClientRect();
          if (globalPosition.x >= gameBoardRect.left && globalPosition.x <= gameBoardRect.right &&
              globalPosition.y >= gameBoardRect.top && globalPosition.y <= gameBoardRect.bottom) {
            return 'gameboard';
          }
        }

        // 检查是否在左侧存放区域
        if (leftStorageRef?.current) {
          const leftRect = leftStorageRef.current.getBoundingClientRect();
          if (globalPosition.x >= leftRect.left && globalPosition.x <= leftRect.right &&
              globalPosition.y >= leftRect.top && globalPosition.y <= leftRect.bottom) {
            return 'left-storage';
          }
        }

        // 检查是否在右侧存放区域
        if (rightStorageRef?.current) {
          const rightRect = rightStorageRef.current.getBoundingClientRect();
          if (globalPosition.x >= rightRect.left && globalPosition.x <= rightRect.right &&
              globalPosition.y >= rightRect.top && globalPosition.y <= rightRect.bottom) {
            return 'right-storage';
          }
        }

        return 'invalid';
      },

      // 通知管理方法
      addNotification: (message: string, type: 'error' | 'warning' | 'success' | 'info' = 'info') => {
        const state = get();
        const newNotification: ToastNotification = {
          id: `toast_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          message,
          type,
          timestamp: Date.now()
        };

        // 限制最多3个通知，移除最早的
        const updatedNotifications = [newNotification, ...state.notifications].slice(0, 3);

        set({ notifications: updatedNotifications });

        // 3.5秒后自动移除
        setTimeout(() => {
          get().removeNotification(newNotification.id);
        }, 3500);
      },

      removeNotification: (id: string) => {
        const state = get();
        const updatedNotifications = state.notifications.filter(n => n.id !== id);
        set({ notifications: updatedNotifications });
      },

      clearNotifications: () => {
        set({ notifications: [] });
      }
    })),
    {
      name: 'puzzle-game-store'
    }
  )
);