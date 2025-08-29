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
  
  // 新增：记录单击选择的已放置拼图块与工具栏位置（相对于视口，position: fixed）
  const [selectedPlacedPieceId, setSelectedPlacedPieceId] = useState<string | null>(null);
  const [toolbarPos, setToolbarPos] = useState<{ x: number; y: number } | null>(null);
  // 新增：延迟启动拖拽的判定（避免单击即进入拖拽）
  const pendingDragRef = useRef<{
    pieceId: string;
    startClientX: number;
    startClientY: number;
    offset: { x: number; y: number };
  } | null>(null);

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
    setGameBoardRef,
    // 新增：调用旋转/翻转动作
    rotatePiece,
    flipPieceHorizontally,
    flipPieceVertically,
    addNotification
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

  // 为越界渲染预留的缓冲格数（左右上下各预留）
  const OVERSCAN_CELLS = 1;

  // Canvas边距：确保轮廓线完全在Canvas内部 + 允许越界可见
  const CANVAS_MARGIN = OUTLINE_CENTER_OFFSET + OUTLINE_WIDTH / 2 + OVERSCAN_CELLS * (CELL_SIZE + GAP);

  // Canvas尺寸计算：网格内容 + 两侧边距（含 overscan）
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

  // 获取位于某网格位置的顶层拼图块（按 zIndex 最大优先）
  const getTopPlacedPieceAt = useCallback((position: GridPosition): string | null => {
    let topId: string | null = null;
    let topZ = -Infinity;
    for (const [pieceId, placedPiece] of placedPieces) {
      const isInPiece = placedPiece.occupiedCells.some(cell => cell.row === position.row && cell.col === position.col);
      if (isInPiece) {
        const z = (placedPiece as any).zIndex ?? 0;
        if (z > topZ) {
          topZ = z;
          topId = pieceId;
        } else if (z === topZ) {
          // 同层级时，后出现（插入更晚）的覆盖前者
          topId = pieceId;
        }
      }
    }
    return topId;
  }, [placedPieces]);


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
    // 优化：保持最后一个有效预览，不清空 hoveredCell
    // 如果需要强制显示“无效”提示，可在 drawPreview 中根据 dragState.isInValidDropZone 决定颜色
  }, []);

  // 处理鼠标按下 - 支持已放置拼图块的重新拖拽 或 单击选中显示工具栏
  const handleCanvasMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const position = getGridPositionFromMouseEvent(event);
    if (!position) {
      // 点击到无效区域，清除选择
      setSelectedPlacedPieceId(null);
      setToolbarPos(null);
      return;
    }

    // 检查是否点击了已放置的拼图块（取顶层）
    const clickedPieceId = getTopPlacedPieceAt(position) || getPlacedPieceAtPosition(position);
    if (clickedPieceId) {
      // 记录为待拖拽，只有超过阈值才真正开始拖拽；否则在 mouseup 作为“单击”处理
      const placedPiece = placedPieces.get(clickedPieceId);
      const canvas = canvasRef.current;
      if (placedPiece && canvas) {
        const rect = canvas.getBoundingClientRect();
        const pieceStartX = placedPiece.position.col * (CELL_SIZE + GAP) + CANVAS_MARGIN;
        const pieceStartY = placedPiece.position.row * (CELL_SIZE + GAP) + CANVAS_MARGIN;
        const offset = {
          x: event.clientX - rect.left - pieceStartX,
          y: event.clientY - rect.top - pieceStartY
        };
        pendingDragRef.current = {
          pieceId: clickedPieceId,
          startClientX: event.clientX,
          startClientY: event.clientY,
          offset
        };
      }
    } else {
      // 点击空白格，清除选择
      setSelectedPlacedPieceId(null);
      setToolbarPos(null);
    }
  }, [getGridPositionFromMouseEvent, getPlacedPieceAtPosition, getTopPlacedPieceAt, placedPieces]);

  // 绘制单个拼图块
  const drawPuzzlePiece = (ctx: CanvasRenderingContext2D, placedPiece: any, overlappingCells: Set<string> = new Set()) => {
    const pieceShape = getPuzzlePieceShape(placedPiece.pieceId);
    const rotatedShape = getPieceShapeWithTransform(
      placedPiece.pieceId,
      placedPiece.rotation,
      placedPiece.isFlippedHorizontally || false,
      placedPiece.isFlippedVertically || false
    );

    if (!pieceShape || !rotatedShape) return;

    // 收集所有占用的单元格位置
    const occupiedCells: {row: number; col: number}[] = [];
    for (let r = 0; r < rotatedShape.length; r++) {
      for (let c = 0; c < rotatedShape[r].length; c++) {
        if (rotatedShape[r][c]) {
          const cellRow = placedPiece.position.row + r;
          const cellCol = placedPiece.position.col + c;
          occupiedCells.push({row: cellRow, col: cellCol});
        }
      }
    }

    // 绘制拼图块填充
    occupiedCells.forEach(cell => {
      const cellPos = getCellCanvasPosition(cell.row, cell.col);
      const x = cellPos.x;
      const y = cellPos.y;

      // 检查当前单元格是否重叠
      const cellKey = `${cell.row},${cell.col}`;
      const isThisCellOverlapping = overlappingCells.has(cellKey);
      
      // 如果当前单元格重叠，使用红色；否则使用原色
      ctx.fillStyle = isThisCellOverlapping ? '#dc2626' : pieceShape.color;
      ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
    });

    // 为重叠的方块绘制红色提示边框
    const overlappingCellsArray = occupiedCells.filter(cell => overlappingCells.has(`${cell.row},${cell.col}`));
    if (overlappingCellsArray.length > 0) {
      drawOverlapWarningBorder(ctx, overlappingCellsArray);
    }

    // 绘制连续外边框（只有外轮廓，颜色调浅）
    // 所有放置的拼图块都显示边缘
    drawContinuousOutlineForPiece(ctx, occupiedCells);
  };

  // 为正常拼图块绘制浅色连续外边框
  const drawContinuousOutlineForPiece = (ctx: CanvasRenderingContext2D, cells: {row: number; col: number}[]) => {
    // 基于单元格集计算外轮廓：找出每个单元格四条边中"暴露"的边，组合成多段路径
    const edges = new Map<string, { x1: number; y1: number; x2: number; y2: number }>();
    const keyOf = (x1: number, y1: number, x2: number, y2: number) => `${x1},${y1}-${x2},${y2}`;
    const sameEdgeKey = (x1: number, y1: number, x2: number, y2: number) => `${x2},${y2}-${x1},${y1}`;

    cells.forEach(cell => {
      const { x, y } = getCellCanvasPosition(cell.row, cell.col);
      const l = x, r = x + CELL_SIZE, t = y, b = y + CELL_SIZE;
      const cellEdges = [
        { x1: l, y1: t, x2: r, y2: t }, // top
        { x1: r, y1: t, x2: r, y2: b }, // right
        { x1: r, y1: b, x2: l, y2: b }, // bottom
        { x1: l, y1: b, x2: l, y2: t }  // left
      ];
      cellEdges.forEach(e => {
        const k = keyOf(e.x1, e.y1, e.x2, e.y2);
        const rk = sameEdgeKey(e.x1, e.y1, e.x2, e.y2);
        if (edges.has(rk)) {
          // 与相邻单元共享的边：删除，避免内部边被描边
          edges.delete(rk);
        } else {
          edges.set(k, e);
        }
      });
    });

    // 将边绘制为连续路径
    ctx.save();
    ctx.strokeStyle = '#94a3b8'; // 浅灰色
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    edges.forEach(e => {
      ctx.moveTo(e.x1, e.y1);
      ctx.lineTo(e.x2, e.y2);
    });
    ctx.stroke();
    ctx.restore();
  };

  // 为重叠方块绘制红色提示边框
  const drawOverlapWarningBorder = (ctx: CanvasRenderingContext2D, overlappingCells: {row: number; col: number}[]) => {
    // 基于重叠单元格集计算外轮廓边框
    const edges = new Map<string, { x1: number; y1: number; x2: number; y2: number }>();
    const keyOf = (x1: number, y1: number, x2: number, y2: number) => `${x1},${y1}-${x2},${y2}`;
    const sameEdgeKey = (x1: number, y1: number, x2: number, y2: number) => `${x2},${y2}-${x1},${y1}`;

    overlappingCells.forEach(cell => {
      const { x, y } = getCellCanvasPosition(cell.row, cell.col);
      // 扩展边框，距离方块2px
      const offset = 2;
      const l = x - offset, r = x + CELL_SIZE + offset, t = y - offset, b = y + CELL_SIZE + offset;
      const cellEdges = [
        { x1: l, y1: t, x2: r, y2: t }, // top
        { x1: r, y1: t, x2: r, y2: b }, // right
        { x1: r, y1: b, x2: l, y2: b }, // bottom
        { x1: l, y1: b, x2: l, y2: t }  // left
      ];
      cellEdges.forEach(e => {
        const k = keyOf(e.x1, e.y1, e.x2, e.y2);
        const rk = sameEdgeKey(e.x1, e.y1, e.x2, e.y2);
        if (edges.has(rk)) {
          // 与相邻单元共享的边：删除，避免内部边被描边
          edges.delete(rk);
        } else {
          edges.set(k, e);
        }
      });
    });

    // 绘制主边框
    ctx.save();
    ctx.strokeStyle = '#dc2626'; // 红色边框
    ctx.lineWidth = 2;
    ctx.beginPath();
    edges.forEach(e => {
      ctx.moveTo(e.x1, e.y1);
      ctx.lineTo(e.x2, e.y2);
    });
    ctx.stroke();
    ctx.restore();
  };

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

    // 面板外预览隐藏：若所有格子都越界，则不绘制预览
    const allOut = (() => {
      for (let r = 0; r < rotatedShape.length; r++) {
        for (let c = 0; c < rotatedShape[r].length; c++) {
          if (rotatedShape[r][c]) {
            const rr = previewPosition.row + r;
            const cc = previewPosition.col + c;
            if (rr >= 0 && rr < GRID_CONFIG.HEIGHT && cc >= 0 && cc < GRID_CONFIG.WIDTH) {
              return false;
            }
          }
        }
      }
      return true;
    })();
    if (allOut) return;

    // 获取拼图块的原始颜色
    const pieceShape = getPuzzlePieceShape(previewPiece.shapeId);
    const originalColor = pieceShape?.color || '#6b7280'; // 默认灰色

    // 绘制预览，拖拽时透明度更高
    ctx.globalAlpha = dragState.isDragging ? 0.6 : 0.4;

    for (let r = 0; r < rotatedShape.length; r++) {
      for (let c = 0; c < rotatedShape[r].length; c++) {
        if (rotatedShape[r][c]) {
          const cellRow = previewPosition.row + r;
          const cellCol = previewPosition.col + c;

          // 允许越界预览：不再限制网格范围
          const cellPos = getCellCanvasPosition(cellRow, cellCol);
          const x = cellPos.x;
          const y = cellPos.y;

          // 使用拼图块本身的颜色，根据有效性调整透明度和边框
          ctx.fillStyle = originalColor;
          
          if (isValid) {
            // 有效位置：使用原色，边框为深色
            ctx.strokeStyle = '#333333';
          } else {
            // 无效位置：保持原色但边框为红色提示
            ctx.strokeStyle = '#dc2626';
          }

          ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
          ctx.lineWidth = 2;
          ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);
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

    // 检测重叠的单元格
    const overlappingCells = new Set<string>();
    const allOccupiedCells = new Map<string, string[]>(); // cellKey -> pieceIds
    
    Array.from(placedPieces.values()).forEach((p: any) => {
      p.occupiedCells.forEach((cell: any) => {
        const cellKey = `${cell.row},${cell.col}`;
        if (!allOccupiedCells.has(cellKey)) {
          allOccupiedCells.set(cellKey, []);
        }
        allOccupiedCells.get(cellKey)!.push(p.pieceId);
      });
    });
    
    // 找出被多个拼图块占用的单元格
    allOccupiedCells.forEach((pieceIds, cellKey) => {
      if (pieceIds.length > 1) {
        overlappingCells.add(cellKey);
      }
    });

    // 绘制已放置的拼图块（排除正在拖拽的拼图块）
    // 按 zIndex 从小到大绘制，后放置的自然在上层
    Array.from(placedPieces.values())
      .sort((a: any, b: any) => (a.zIndex || 0) - (b.zIndex || 0))
      .forEach((placedPiece) => {
        if (dragState.isDragging && dragState.draggedPiece?.id === placedPiece.pieceId) {
          return;
        }
        drawPuzzlePiece(ctx, placedPiece, overlappingCells);
      });

    const drawContinuousOutline = (ctx: CanvasRenderingContext2D, cells: {row: number; col: number}[]) => {
      // 基于单元格集计算外轮廓：找出每个单元格四条边中“暴露”的边，组合成多段路径
      const edges = new Map<string, { x1: number; y1: number; x2: number; y2: number }>();
      const keyOf = (x1: number, y1: number, x2: number, y2: number) => `${x1},${y1}-${x2},${y2}`;
      const sameEdgeKey = (x1: number, y1: number, x2: number, y2: number) => `${x2},${y2}-${x1},${y1}`;

      cells.forEach(cell => {
        const { x, y } = getCellCanvasPosition(cell.row, cell.col);
        const l = x, r = x + CELL_SIZE, t = y, b = y + CELL_SIZE;
        const cellEdges = [
          { x1: l, y1: t, x2: r, y2: t }, // top
          { x1: r, y1: t, x2: r, y2: b }, // right
          { x1: r, y1: b, x2: l, y2: b }, // bottom
          { x1: l, y1: b, x2: l, y2: t }  // left
        ];
        cellEdges.forEach(e => {
          const k = keyOf(e.x1, e.y1, e.x2, e.y2);
          const rk = sameEdgeKey(e.x1, e.y1, e.x2, e.y2);
          if (edges.has(rk)) {
            // 与相邻单元共享的边：删除，避免内部边被描边
            edges.delete(rk);
          } else {
            edges.set(k, e);
          }
        });
      });

      // 将边绘制为连续路径（简单相连：分组连接）
      ctx.save();
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 4;
      ctx.beginPath();
      edges.forEach(e => {
        ctx.moveTo(e.x1, e.y1);
        ctx.lineTo(e.x2, e.y2);
      });
      ctx.stroke();
      ctx.restore();
    };

    // 重叠检测和绘制已经在上面的drawPuzzlePiece调用中处理

    // 绘制预览
    drawPreview(ctx);
    // 绘制沿着网格轮廓的边框
    drawGridOutline(ctx);
  }, [gridCells, dateTarget, showGrid, placedPieces, availablePieces, drawPreview, canvasWidth, canvasHeight, shouldRenderCell, drawGridOutline]);

  // 全局拖拽事件监听
  useEffect(() => {
    const DRAG_THRESHOLD = 5; // 像素阈值：超过则认为开始拖拽

    const handleMouseMove = (e: MouseEvent) => {
      // 若未进入正式拖拽，但存在待拖拽对象，判断是否越过阈值，越过则启动拖拽
      if (!dragState.isDragging && pendingDragRef.current) {
        const dx = e.clientX - pendingDragRef.current.startClientX;
        const dy = e.clientY - pendingDragRef.current.startClientY;
        if (Math.hypot(dx, dy) > DRAG_THRESHOLD) {
          const { pieceId, offset } = pendingDragRef.current;
          pendingDragRef.current = null;

          // 真正启动拖拽：先从面板移除，再开始拖拽
          removePiece(pieceId);
          document.body.style.cursor = 'grabbing';
          startDrag(pieceId, offset);

          // 开始拖拽时隐藏工具栏
          setSelectedPlacedPieceId(null);
          setToolbarPos(null);
          return; // 后续逻辑由 drag 分支处理
        }
      }

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
            const anchorX = x - dragState.dragOffset.x;
            const anchorY = y - dragState.dragOffset.y;

            // 计算当前拖拽形状的行列尺寸
            let rotatedShape: boolean[][] | null = null;
            if (dragState.draggedPiece) {
              rotatedShape = getPieceShapeWithTransform(
                dragState.draggedPiece.shapeId,
                dragState.draggedPiece.rotation,
                dragState.draggedPiece.isFlippedHorizontally || false,
                dragState.draggedPiece.isFlippedVertically || false
              );
            }
            const tile = CELL_SIZE + GAP;

            // 浮动（未吸附）左上角的网格坐标（可为小数）
            const gX = (anchorX - CANVAS_MARGIN) / tile;
            const gY = (anchorY - CANVAS_MARGIN) / tile;
            const baseCol = Math.floor(gX);
            const baseRow = Math.floor(gY);

            // 在 8 个方向（含原位，共9个）内寻找与当前浮动位置重合面积最大的候选
            const candidates: Array<{ col: number; row: number; score: number }> = [];
            const scoreFor = (col: number, row: number): number => {
              const dx = Math.abs(gX - col);
              const dy = Math.abs(gY - row);
              const ox = Math.max(0, 1 - dx); // 与浮动位置在x方向的覆盖程度 [0,1]
              const oy = Math.max(0, 1 - dy); // 与浮动位置在y方向的覆盖程度 [0,1]
              return ox * oy; // 估算重合面积比例（与形状具体分布无关，但稳定）
            };
            for (let dr = -1; dr <= 1; dr++) {
              for (let dc = -1; dc <= 1; dc++) {
                const cCol = baseCol + dc;
                const cRow = baseRow + dr;
                candidates.push({ col: cCol, row: cRow, score: scoreFor(cCol, cRow) });
              }
            }
            candidates.sort((a, b) => b.score - a.score);
            const best = candidates[0];
            const topLeftCol = best.col;
            const topLeftRow = best.row;

            // 若完全越界则不显示预览
            let anyIn = false;
            if (rotatedShape) {
              for (let r = 0; r < rotatedShape.length && !anyIn; r++) {
                for (let c = 0; c < rotatedShape[r].length && !anyIn; c++) {
                  if (!rotatedShape[r][c]) continue;
                  const rr = topLeftRow + r;
                  const cc = topLeftCol + c;
                  if (rr >= 0 && rr < GRID_CONFIG.HEIGHT && cc >= 0 && cc < GRID_CONFIG.WIDTH) {
                    anyIn = true;
                  }
                }
              }
            }

            if (anyIn) {
              updateDrag({ row: topLeftRow, col: topLeftCol });
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
      // 若未进入正式拖拽且存在待拖拽对象 => 视为“单击选择”
      if (!dragState.isDragging && pendingDragRef.current) {
        const { pieceId } = pendingDragRef.current;
        pendingDragRef.current = null;

        // 设置选中并计算工具栏位置（固定定位：视口坐标）
        setSelectedPlacedPieceId(pieceId);

        const placedPiece = placedPieces.get(pieceId);
        const canvas = canvasRef.current;
        if (placedPiece && canvas) {
          const rect = canvas.getBoundingClientRect();
          const rotatedShape = getPieceShapeWithTransform(
            placedPiece.pieceId,
            placedPiece.rotation,
            placedPiece.isFlippedHorizontally || false,
            placedPiece.isFlippedVertically || false
          );
          if (rotatedShape) {
            const cols = rotatedShape[0]?.length || 1;
            const rows = rotatedShape.length;
            const tile = CELL_SIZE + GAP;
            const startX = placedPiece.position.col * tile + CANVAS_MARGIN;
            const startY = placedPiece.position.row * tile + CANVAS_MARGIN;
            const widthPx = cols * CELL_SIZE + (cols - 1) * GAP; // = cols*tile - GAP
            const heightPx = rows * CELL_SIZE + (rows - 1) * GAP;

            // 工具栏中心对齐到拼图块底部中心，距底部8px
            const centerXInCanvas = startX + widthPx / 2;
            const bottomYInCanvas = startY + heightPx;
            setToolbarPos({
              x: rect.left + centerXInCanvas,
              y: rect.top + bottomYInCanvas + 8
            });
          }
        }
        return;
      }

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
            endDrag();
          } else {
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
              // 最大重合面积吸附：与 mousemove 保持一致
              const anchorX = x - dragState.dragOffset.x;
              const anchorY = y - dragState.dragOffset.y;

              let rotatedShape: boolean[][] | null = null;
              if (dragState.draggedPiece) {
                rotatedShape = getPieceShapeWithTransform(
                  dragState.draggedPiece.shapeId,
                  dragState.draggedPiece.rotation,
                  dragState.draggedPiece.isFlippedHorizontally || false,
                  dragState.draggedPiece.isFlippedVertically || false
                );
              }

              const tile = CELL_SIZE + GAP;
              const gX = (anchorX - CANVAS_MARGIN) / tile;
              const gY = (anchorY - CANVAS_MARGIN) / tile;
              const baseCol = Math.floor(gX);
              const baseRow = Math.floor(gY);

              const candidates: Array<{ col: number; row: number; score: number }> = [];
              const scoreFor = (col: number, row: number): number => {
                const dx = Math.abs(gX - col);
                const dy = Math.abs(gY - row);
                const ox = Math.max(0, 1 - dx);
                const oy = Math.max(0, 1 - dy);
                return ox * oy;
              };
              for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                  const cCol = baseCol + dc;
                  const cRow = baseRow + dr;
                  candidates.push({ col: cCol, row: cRow, score: scoreFor(cCol, cRow) });
                }
              }
              candidates.sort((a, b) => b.score - a.score);
              const best = candidates[0];
              const topLeftCol = best.col;
              const topLeftRow = best.row;

              // 若完全越界则不落点
              let anyIn = false;
              if (rotatedShape) {
                for (let r = 0; r < rotatedShape.length && !anyIn; r++) {
                  for (let c = 0; c < rotatedShape[r].length && !anyIn; c++) {
                    if (!rotatedShape[r][c]) continue;
                    const rr = topLeftRow + r;
                    const cc = topLeftCol + c;
                    if (rr >= 0 && rr < GRID_CONFIG.HEIGHT && cc >= 0 && cc < GRID_CONFIG.WIDTH) {
                      anyIn = true;
                    }
                  }
                }
              }

              if (anyIn) {
                endDrag({ row: topLeftRow, col: topLeftCol });
              } else {
                endDrag();
              }
            } else {
              endDrag();
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
      // 清理待拖拽状态
      pendingDragRef.current = null;
    };
  }, [dragState.isDragging, updateDrag, updateGlobalDrag, endDrag, checkDropZone, removePiece, startDrag]);

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

  // 新增：当放置/可用数据变化时强制重绘，确保旋转/翻转后立即更新画面
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawGrid(ctx);
  }, [placedPieces, availablePieces, gridCells]); // 移除drawGrid依赖，避免无限循环

  // 新增：当已放置拼图块发生旋转/翻转时，更新工具栏位置以贴合新形状
  useEffect(() => {
    if (!selectedPlacedPieceId) return;
    const placedPiece = placedPieces.get(selectedPlacedPieceId);
    const canvas = canvasRef.current;
    if (!placedPiece || !canvas) return;

    const rect = canvas.getBoundingClientRect();
    const rotatedShape = getPieceShapeWithTransform(
      placedPiece.pieceId,
      placedPiece.rotation,
      placedPiece.isFlippedHorizontally || false,
      placedPiece.isFlippedVertically || false
    );
    if (!rotatedShape) return;

    const cols = rotatedShape[0]?.length || 1;
    const rows = rotatedShape.length;
    const tile = CELL_SIZE + GAP;
    const startX = placedPiece.position.col * tile + CANVAS_MARGIN;
    const startY = placedPiece.position.row * tile + CANVAS_MARGIN;
    const widthPx = cols * CELL_SIZE + (cols - 1) * GAP;
    const heightPx = rows * CELL_SIZE + (rows - 1) * GAP;

    const centerXInCanvas = startX + widthPx / 2;
    const bottomYInCanvas = startY + heightPx;
    setToolbarPos({
      x: rect.left + centerXInCanvas,
      y: rect.top + bottomYInCanvas + 8
    });
  }, [selectedPlacedPieceId, placedPieces]);

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

        {/* 已放置拼图块的悬浮工具栏（固定定位，随视口） */}
        {selectedPlacedPieceId && toolbarPos && (
          <div
            className="fixed z-50 flex gap-1 bg-white rounded-lg shadow-lg border p-1"
            style={{ left: `${toolbarPos.x}px`, top: `${toolbarPos.y}px`, transform: 'translateX(-50%)' }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 右旋 */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                if (selectedPlacedPieceId) {
                  rotatePiece(selectedPlacedPieceId);
                }
              }}
              className="w-7 h-7 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs flex items-center justify-center"
              title="向右旋转90°"
            >
              ↻
            </button>
            {/* 左旋（右旋3次） */}
            <button
              onClick={() => {
                rotatePiece(selectedPlacedPieceId);
                rotatePiece(selectedPlacedPieceId);
                rotatePiece(selectedPlacedPieceId);
              }}
              className="w-7 h-7 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs flex items-center justify-center"
              title="向左旋转90°"
            >
              ↺
            </button>
            {/* 水平翻转 */}
            <button
              onClick={() => flipPieceHorizontally(selectedPlacedPieceId)}
              className="w-7 h-7 bg-green-500 hover:bg-green-600 text-white rounded text-xs flex items-center justify-center"
              title="水平翻转"
            >
              ⟷
            </button>
            {/* 垂直翻转 */}
            <button
              onClick={() => flipPieceVertically(selectedPlacedPieceId)}
              className="w-7 h-7 bg-green-500 hover:bg-green-600 text-white rounded text-xs flex items-center justify-center"
              title="垂直翻转"
            >
              ↕
            </button>

            {/* 测试通知按钮 */}
            <button
              onClick={() => addNotification('测试通知功能', 'warning')}
              className="w-7 h-7 bg-gray-500 hover:bg-gray-600 text-white rounded text-xs flex items-center justify-center"
              title="测试通知"
            >
              🔔
            </button>
            {/* 关闭 */}
            <button
              onClick={() => { setSelectedPlacedPieceId(null); setToolbarPos(null); }}
              className="w-7 h-7 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded text-xs flex items-center justify-center"
              title="关闭"
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
