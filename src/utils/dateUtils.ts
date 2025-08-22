import type { DateTarget } from '../types';
import { getMonthPosition, getDayPosition, getWeekdayPosition } from '../data/gridLayout';

/**
 * 日期处理工具函数
 * 用于处理游戏中的日期相关功能
 */

// 获取当前日期
export function getCurrentDate(): Date {
  return new Date();
}

// 格式化日期为字符串 (YYYY-MM-DD)
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 从字符串解析日期
export function parseDate(dateString: string): Date {
  return new Date(dateString);
}

// 获取日期的月份 (1-12)
export function getMonth(date: Date): number {
  return date.getMonth() + 1;
}

// 获取日期的日 (1-31)
export function getDay(date: Date): number {
  return date.getDate();
}

// 获取日期的星期几 (1-7, 周一到周日)
export function getWeekday(date: Date): number {
  const weekday = date.getDay();
  return weekday === 0 ? 7 : weekday; // 将周日(0)转换为7
}

// 获取星期几的中文名称
export function getWeekdayName(weekday: number): string {
  const names = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  return names[weekday] || '';
}

// 获取月份的中文名称
export function getMonthName(month: number): string {
  return `${month}月`;
}

// 根据日期生成目标空格位置
export function generateDateTarget(date: Date): DateTarget {
  const month = getMonth(date);
  const day = getDay(date);
  const weekday = getWeekday(date);
  
  const monthPosition = getMonthPosition(month);
  const dayPosition = getDayPosition(day);
  const weekdayPosition = getWeekdayPosition(weekday);
  
  if (!monthPosition || !dayPosition || !weekdayPosition) {
    throw new Error(`无效的日期: ${formatDate(date)}`);
  }
  
  return {
    date,
    targetPositions: {
      month: monthPosition,
      day: dayPosition,
      weekday: weekdayPosition
    }
  };
}

// 检查日期是否有效
export function isValidDate(date: Date): boolean {
  return date instanceof Date && !isNaN(date.getTime());
}

// 检查是否为今天
export function isToday(date: Date): boolean {
  const today = getCurrentDate();
  return formatDate(date) === formatDate(today);
}

// 检查是否为本月
export function isCurrentMonth(date: Date): boolean {
  const today = getCurrentDate();
  return date.getFullYear() === today.getFullYear() && 
         date.getMonth() === today.getMonth();
}

// 检查是否为本年
export function isCurrentYear(date: Date): boolean {
  const today = getCurrentDate();
  return date.getFullYear() === today.getFullYear();
}

// 获取日期范围内的所有日期
export function getDateRange(startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = [];
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return dates;
}

// 获取本月的所有日期
export function getCurrentMonthDates(): Date[] {
  const today = getCurrentDate();
  const year = today.getFullYear();
  const month = today.getMonth();
  
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  
  return getDateRange(firstDay, lastDay);
}

// 获取本年的所有日期
export function getCurrentYearDates(): Date[] {
  const today = getCurrentDate();
  const year = today.getFullYear();
  
  const firstDay = new Date(year, 0, 1);
  const lastDay = new Date(year, 11, 31);
  
  return getDateRange(firstDay, lastDay);
}

// 计算两个日期之间的天数差
export function getDaysDifference(date1: Date, date2: Date): number {
  const timeDiff = Math.abs(date2.getTime() - date1.getTime());
  return Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
}

// 添加天数到日期
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// 减去天数从日期
export function subtractDays(date: Date, days: number): Date {
  return addDays(date, -days);
}

// 获取昨天的日期
export function getYesterday(): Date {
  return subtractDays(getCurrentDate(), 1);
}

// 获取明天的日期
export function getTomorrow(): Date {
  return addDays(getCurrentDate(), 1);
}

// 获取本周的开始日期（周一）
export function getWeekStart(date: Date = getCurrentDate()): Date {
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day; // 调整为周一开始
  return addDays(date, diff);
}

// 获取本周的结束日期（周日）
export function getWeekEnd(date: Date = getCurrentDate()): Date {
  const weekStart = getWeekStart(date);
  return addDays(weekStart, 6);
}

// 获取本周的所有日期
export function getCurrentWeekDates(): Date[] {
  const weekStart = getWeekStart();
  const weekEnd = getWeekEnd();
  return getDateRange(weekStart, weekEnd);
}

// 获取月份的天数
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

// 检查是否为闰年
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

// 获取随机日期
export function getRandomDate(startDate: Date, endDate: Date): Date {
  const startTime = startDate.getTime();
  const endTime = endDate.getTime();
  const randomTime = startTime + Math.random() * (endTime - startTime);
  return new Date(randomTime);
}

// 获取随机的未来日期（用于测试）
export function getRandomFutureDate(maxDays: number = 365): Date {
  const today = getCurrentDate();
  const randomDays = Math.floor(Math.random() * maxDays) + 1;
  return addDays(today, randomDays);
}

// 验证目标位置是否正确
export function validateDateTarget(date: Date, target: DateTarget): boolean {
  const expectedTarget = generateDateTarget(date);
  
  return (
    target.targetPositions.month.row === expectedTarget.targetPositions.month.row &&
    target.targetPositions.month.col === expectedTarget.targetPositions.month.col &&
    target.targetPositions.day.row === expectedTarget.targetPositions.day.row &&
    target.targetPositions.day.col === expectedTarget.targetPositions.day.col &&
    target.targetPositions.weekday.row === expectedTarget.targetPositions.weekday.row &&
    target.targetPositions.weekday.col === expectedTarget.targetPositions.weekday.col
  );
}

// 获取日期的友好显示文本
export function getDateDisplayText(date: Date): string {
  const month = getMonth(date);
  const day = getDay(date);
  const weekday = getWeekday(date);
  const weekdayName = getWeekdayName(weekday);
  
  return `${month}月${day}日 ${weekdayName}`;
}

// 获取相对日期文本 (今天、昨天、明天等)
export function getRelativeDateText(date: Date): string {
  const today = getCurrentDate();
  const daysDiff = getDaysDifference(date, today);
  
  if (daysDiff === 0) {
    return '今天';
  } else if (daysDiff === 1 && date < today) {
    return '昨天';
  } else if (daysDiff === 1 && date > today) {
    return '明天';
  } else if (daysDiff <= 7 && date < today) {
    return `${daysDiff}天前`;
  } else if (daysDiff <= 7 && date > today) {
    return `${daysDiff}天后`;
  } else {
    return getDateDisplayText(date);
  }
}

// 日期缓存，避免重复计算
const dateTargetCache = new Map<string, DateTarget>();

// 获取缓存的日期目标
export function getCachedDateTarget(date: Date): DateTarget {
  const dateKey = formatDate(date);
  
  if (!dateTargetCache.has(dateKey)) {
    const target = generateDateTarget(date);
    dateTargetCache.set(dateKey, target);
  }
  
  return dateTargetCache.get(dateKey)!;
}

// 清除日期目标缓存
export function clearDateTargetCache(): void {
  dateTargetCache.clear();
}

// 预加载常用日期的目标位置
export function preloadDateTargets(dates: Date[]): void {
  dates.forEach(date => {
    getCachedDateTarget(date);
  });
}