import React, { useRef } from 'react';
import type { PuzzlePieceState } from '../../types';
import { getPuzzlePieceShape, getPieceShapeWithRotation } from '../../data/puzzlePieces';
import { useGameStore } from '../../stores/gameStore';

interface PuzzlePieceProps {
  piece: PuzzlePieceState;
  onSelect?: (pieceId: string) => void;
  onRotate?: (pieceId: string) => void;
  className?: string;
}

export const PuzzlePiece: React.FC<PuzzlePieceProps> = ({
  piece,
  onSelect,
  onRotate,
  className
}) => {
  const pieceRef = useRef<HTMLDivElement>(null);
  const { startDrag } = useGameStore();
  
  const pieceShape = getPuzzlePieceShape(piece.shapeId);
  const rotatedShape = getPieceShapeWithRotation(piece.shapeId, piece.rotation);
  
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
        startDrag(piece.id, offset);
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
      </div>
    </div>
  );
};