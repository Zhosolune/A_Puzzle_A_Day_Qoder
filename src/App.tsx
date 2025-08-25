import { useEffect, useRef } from 'react';
import { useGameStore } from './stores/gameStore';
import { GameBoard } from './components/game/GameBoard';
import { PuzzlePiece } from './components/game/PuzzlePiece';
import { GlobalDragPreview } from './components/game/GlobalDragPreview';
import { Button } from './components/ui/Button';
import { getDateDisplayText } from './utils/dateUtils';
import './App.css';

function App() {
  const leftStorageRef = useRef<HTMLDivElement>(null);
  const rightStorageRef = useRef<HTMLDivElement>(null);

  const {
    status,
    currentDate,
    availablePieces,
    currentStats,
    initializeGame,
    startNewGame,
    resetGame,
    selectPiece,
    rotatePiece,
    setStorageAreaRefs
  } = useGameStore();

  // 初始化游戏
  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  // 设置存放区域引用
  useEffect(() => {
    setStorageAreaRefs(leftStorageRef, rightStorageRef);
  }, [setStorageAreaRefs]);

  const handleStartGame = () => {
    startNewGame();
  };

  const handleResetGame = () => {
    resetGame();
  };

  const handlePieceSelect = (pieceId: string) => {
    selectPiece(pieceId);
  };

  const handlePieceRotate = (pieceId: string) => {
    rotatePiece(pieceId);
  };

  return (
    <div className="min-h-screen bg-game-bg p-4">
      <div className="max-w-6xl mx-auto">
        {/* 游戏标题 */}
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            每日拼图
          </h1>
          <p className="text-lg text-gray-600">
            今日目标：{getDateDisplayText(currentDate)}
          </p>
        </header>

        {/* 游戏统计 */}
        <div className="flex justify-center gap-4 mb-6">
          <div className="bg-white px-4 py-2 rounded-lg shadow-sm">
            <span className="text-sm text-gray-600">移动次数</span>
            <div className="text-xl font-bold text-gray-800">{currentStats.moveCount}</div>
          </div>
          <div className="bg-white px-4 py-2 rounded-lg shadow-sm">
            <span className="text-sm text-gray-600">用时</span>
            <div className="text-xl font-bold text-gray-800">
              {Math.floor(currentStats.elapsedTime / 1000 / 60)}:
              {String(Math.floor((currentStats.elapsedTime / 1000) % 60)).padStart(2, '0')}
            </div>
          </div>
        </div>

        {/* 游戏控制按钮 */}
        <div className="flex justify-center gap-4 mb-8">
          <Button
            onClick={handleStartGame}
            variant="primary"
            size="lg"
          >
            {status === 'menu' ? '开始游戏' : '重新开始'}
          </Button>

          <Button
            onClick={handleResetGame}
            variant="secondary"
            size="lg"
          >
            重置
          </Button>
        </div>
      </div>

      {/* 桌面端宽屏布局：左侧存放区域 + 中央游戏面板 + 右侧存放区域 */}
      <div className="flex justify-center items-start gap-8 max-w-7xl mx-auto">
        {/* 左侧存放区域：拼图块1-5 */}
        <div className="flex-shrink-0 w-80">
          <div ref={leftStorageRef} className="bg-white rounded-lg p-4 shadow-sm">
            <h3 className="text-sm font-medium text-gray-600 mb-3 text-center">存放区域 A</h3>
            <div className="grid grid-cols-1 gap-3">
              {availablePieces
                .slice(0, 5) // 拼图块1-5
                .filter(piece => !piece.isPlaced) // 只显示未放置的拼图块
                .map((piece, index) => (
                  <div key={piece.id} className="flex justify-center">
                    <PuzzlePiece
                      piece={piece}
                      onSelect={handlePieceSelect}
                      onRotate={handlePieceRotate}
                      storageArea="left"
                      storageIndex={index}
                    />
                  </div>
                ))
              }
              {/* 显示空位占位符 */}
              {Array.from({ length: Math.max(0, 5 - availablePieces.slice(0, 5).filter(p => !p.isPlaced).length) }).map((_, index) => (
                <div key={`empty-left-${index}`} className="flex justify-center">
                  <div className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                    <span className="text-gray-400 text-xs">空位</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 中央游戏面板 */}
        <div className="flex-shrink-0">
          <GameBoard />
        </div>

        {/* 右侧存放区域：拼图块6-10 */}
        <div className="flex-shrink-0 w-80">
          <div ref={rightStorageRef} className="bg-white rounded-lg p-4 shadow-sm">
            <h3 className="text-sm font-medium text-gray-600 mb-3 text-center">存放区域 B</h3>
            <div className="grid grid-cols-1 gap-3">
              {availablePieces
                .slice(5, 10) // 拼图块6-10
                .filter(piece => !piece.isPlaced) // 只显示未放置的拼图块
                .map((piece, index) => (
                  <div key={piece.id} className="flex justify-center">
                    <PuzzlePiece
                      piece={piece}
                      onSelect={handlePieceSelect}
                      onRotate={handlePieceRotate}
                      storageArea="right"
                      storageIndex={index}
                    />
                  </div>
                ))
              }
              {/* 显示空位占位符 */}
              {Array.from({ length: Math.max(0, 5 - availablePieces.slice(5, 10).filter(p => !p.isPlaced).length) }).map((_, index) => (
                <div key={`empty-right-${index}`} className="flex justify-center">
                  <div className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                    <span className="text-gray-400 text-xs">空位</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 游戏说明 */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg max-w-md mx-auto">
        <h3 className="text-sm font-medium text-blue-800 mb-2">游戏说明</h3>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>• 拖拽拼图块到游戏面板</li>
          <li>• 使用拼图块填满网格</li>
          <li>• 保持日期格子为空</li>
          <li>• 完成拼图获得胜利</li>
        </ul>
      </div>

      {/* 全局拖拽预览 */}
      <GlobalDragPreview cellSize={80} gap={4} />
    </div>
  );
}

export default App;
