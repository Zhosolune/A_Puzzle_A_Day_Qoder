import React, { useEffect, useState } from 'react';
import { useGameStore } from '../../stores/gameStore';
import type { ToastNotification } from '../../types/store';

interface ToastItemProps {
  notification: ToastNotification;
  index: number;
  onRemove: (id: string) => void;
}

/**
 * Toast通知项组件
 * 提供美观的通知显示，支持不同类型的消息样式
 */
const ToastItem: React.FC<ToastItemProps> = ({ notification, index, onRemove }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  useEffect(() => {
    // 使用slide-up动画效果
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const handleRemove = () => {
    setIsRemoving(true);
    setTimeout(() => onRemove(notification.id), 300);
  };

  /**
   * 根据通知类型获取样式配置
   * 使用项目主题色彩和现代化设计
   */
  const getTypeStyles = () => {
    switch (notification.type) {
      case 'error':
        return {
          bg: 'bg-white',
          border: 'border-red-200',
          accent: 'border-l-red-500',
          text: 'text-gray-800',
          icon: 'text-red-500'
        };
      case 'warning':
        return {
          bg: 'bg-white',
          border: 'border-yellow-200',
          accent: 'border-l-yellow-500',
          text: 'text-gray-800',
          icon: 'text-yellow-500'
        };
      case 'success':
        return {
          bg: 'bg-white',
          border: 'border-green-200',
          accent: 'border-l-green-500',
          text: 'text-gray-800',
          icon: 'text-green-500'
        };
      case 'info':
      default:
        return {
          bg: 'bg-white',
          border: 'border-primary-200',
          accent: 'border-l-primary-500',
          text: 'text-gray-800',
          icon: 'text-primary-500'
        };
    }
  };

  /**
   * 获取通知类型对应的图标
   */
  const getIcon = () => {
    const styles = getTypeStyles();
    switch (notification.type) {
      case 'error':
        return (
          <svg className={`w-5 h-5 ${styles.icon}`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      case 'warning':
        return (
          <svg className={`w-5 h-5 ${styles.icon}`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case 'success':
        return (
          <svg className={`w-5 h-5 ${styles.icon}`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'info':
      default:
        return (
          <svg className={`w-5 h-5 ${styles.icon}`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  const styles = getTypeStyles();

  return (
    <div
      className={`
        fixed right-4 z-50 max-w-sm w-full
        transform transition-all duration-300 ease-out
        ${isVisible && !isRemoving 
          ? 'translate-x-0 opacity-100 animate-slide-up' 
          : 'translate-x-full opacity-0'
        }
        ${styles.bg} ${styles.border} ${styles.accent}
        ${styles.text} rounded-lg shadow-lg border border-l-4 p-4 mb-3
        backdrop-blur-sm
      `}
      style={{
        top: `${16 + index * 80}px`,
      }}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-relaxed break-words">
            {notification.message}
          </p>
        </div>
        <button
          onClick={handleRemove}
          className="flex-shrink-0 ml-2 text-gray-400 hover:text-gray-600 transition-colors duration-200 p-1 rounded-full hover:bg-gray-100"
          aria-label="关闭通知"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

/**
 * Toast通知容器组件
 * 管理所有Toast通知的显示和布局
 */
export const ToastContainer: React.FC = () => {
  const { notifications, removeNotification } = useGameStore();

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-0 right-0 z-50 pointer-events-none">
      <div className="pointer-events-auto">
        {notifications.map((notification, index) => (
          <ToastItem
            key={notification.id}
            notification={notification}
            index={index}
            onRemove={removeNotification}
          />
        ))}
      </div>
    </div>
  );
};

export default ToastContainer;
