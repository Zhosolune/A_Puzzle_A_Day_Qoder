import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { GRID_CONFIG, GRID_RENDER_CONFIG, isBlockedPosition } from '../../data/gridLayout';
import { CellState } from '../../types';
import type { GridPosition } from '../../types';
import { getPuzzlePieceShape, getPieceShapeWithTransform } from '../../data/puzzlePieces';

interface GameBoardProps {
  className?: string;
}

export const GameBoard: React.FC<GameBoardProps> = ({ className }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredCell, setHoveredCell] = useState<GridPosition | null>(null);
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const {
    gridCells,
    dateTarget,
    showGrid,
    selectedPieceId,
    availablePieces,
    placedPieces,
    validatePlacement,
    dragState,
    updateDrag,
    updateGlobalDrag,
    endDrag,
    startDrag,
    removePiece,
    checkDropZone,
    setGameBoardRef
  } = useGameStore();

  // 设置GameBoard引用
  useEffect(() => {
    setGameBoardRef(canvasRef);
  }, [setGameBoardRef]);
  
  // 精确尺寸规格配置
  const CELL_SIZE = 80;        // 方块边长（包含1px边框）
  const GAP = 4;               // 方块间隔
  const OUTLINE_WIDTH = 6;     // 轮廓线粗细
  const OUTLINE_SPACING = 4;   // 轮廓线内边缘到方块外边缘的间距
  const OUTLINE_CENTER_OFFSET = OUTLINE_SPACING + OUTLINE_WIDTH / 2; // 轮廓线中心到方块边缘的距离 (2 + 2 = 4px)

  // Canvas边距：确保轮廓线完全在Canvas内部
  const CANVAS_MARGIN = OUTLINE_CENTER_OFFSET + OUTLINE_WIDTH / 2; // 轮廓线外边缘到Canvas边缘的距离 (4 + 2 = 6px)

  // Canvas尺寸计算：网格内容 + 两侧边距
  const gridContentWidth = GRID_CONFIG.WIDTH * (CELL_SIZE + GAP) - GAP;
  const gridContentHeight = GRID_CONFIG.HEIGHT * (CELL_SIZE + GAP) - GAP;
  const canvasWidth = gridContentWidth + 2 * CANVAS_MARGIN;
  const canvasHeight = gridContentHeight + 2 * CANVAS_MARGIN;

  // 计算格子在Canvas中的坐标（考虑Canvas边距）
  const getCellCanvasPosition = useCallback((row: number, col: number) => {
    return {
      x: col * (CELL_SIZE + GAP) + CANVAS_MARGIN,
      y: row * (CELL_SIZE + GAP) + CANVAS_MARGIN
    };
  }, []);

  // 基于BLOCKED_POSITIONS生成精确的轮廓路径
  const generateOutlinePath = useCallback((): { x: number; y: number }[] => {

    // 计算格子边界坐标的辅助函数
    const getCellBounds = (row: number, col: number) => {
      // 格子在Canvas中的实际位置（考虑Canvas边距）
      const cellX = col * (CELL_SIZE + GAP) + CANVAS_MARGIN;
      const cellY = row * (CELL_SIZE + GAP) + CANVAS_MARGIN;

      return {
        // 轮廓线路径坐标：轮廓线中心距离格子边缘OUTLINE_CENTER_OFFSET像素
        left: cellX - OUTLINE_CENTER_OFFSET,
        right: cellX + CELL_SIZE + OUTLINE_CENTER_OFFSET,
        top: cellY - OUTLINE_CENTER_OFFSET,
        bottom: cellY + CELL_SIZE + OUTLINE_CENTER_OFFSET
      };
    };



    const path: { x: number; y: number }[] = [];

    // 1. 起点：(0,0)的左上角
    const start = getCellBounds(0, 0);
    path.push({ x: start.left, y: start.top });

    // 2. 顶边：从(0,0)到(0,5)的右边
    const topEnd = getCellBounds(0, 5);
    path.push({ x: topEnd.right, y: start.top });

    // 3. 右边第一段：向下到(2,5)的上边
    const rightFirst = getCellBounds(2, 5);
    path.push({ x: topEnd.right, y: rightFirst.top });

    // 4. 向右扩展：到(2,6)的右边
    const rightExtend = getCellBounds(2, 6);
    path.push({ x: rightExtend.right, y: rightFirst.top });

    // 5. 右边第二段：向下到(6,6)的底边
    const rightSecond = getCellBounds(6, 6);
    path.push({ x: rightExtend.right, y: rightSecond.bottom });

    // 6. 继续向下到(7,6)的底边
    const bottomRight = getCellBounds(7, 6);
    path.push({ x: rightExtend.right, y: bottomRight.bottom });

    // 7. 底边：向左到(7,4)的左边
    const bottomLeft = getCellBounds(7, 4);
    path.push({ x: bottomLeft.left, y: bottomRight.bottom });

    // 8. 向上到(6,3)的底边
    const upTurn = getCellBounds(6, 3);
    path.push({ x: bottomLeft.left, y: upTurn.bottom });

    // 9. 向左到(0,0)的左边
    path.push({ x: start.left, y: upTurn.bottom });

    // 10. 回到起点，闭合路径
    path.push({ x: start.left, y: start.top });

    return path;
  }, []);

  // 绘制沿着有效网格轮廓的边框
  const drawGridOutline = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.save();

    // 设置边框样式
    ctx.strokeStyle = '#d97706'; // 琥珀色边框
    ctx.lineWidth = OUTLINE_WIDTH;
    ctx.lineCap = 'square';  // 线条端点为直角（方形）
    ctx.lineJoin = 'miter';  // 线条连接处为直角（尖角）

    // 生成动态轮廓路径
    const outlinePath = generateOutlinePath();

    if (outlinePath.length > 0) {
      ctx.beginPath();

      // 移动到起点
      ctx.moveTo(outlinePath[0].x, outlinePath[0].y);

      // 绘制路径
      for (let i = 1; i < outlinePath.length; i++) {
        ctx.lineTo(outlinePath[i].x, outlinePath[i].y);
      }

      // 绘制边框
      ctx.stroke();
    }

    ctx.restore();
  }, [generateOutlinePath]);
  
  // 检查网格位置是否应该显示（不显示阻塞的格子）
  const shouldRenderCell = useCallback((position: GridPosition): boolean => {
    return !isBlockedPosition(position);
  }, []);

  // 将鼠标坐标转换为网格坐标
  const getGridPositionFromMouseEvent = useCallback((event: React.MouseEvent<HTMLCanvasElement>): GridPosition | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const col = Math.floor((x - CANVAS_MARGIN) / (CELL_SIZE + GAP));
    const row = Math.floor((y - CANVAS_MARGIN) / (CELL_SIZE + GAP));

    if (row >= 0 && row < GRID_CONFIG.HEIGHT && col >= 0 && col < GRID_CONFIG.WIDTH) {
      return { row, col };
    }

    return null;
  }, []);

  // 检测鼠标位置是否在已放置的拼图块上
  const getPlacedPieceAtPosition = useCallback((position: GridPosition): string | null => {
    for (const [pieceId, placedPiece] of placedPieces) {
      // 检查位置是否在这个拼图块的占用区域内
      const isInPiece = placedPiece.occupiedCells.some(cell =>
        cell.row === position.row && cell.col === position.col
      );
      if (isInPiece) {
        return pieceId;
      }
    }
    return null;
  }, [placedPieces]);

  // 处理鼠标移动
  const handleCanvasMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const position = getGridPositionFromMouseEvent(event);
    setHoveredCell(position);
  }, [getGridPositionFromMouseEvent]);

  // 处理鼠标离开
  const handleCanvasMouseLeave = useCallback(() => {
    setHoveredCell(null);
  }, []);

  // 处理鼠标按下 - 支持已放置拼图块的重新拖拽
  const handleCanvasMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const position = getGridPositionFromMouseEvent(event);
    if (!position) return;

    // 检查是否点击了已放置的拼图块
    const clickedPieceId = getPlacedPieceAtPosition(position);
    if (clickedPieceId) {
      // 找到对应的拼图块数据
      const placedPiece = placedPieces.get(clickedPieceId);
      const availablePiece = availablePieces.find(p => p.id === clickedPieceId);

      if (placedPiece && availablePiece) {
        // 从面板移除拼图块
        removePiece(clickedPieceId);

        // 计算拖拽偏移量
        const canvas = canvasRef.current;
        if (canvas) {
          const rect = canvas.getBoundingClientRect();
          const pieceStartX = placedPiece.position.col * (CELL_SIZE + GAP) + CANVAS_MARGIN;
          const pieceStartY = placedPiece.position.row * (CELL_SIZE + GAP) + CANVAS_MARGIN;

          const offset = {
            x: event.clientX - rect.left - pieceStartX,
            y: event.clientY - rect.top - pieceStartY
          };

          // 设置拖拽光标
          document.body.style.cursor = 'grabbing';

          // 开始拖拽（从面板拖拽，没有存放区域信息）
          startDrag(clickedPieceId, offset);
        }
      }
    }
  }, [getGridPositionFromMouseEvent, getPlacedPieceAtPosition, placedPieces, availablePieces, removePiece, startDrag]);

  // 绘制单个拼图块
  const drawPuzzlePiece = useCallback((ctx: CanvasRenderingContext2D, placedPiece: any) => {
    const pieceShape = getPuzzlePieceShape(placedPiece.pieceId);
    const rotatedShape = getPieceShapeWithTransform(
      placedPiece.pieceId,
      placedPiece.rotation,
      placedPiece.isFlippedHorizontally || false,
      placedPiece.isFlippedVertically || false
    );

    if (!pieceShape || !rotatedShape) return;
    
    for (let r = 0; r < rotatedShape.length; r++) {
      for (let c = 0; c < rotatedShape[r].length; c++) {
        if (rotatedShape[r][c]) {
          const cellRow = placedPiece.position.row + r;
          const cellCol = placedPiece.position.col + c;
          
          if (cellRow >= 0 && cellRow < GRID_CONFIG.HEIGHT && cellCol >= 0 && cellCol < GRID_CONFIG.WIDTH) {
            const cellPos = getCellCanvasPosition(cellRow, cellCol);
            const x = cellPos.x;
            const y = cellPos.y;
            
            // 绘制拼图块格子
            ctx.fillStyle = pieceShape.color;
            ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
            
            // 绘制拼图块边框
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);
          }
        }
      }
    }
  }, []);

  // 绘制预览（支持悬停预览和拖拽预览）
  const drawPreview = useCallback((ctx: CanvasRenderingContext2D) => {
    let previewPosition: GridPosition | null = null;
    let previewPieceId: string | null = null;
    let previewPiece: any = null;

    // 优先显示拖拽预览
    if (dragState.isDragging && dragState.draggedPiece && dragState.currentGridPosition) {
      previewPosition = dragState.currentGridPosition;
      previewPieceId = dragState.draggedPiece.id;
      previewPiece = dragState.draggedPiece;
    }
    // 其次显示悬停预览（仅在非拖拽状态下）
    else if (!dragState.isDragging && selectedPieceId && hoveredCell) {
      previewPosition = hoveredCell;
      previewPieceId = selectedPieceId;
      previewPiece = availablePieces.find(p => p.id === selectedPieceId);
    }

    if (!previewPosition || !previewPieceId || !previewPiece || previewPiece.isPlaced) return;

    const isValid = dragState.isDragging ? dragState.isValidPosition : validatePlacement(previewPieceId, previewPosition);
    const rotatedShape = getPieceShapeWithTransform(
      previewPiece.shapeId,
      previewPiece.rotation,
      previewPiece.isFlippedHorizontally || false,
      previewPiece.isFlippedVertically || false
    );

    if (!rotatedShape) return;

    // 绘制预览，拖拽时透明度更高
    ctx.globalAlpha = dragState.isDragging ? 0.7 : 0.5;

    for (let r = 0; r < rotatedShape.length; r++) {
      for (let c = 0; c < rotatedShape[r].length; c++) {
        if (rotatedShape[r][c]) {
          const cellRow = previewPosition.row + r;
          const cellCol = previewPosition.col + c;

          if (cellRow >= 0 && cellRow < GRID_CONFIG.HEIGHT && cellCol >= 0 && cellCol < GRID_CONFIG.WIDTH) {
            const cellPos = getCellCanvasPosition(cellRow, cellCol);
            const x = cellPos.x;
            const y = cellPos.y;

            // 根据是否有效显示不同颜色，拖拽时颜色更鲜艳
            if (dragState.isDragging) {
              ctx.fillStyle = isValid ? '#10b981' : '#f87171'; // 更鲜艳的绿色和红色
              ctx.strokeStyle = isValid ? '#059669' : '#dc2626';
            } else {
              ctx.fillStyle = isValid ? '#22d3ee' : '#ef4444';
              ctx.strokeStyle = isValid ? '#0891b2' : '#dc2626';
            }

            ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);
          }
        }
      }
    }

    ctx.globalAlpha = 1.0;
  }, [selectedPieceId, hoveredCell, availablePieces, validatePlacement, dragState]);

  // 绘制网格
  const drawGrid = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    
    // 不绘制整个Canvas背景，让其保持透明，突出不规则游戏区域形状
    
    // 绘制网格单元（只绘制有效格子）
    for (let row = 0; row < GRID_CONFIG.HEIGHT; row++) {
      for (let col = 0; col < GRID_CONFIG.WIDTH; col++) {
        const position = { row, col };
        
        // 跳过不应该显示的格子（阻塞格子）
        if (!shouldRenderCell(position)) {
          continue;
        }
        
        const cellPos = getCellCanvasPosition(row, col);
        const x = cellPos.x;
        const y = cellPos.y;
        const cell = gridCells[row][col];
        
        // 设置单元格颜色
        let fillColor = GRID_RENDER_CONFIG.colors.cellDefault;
        let strokeColor = GRID_RENDER_CONFIG.colors.borderDefault;
        
        switch (cell.state) {
          case CellState.RESERVED:
            fillColor = GRID_RENDER_CONFIG.colors.cellReserved;
            break;
          case CellState.OCCUPIED:
            // 占用的格子不在这里绘制，由拼图块绘制
            continue;
          default:
            break;
        }
        
        // 检查是否为目标单元格
        const isTargetCell = 
          (row === dateTarget.targetPositions.month.row && col === dateTarget.targetPositions.month.col) ||
          (row === dateTarget.targetPositions.day.row && col === dateTarget.targetPositions.day.col) ||
          (row === dateTarget.targetPositions.weekday.row && col === dateTarget.targetPositions.weekday.col);
        
        if (isTargetCell) {
          fillColor = GRID_RENDER_CONFIG.colors.cellTarget;
          strokeColor = GRID_RENDER_CONFIG.colors.borderTarget;
        }
        
        // 绘制单元格
        ctx.fillStyle = fillColor;
        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
        
        // 绘制边框
        if (showGrid) {
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = 1;
          ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);
        }
        
        // 绘制标签文本
        if (cell.label) {
          ctx.fillStyle = isTargetCell ? GRID_RENDER_CONFIG.colors.textTarget : GRID_RENDER_CONFIG.colors.textDefault;
          ctx.font = `${GRID_RENDER_CONFIG.font.weight} ${GRID_RENDER_CONFIG.font.size + 2}px ${GRID_RENDER_CONFIG.font.family}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          
          const textX = x + CELL_SIZE / 2;
          const textY = y + CELL_SIZE / 2;
          
          ctx.fillText(cell.label, textX, textY);
        }
      }
    }
    
    // 绘制已放置的拼图块（排除正在拖拽的拼图块）
    Array.from(placedPieces.values()).forEach((placedPiece) => {
      // 如果这个拼图块正在被拖拽，不在面板上绘制
      if (dragState.isDragging && dragState.draggedPiece?.id === placedPiece.pieceId) {
        return;
      }
      drawPuzzlePiece(ctx, placedPiece);
    });
    
    // 绘制预览
    drawPreview(ctx);
    // 绘制沿着网格轮廓的边框
    drawGridOutline(ctx);
  }, [gridCells, dateTarget, showGrid, placedPieces, drawPuzzlePiece, drawPreview, canvasWidth, canvasHeight, shouldRenderCell, drawGridOutline]);

  // 全局拖拽事件监听
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (dragState.isDragging) {
        const globalPosition = { x: e.clientX, y: e.clientY };
        const dropZone = checkDropZone(globalPosition);

        // 更新全局鼠标位置和拖拽区域状态
        const isInValidDropZone = dropZone !== 'invalid';
        updateGlobalDrag(globalPosition, isInValidDropZone);

        const canvas = canvasRef.current;

        if (dropZone === 'left-storage' || dropZone === 'right-storage') {
          // 在存放区域内
          updateDrag(null);

          // 检查是否是正确的存放区域
          const isCorrectStorage = (
            (dropZone === 'left-storage' && dragState.originalStorageArea === 'left') ||
            (dropZone === 'right-storage' && dragState.originalStorageArea === 'right') ||
            !dragState.originalStorageArea // 从面板拖拽的可以放到任意存放区域
          );

          document.body.style.cursor = isCorrectStorage ? 'grabbing' : 'not-allowed';
        } else if (canvas) {
          // 检查是否在GameBoard区域内
          const rect = canvas.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;

          // 检查鼠标是否在Canvas区域内
          const isInCanvas = x >= 0 && y >= 0 && x <= rect.width && y <= rect.height;

          if (isInCanvas) {
            const col = Math.floor((x - CANVAS_MARGIN) / (CELL_SIZE + GAP));
            const row = Math.floor((y - CANVAS_MARGIN) / (CELL_SIZE + GAP));

            // 检查是否在网格范围内
            if (row >= 0 && row < GRID_CONFIG.HEIGHT && col >= 0 && col < GRID_CONFIG.WIDTH) {
              updateDrag({ row, col });
              document.body.style.cursor = 'grabbing';
            } else {
              updateDrag(null);
              document.body.style.cursor = 'not-allowed';
            }
          } else {
            updateDrag(null);
            document.body.style.cursor = 'not-allowed';
          }
        } else {
          // 不在任何有效区域内
          updateDrag(null);
          document.body.style.cursor = 'not-allowed';
        }
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (dragState.isDragging) {
        // 恢复默认光标
        document.body.style.cursor = 'default';

        const globalPosition = { x: e.clientX, y: e.clientY };
        const dropZone = checkDropZone(globalPosition);

        if (dropZone === 'left-storage' || dropZone === 'right-storage') {
          // 拖拽到存放区域
          const isCorrectStorage = (
            (dropZone === 'left-storage' && dragState.originalStorageArea === 'left') ||
            (dropZone === 'right-storage' && dragState.originalStorageArea === 'right') ||
            !dragState.originalStorageArea // 从面板拖拽的可以放到任意存放区域
          );

          if (isCorrectStorage) {
            // 放置到正确的存放区域，调用endDrag但不传位置（表示放回存放区域）
            endDrag();
          } else {
            // 放置到错误的存放区域，取消放置
            endDrag();
          }
        } else {
          // 检查是否在GameBoard区域
          const canvas = canvasRef.current;
          if (canvas) {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // 检查鼠标是否在Canvas区域内
            const isInCanvas = x >= 0 && y >= 0 && x <= rect.width && y <= rect.height;

            if (isInCanvas) {
              const col = Math.floor((x - CANVAS_MARGIN) / (CELL_SIZE + GAP));
              const row = Math.floor((y - CANVAS_MARGIN) / (CELL_SIZE + GAP));

              if (row >= 0 && row < GRID_CONFIG.HEIGHT && col >= 0 && col < GRID_CONFIG.WIDTH) {
                endDrag({ row, col });
              } else {
                endDrag(); // 在Canvas内但不在网格范围内，取消放置
              }
            } else {
              endDrag(); // 不在Canvas区域内，取消放置
            }
          } else {
            endDrag(); // 无法访问Canvas，取消放置
          }
        }
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState.isDragging, updateDrag, updateGlobalDrag, endDrag]);

  // 简化的window resize事件监听（仅在需要时重绘Canvas）
  useEffect(() => {
    const handleWindowResize = () => {
      // 清理之前的定时器
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }

      // 设置防抖定时器，重绘Canvas
      resizeTimeoutRef.current = setTimeout(() => {
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            // 重新设置高DPI支持
            const dpr = window.devicePixelRatio || 1;
            const rect = canvas.getBoundingClientRect();

            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;

            ctx.scale(dpr, dpr);

            // 重绘
            drawGrid(ctx);
          }
        }
      }, 200); // 200ms防抖
    };

    window.addEventListener('resize', handleWindowResize);

    return () => {
      window.removeEventListener('resize', handleWindowResize);
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, [drawGrid]);

  // 重新绘制canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 设置高DPI支持
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    ctx.scale(dpr, dpr);

    drawGrid(ctx);
  }, [drawGrid]);

  return (
    <div className={`inline-block ${className || ''}`}>
      {/* 简化的容器，突出Canvas内部的边框 */}
      <div className="relative p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl shadow-lg">
        {/* Canvas网格 */}
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          className="cursor-pointer"
          style={{
            width: canvasWidth,
            height: canvasHeight,
            backgroundColor: 'transparent' // 透明背景，突出不规则游戏区域形状
          }}
          onMouseMove={handleCanvasMouseMove}
          onMouseLeave={handleCanvasMouseLeave}
          onMouseDown={handleCanvasMouseDown}
        />
      </div>
    </div>
  );
};