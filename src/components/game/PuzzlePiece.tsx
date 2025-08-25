import React, { useRef } from 'react';
import type { PuzzlePieceState } from '../../types';
import { getPuzzlePieceShape, getPieceShapeWithTransform } from '../../data/puzzlePieces';
import { useGameStore } from '../../stores/gameStore';

interface PuzzlePieceProps {
  piece: PuzzlePieceState;
  onSelect?: (pieceId: string) => void;
  onRotate?: (pieceId: string) => void;
  className?: string;
  // 存放区域信息
  storageArea?: 'left' | 'right';
  storageIndex?: number;
}

export const PuzzlePiece: React.FC<PuzzlePieceProps> = ({
  piece,
  onSelect,
  onRotate,
  className,
  storageArea,
  storageIndex
}) => {
  const pieceRef = useRef<HTMLDivElement>(null);
  const { startDrag, rotatePiece, flipPieceHorizontally, flipPieceVertically } = useGameStore();
  
  const pieceShape = getPuzzlePieceShape(piece.shapeId);
  const rotatedShape = getPieceShapeWithTransform(
    piece.shapeId,
    piece.rotation,
    piece.isFlippedHorizontally || false,
    piece.isFlippedVertically || false
  );
  
  if (!pieceShape || !rotatedShape) return null;

  const cellSize = 20;
  
  const handleClick = () => onSelect?.(piece.id);
  const handleDoubleClick = () => onRotate?.(piece.id);
  
  const handleMouseDown = (event: React.MouseEvent) => {
    if (!piece.isPlaced) {
      const rect = pieceRef.current?.getBoundingClientRect();
      if (rect) {
        const offset = {
          x: event.clientX - rect.left,
          y: event.clientY - rect.top
        };

        // 设置拖拽光标
        document.body.style.cursor = 'grabbing';

        startDrag(piece.id, offset, storageArea, storageIndex);
      }
    }
  };

  return (
    <div
      ref={pieceRef}
      className={`
        inline-block p-2 m-1 rounded-lg border-2 cursor-pointer transition-all duration-200
        ${piece.isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white'}
        ${piece.isDragging ? 'opacity-60 shadow-xl z-50' : 'hover:shadow-md'}
        ${piece.isPlaced ? 'opacity-50' : ''}
        ${className || ''}
      `}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onMouseDown={handleMouseDown}
      style={{
        transform: piece.isDragging ? 'scale(1.1)' : 'scale(1)',
        userSelect: 'none'
      }}
    >
      <div className="relative">
        <div className="grid gap-px" style={{ 
          gridTemplateColumns: `repeat(${rotatedShape[0].length}, ${cellSize}px)`,
          gridTemplateRows: `repeat(${rotatedShape.length}, ${cellSize}px)`
        }}>
          {rotatedShape.map((row, rowIndex) =>
            row.map((cell, colIndex) => (
              <div
                key={`${rowIndex}-${colIndex}`}
                className={`w-5 h-5 rounded-sm ${cell ? 'border border-gray-400' : 'bg-transparent'}`}
                style={{ backgroundColor: cell ? pieceShape.color : 'transparent' }}
              />
            ))
          )}
        </div>
        
        <div className="text-xs text-center mt-1 text-gray-600">
          {pieceShape.name}
        </div>
        
        {piece.isPlaced && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full"></div>
        )}
        
        {piece.isSelected && (
          <div className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 rounded-full"></div>
        )}

        {/* 选中状态下的悬浮操作按钮 */}
        {piece.isSelected && !piece.isPlaced && (
          <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 flex gap-1 bg-white rounded-lg shadow-lg border p-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                rotatePiece(piece.id);
              }}
              className="w-6 h-6 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs flex items-center justify-center"
              title="向右旋转90°"
            >
              ↻
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                // 向左旋转相当于向右旋转3次
                rotatePiece(piece.id);
                rotatePiece(piece.id);
                rotatePiece(piece.id);
              }}
              className="w-6 h-6 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs flex items-center justify-center"
              title="向左旋转90°"
            >
              ↺
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                flipPieceHorizontally(piece.id);
              }}
              className="w-6 h-6 bg-green-500 hover:bg-green-600 text-white rounded text-xs flex items-center justify-center"
              title="水平翻转"
            >
              ⟷
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                flipPieceVertically(piece.id);
              }}
              className="w-6 h-6 bg-green-500 hover:bg-green-600 text-white rounded text-xs flex items-center justify-center"
              title="垂直翻转"
            >
              ↕
            </button>
          </div>
        )}
      </div>
    </div>
  );
};