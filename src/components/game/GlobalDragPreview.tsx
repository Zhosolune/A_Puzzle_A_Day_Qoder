import React, { useEffect, useRef } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { getPieceShapeWithTransform, getPuzzlePieceShape } from '../../data/puzzlePieces';

interface GlobalDragPreviewProps {
  cellSize?: number;
  gap?: number;
}

export const GlobalDragPreview: React.FC<GlobalDragPreviewProps> = ({
  cellSize = 80,
  gap = 4
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { dragState, checkDropZone } = useGameStore();

  // 绘制拖拽预览
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !dragState.isDragging || !dragState.draggedPiece || !dragState.globalMousePosition) {
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 获取拼图块形状和颜色
    const pieceShape = getPuzzlePieceShape(dragState.draggedPiece.shapeId);
    const rotatedShape = getPieceShapeWithTransform(
      dragState.draggedPiece.shapeId,
      dragState.draggedPiece.rotation,
      dragState.draggedPiece.isFlippedHorizontally || false,
      dragState.draggedPiece.isFlippedVertically || false
    );

    if (!pieceShape || !rotatedShape) return;

    // 计算绘制起始位置（考虑拖拽偏移）
    const startX = dragState.globalMousePosition.x - dragState.dragOffset.x;
    const startY = dragState.globalMousePosition.y - dragState.dragOffset.y;

    // 设置透明度
    ctx.globalAlpha = 0.8;

    // 绘制拼图块
    for (let r = 0; r < rotatedShape.length; r++) {
      for (let c = 0; c < rotatedShape[r].length; c++) {
        if (rotatedShape[r][c]) {
          const x = startX + c * (cellSize + gap);
          const y = startY + r * (cellSize + gap);

          // 根据拖拽区域和状态显示不同颜色
          if (dragState.globalMousePosition) {
            const dropZone = checkDropZone(dragState.globalMousePosition);

            if (dropZone === 'gameboard') {
              // 在GameBoard区域
              if (dragState.isValidPosition) {
                ctx.fillStyle = '#10b981'; // 绿色 - 有效位置
                ctx.strokeStyle = '#059669';
              } else {
                ctx.fillStyle = '#f87171'; // 红色 - 无效位置
                ctx.strokeStyle = '#dc2626';
              }
            } else if (dropZone === 'left-storage' || dropZone === 'right-storage') {
              // 在存放区域
              const isCorrectStorage = (
                (dropZone === 'left-storage' && dragState.originalStorageArea === 'left') ||
                (dropZone === 'right-storage' && dragState.originalStorageArea === 'right') ||
                !dragState.originalStorageArea // 从面板拖拽的可以放到任意存放区域
              );

              if (isCorrectStorage) {
                ctx.fillStyle = '#3b82f6'; // 蓝色 - 可以放置到存放区域
                ctx.strokeStyle = '#1d4ed8';
              } else {
                ctx.fillStyle = '#f87171'; // 红色 - 错误的存放区域
                ctx.strokeStyle = '#dc2626';
              }
            } else {
              // 不在任何有效区域
              ctx.fillStyle = '#6b7280'; // 灰色 - 无效区域
              ctx.strokeStyle = '#374151';
            }
          } else {
            // 没有全局位置信息，使用原始颜色
            ctx.fillStyle = pieceShape.color;
            ctx.strokeStyle = '#333';
          }

          ctx.fillRect(x, y, cellSize, cellSize);
          ctx.lineWidth = 2;
          ctx.strokeRect(x, y, cellSize, cellSize);
        }
      }
    }

    ctx.globalAlpha = 1.0;
  }, [dragState, cellSize, gap]);

  // 如果没有拖拽，不渲染
  if (!dragState.isDragging || !dragState.globalMousePosition) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 9999
      }}
    >
      <canvas
        ref={canvasRef}
        width={window.innerWidth}
        height={window.innerHeight}
        style={{
          width: '100%',
          height: '100%'
        }}
      />
    </div>
  );
};
