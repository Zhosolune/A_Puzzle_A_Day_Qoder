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
  GameDifficulty 
} from '../types';
import { PUZZLE_PIECES, getPieceShapeWithRotation } from '../data/puzzlePieces';
import { GRID_LAYOUT, isReservedPosition, isValidPosition, getPositionLabel } from '../data/gridLayout';
import { getCurrentDate, generateDateTarget } from '../utils/dateUtils';

// 初始拖拽状态
const initialDragState: DragState = {
  isDragging: false,
  draggedPiece: null,
  dragOffset: { x: 0, y: 0 },
  currentGridPosition: null,
  isValidPosition: false,
  previewCells: []
};

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
    isDragging: false,
    isSelected: false
  }));
}

// 生成移动ID
function generateMoveId(): string {
  return `move_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
        
        // 验证放置是否合法
        if (!get().validatePlacement(pieceId, position)) {
          return false;
        }

        const piece = state.availablePieces.find(p => p.id === pieceId);
        if (!piece || piece.isPlaced) {
          return false;
        }

        const shape = getPieceShapeWithRotation(piece.shapeId, piece.rotation);
        if (!shape) return false;

        // 计算占用的格子
        const occupiedCells: GridPosition[] = [];
        for (let r = 0; r < shape.length; r++) {
          for (let c = 0; c < shape[r].length; c++) {
            if (shape[r][c]) {
              occupiedCells.push({
                row: position.row + r,
                col: position.col + c
              });
            }
          }
        }

        // 更新网格状态
        const newGrid = state.gridCells.map(row => row.map(cell => ({ ...cell })));
        occupiedCells.forEach(pos => {
          if (isValidPosition(pos)) {
            newGrid[pos.row][pos.col].state = CellState.OCCUPIED;
            newGrid[pos.row][pos.col].pieceId = pieceId;
          }
        });

        // 更新拼图块状态
        const updatedPieces = state.availablePieces.map(p => 
          p.id === pieceId 
            ? { ...p, isPlaced: true, position, isDragging: false, isSelected: false }
            : p
        );

        // 添加已放置的拼图块记录
        const newPlacedPieces = new Map(state.placedPieces);
        newPlacedPieces.set(pieceId, {
          pieceId,
          shapeId: piece.shapeId,
          position,
          rotation: piece.rotation,
          occupiedCells
        });

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

        // 更新网格状态 - 清除占用
        const newGrid = state.gridCells.map(row => row.map(cell => ({ ...cell })));
        placedPiece.occupiedCells.forEach(pos => {
          if (isValidPosition(pos)) {
            const cell = newGrid[pos.row][pos.col];
            if (cell.pieceId === pieceId) {
              cell.state = isReservedPosition(pos) ? CellState.RESERVED : CellState.EMPTY;
              delete cell.pieceId;
            }
          }
        });

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
        
        // 如果拼图块已放置，需要检查旋转后是否仍然合法
        if (piece.isPlaced && piece.position) {
          // 临时更新旋转角度来检查
          const tempPiece = { ...piece, rotation: newRotation };
          const tempShape = getPieceShapeWithRotation(tempPiece.shapeId, newRotation);
          
          if (!tempShape) return;

          // 检查旋转后是否仍在网格内且不冲突
          let isValid = true;
          for (let r = 0; r < tempShape.length && isValid; r++) {
            for (let c = 0; c < tempShape[r].length && isValid; c++) {
              if (tempShape[r][c]) {
                const newPos = {
                  row: piece.position.row + r,
                  col: piece.position.col + c
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

          if (!isValid) return;

          // 先移除旧位置，再放置新位置
          get().removePiece(pieceId);
        }

        // 更新拼图块旋转角度
        const updatedPieces = state.availablePieces.map(p => 
          p.id === pieceId ? { ...p, rotation: newRotation } : p
        );

        set({ availablePieces: updatedPieces });

        // 如果之前已放置，重新放置
        if (piece.isPlaced && piece.position) {
          get().placePiece(pieceId, piece.position);
        }
      },

      // 拖拽操作
      startDrag: (pieceId: string, offset: { x: number; y: number }) => {
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
            previewCells: []
          }
        });
      },

      updateDrag: (position: GridPosition) => {
        const state = get();
        if (!state.dragState.isDragging || !state.dragState.draggedPiece) return;

        const isValid = get().validatePlacement(state.dragState.draggedPiece.id, position);
        
        // 计算预览格子
        const previewCells: GridPosition[] = [];
        if (isValid) {
          const shape = getPieceShapeWithRotation(
            state.dragState.draggedPiece.shapeId, 
            state.dragState.draggedPiece.rotation
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

      endDrag: (position?: GridPosition): boolean => {
        const state = get();
        if (!state.dragState.isDragging || !state.dragState.draggedPiece) {
          return false;
        }

        const pieceId = state.dragState.draggedPiece.id;
        let success = false;

        // 尝试放置拼图块
        if (position && get().validatePlacement(pieceId, position)) {
          success = get().placePiece(pieceId, position);
        }

        // 更新拼图块拖拽状态
        const updatedPieces = state.availablePieces.map(p => 
          p.id === pieceId ? { ...p, isDragging: false } : p
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

        const shape = getPieceShapeWithRotation(piece.shapeId, piece.rotation);
        if (!shape) return false;

        // 检查每个格子
        for (let r = 0; r < shape.length; r++) {
          for (let c = 0; c < shape[r].length; c++) {
            if (shape[r][c]) {
              const cellPos = {
                row: position.row + r,
                col: position.col + c
              };

              // 检查是否在网格范围内
              if (!isValidPosition(cellPos)) {
                return false;
              }

              const cell = state.gridCells[cellPos.row][cellPos.col];
              
              // 检查格子是否已被其他拼图块占用
              if (cell.state === CellState.OCCUPIED && cell.pieceId !== pieceId) {
                return false;
              }

              // 检查是否覆盖了目标格子
              const { month, day, weekday } = state.dateTarget.targetPositions;
              const isTargetCell = (cellPos.row === month.row && cellPos.col === month.col) ||
                                 (cellPos.row === day.row && cellPos.col === day.col) ||
                                 (cellPos.row === weekday.row && cellPos.col === weekday.col);
              
              if (isTargetCell) {
                return false;
              }
            }
          }
        }

        return true;
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
      }
    })),
    {
      name: 'puzzle-game-store'
    }
  )
);