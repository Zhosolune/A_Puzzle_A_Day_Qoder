import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { GRID_CONFIG, GRID_RENDER_CONFIG, isBlockedPosition } from '../../data/gridLayout';
import { CellState } from '../../types';
import type { GridPosition } from '../../types';
import { getPuzzlePieceShape, getPieceShapeWithRotation } from '../../data/puzzlePieces';

interface GameBoardProps {
  className?: string;
}

export const GameBoard: React.FC<GameBoardProps> = ({ className }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredCell, setHoveredCell] = useState<GridPosition | null>(null);
  
  const { 
    gridCells, 
    dateTarget, 
    showGrid,
    selectedPieceId,
    availablePieces,
    placedPieces,
    placePiece,
    validatePlacement
  } = useGameStore();
  
  // 计算canvas尺寸 - 增大格子尺寸
  const CELL_SIZE = 50; // 增大格子尺寸
  const GAP = 3; // 增大间隙
  const LINEWIDTH = 5;
  const canvasWidth = GRID_CONFIG.WIDTH * (CELL_SIZE + GAP) - GAP + 2 * LINEWIDTH;
  const canvasHeight = GRID_CONFIG.HEIGHT * (CELL_SIZE + GAP) - GAP + 2 * LINEWIDTH;
  
  // 绘制沿着有效网格轮廓的边框
  const drawGridOutline = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.save();
    
    // 设置边框样式
    ctx.strokeStyle = '#d97706'; // 琥珀色边框
    ctx.lineWidth = LINEWIDTH;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    
    // 根据网格布局绘制不规则轮廓
    // 从左上角开始，顺时针绘制外轮廓
    
    // 起点：第1行第1列的左上角
    let startX = LINEWIDTH/2;
    let startY = LINEWIDTH/2;
    ctx.moveTo(startX, startY);
    
    // 顶边：第1行，从第1列到第6列（第7列不可用）
    let topRightX = 6 * (CELL_SIZE + GAP) - GAP + LINEWIDTH;
    ctx.lineTo(topRightX, startY);
    
    // 右边第1段：第1-2行第7列边缘（这两行第7列不可用）
    let rightY1 = 2 * (CELL_SIZE + GAP);
    ctx.lineTo(topRightX, rightY1);
    
    // 向右延伸：第3行从第6列到第7列
    let extendRightX = 7 * (CELL_SIZE + GAP) - GAP + LINEWIDTH;
    ctx.lineTo(extendRightX, rightY1);
    
    // 右边第2段：第3-8行第7列边缘
    let rightY2 = 8 * (CELL_SIZE + GAP) - GAP + LINEWIDTH;
    ctx.lineTo(extendRightX, rightY2);
    
    // 底边第1段：第8行从第7列到第4列
    let bottomX1 = 4 * (CELL_SIZE + GAP);
    ctx.lineTo(bottomX1, rightY2);
    
    // 底边第2段：从第8行第4列到第7行第4列
    let bottomY = 7 * (CELL_SIZE + GAP) - GAP + LINEWIDTH;
    ctx.lineTo(bottomX1, bottomY);
    
    // 底边第3段：第7行从第4列到第1列
    ctx.lineTo(startX, bottomY);
    
    // 左边第1段：第7行到第1行
    ctx.lineTo(startX, startY);
    
    // 绘制边框
    ctx.stroke();
    
    ctx.restore();
  }, []);
  
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
    
    const col = Math.floor((x - LINEWIDTH/2) / (CELL_SIZE + GAP));
    const row = Math.floor((y - LINEWIDTH/2) / (CELL_SIZE + GAP));
    
    if (row >= 0 && row < GRID_CONFIG.HEIGHT && col >= 0 && col < GRID_CONFIG.WIDTH) {
      return { row, col };
    }
    
    return null;
  }, []);

  // 处理鼠标点击
  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const position = getGridPositionFromMouseEvent(event);
    if (!position || !selectedPieceId) return;
    
    // 尝试放置选中的拼图块
    placePiece(selectedPieceId, position);
  }, [selectedPieceId, placePiece, getGridPositionFromMouseEvent]);

  // 处理鼠标移动
  const handleCanvasMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const position = getGridPositionFromMouseEvent(event);
    setHoveredCell(position);
  }, [getGridPositionFromMouseEvent]);

  // 处理鼠标离开
  const handleCanvasMouseLeave = useCallback(() => {
    setHoveredCell(null);
  }, []);

  // 绘制单个拼图块
  const drawPuzzlePiece = useCallback((ctx: CanvasRenderingContext2D, pieceId: string, position: GridPosition, rotation: number) => {
    const pieceShape = getPuzzlePieceShape(pieceId);
    const rotatedShape = getPieceShapeWithRotation(pieceId, rotation as 0 | 90 | 180 | 270);
    
    if (!pieceShape || !rotatedShape) return;
    
    for (let r = 0; r < rotatedShape.length; r++) {
      for (let c = 0; c < rotatedShape[r].length; c++) {
        if (rotatedShape[r][c]) {
          const cellRow = position.row + r;
          const cellCol = position.col + c;
          
          if (cellRow >= 0 && cellRow < GRID_CONFIG.HEIGHT && cellCol >= 0 && cellCol < GRID_CONFIG.WIDTH) {
            const x = cellCol * (CELL_SIZE + GAP) + LINEWIDTH/2;
            const y = cellRow * (CELL_SIZE + GAP) + LINEWIDTH/2;
            
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

  // 绘制预览（当有选中的拼图块和悬停位置时）
  const drawPreview = useCallback((ctx: CanvasRenderingContext2D) => {
    if (!selectedPieceId || !hoveredCell) return;
    
    const piece = availablePieces.find(p => p.id === selectedPieceId);
    if (!piece || piece.isPlaced) return;
    
    const isValid = validatePlacement(selectedPieceId, hoveredCell);
    const rotatedShape = getPieceShapeWithRotation(piece.shapeId, piece.rotation);
    
    if (!rotatedShape) return;
    
    // 绘制预览
    ctx.globalAlpha = 0.5;
    
    for (let r = 0; r < rotatedShape.length; r++) {
      for (let c = 0; c < rotatedShape[r].length; c++) {
        if (rotatedShape[r][c]) {
          const cellRow = hoveredCell.row + r;
          const cellCol = hoveredCell.col + c;
          
          if (cellRow >= 0 && cellRow < GRID_CONFIG.HEIGHT && cellCol >= 0 && cellCol < GRID_CONFIG.WIDTH) {
            const x = cellCol * (CELL_SIZE + GAP) + LINEWIDTH/2;
            const y = cellRow * (CELL_SIZE + GAP) + LINEWIDTH/2;
            
            // 根据是否有效显示不同颜色
            ctx.fillStyle = isValid ? '#22d3ee' : '#ef4444';
            ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
            
            ctx.strokeStyle = isValid ? '#0891b2' : '#dc2626';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);
          }
        }
      }
    }
    
    ctx.globalAlpha = 1.0;
  }, [selectedPieceId, hoveredCell, availablePieces, validatePlacement]);

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
        
        const x = col * (CELL_SIZE + GAP) + LINEWIDTH/2;
        const y = row * (CELL_SIZE + GAP) + LINEWIDTH/2;
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
    
    // 绘制已放置的拼图块
    Array.from(placedPieces.values()).forEach((placedPiece) => {
      drawPuzzlePiece(ctx, placedPiece.pieceId, placedPiece.position, placedPiece.rotation);
    });
    
    // 绘制预览
    drawPreview(ctx);
    // 绘制沿着网格轮廓的边框
    drawGridOutline(ctx);
  }, [gridCells, dateTarget, showGrid, placedPieces, drawPuzzlePiece, drawPreview, canvasWidth, canvasHeight, shouldRenderCell, drawGridOutline]);

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
          onClick={handleCanvasClick}
          onMouseMove={handleCanvasMouseMove}
          onMouseLeave={handleCanvasMouseLeave}
        />
      </div>
    </div>
  );
};