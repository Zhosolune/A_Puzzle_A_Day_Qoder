import React, { useEffect } from 'react';
import { useGameStore } from './stores/gameStore';
import { GameBoard } from './components/game/GameBoard';
import { PuzzlePiece } from './components/game/PuzzlePiece';
import { Button } from './components/ui/Button';
import { getDateDisplayText } from './utils/dateUtils';
import './App.css';

function App() {
  const {
    status,
    currentDate,
    availablePieces,
    currentStats,
    initializeGame,
    startNewGame,
    resetGame,
    selectPiece,
    rotatePiece
  } = useGameStore();

  // 初始化游戏
  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

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

        <div className="flex flex-col items-center">
          {/* 游戏面板 - 作为主要元素 */}
          <div className="mb-8">
            <GameBoard className="mx-auto" />
          </div>

          {/* 拼图块面板 - 移至底部 */}
          <div className="w-full max-w-4xl">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 text-center">
              拼图块
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* 未放置的拼图块 */}
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <h3 className="text-sm font-medium text-gray-600 mb-3">可用拼图块</h3>
                <div className="flex flex-wrap justify-center">
                  {availablePieces
                    .filter(piece => !piece.isPlaced)
                    .map(piece => (
                      <PuzzlePiece
                        key={piece.id}
                        piece={piece}
                        onSelect={handlePieceSelect}
                        onRotate={handlePieceRotate}
                      />
                    ))
                  }
                </div>
              </div>

              {/* 已放置的拼图块 */}
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <h3 className="text-sm font-medium text-gray-600 mb-3">已放置拼图块</h3>
                <div className="flex flex-wrap justify-center">
                  {availablePieces
                    .filter(piece => piece.isPlaced)
                    .map(piece => (
                      <PuzzlePiece
                        key={piece.id}
                        piece={piece}
                        onSelect={handlePieceSelect}
                        onRotate={handlePieceRotate}
                      />
                    ))
                  }
                </div>
                {availablePieces.filter(piece => piece.isPlaced).length === 0 && (
                  <p className="text-gray-400 text-center py-4">暂无已放置的拼图块</p>
                )}
              </div>
            </div>

            {/* 游戏说明 */}
            <div className="mt-4 p-4 bg-blue-50 rounded-lg max-w-md mx-auto">
              <h3 className="text-sm font-medium text-blue-800 mb-2">游戏说明</h3>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• 点击拼图块选择，双击旋转</li>
                <li>• 使用拼图块填满网格</li>
                <li>• 保持日期格子为空</li>
                <li>• 完成拼图获得胜利</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
