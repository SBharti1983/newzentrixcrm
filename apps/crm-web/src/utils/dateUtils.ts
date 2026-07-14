/**
 * dateUtils.ts - Robust date handling for ZentrixCRM
 * Prevents browser-specific glitches and provides safe arithmetic.
 */

export const getNow = () => new Date();

export const parseSafe = (date: any): Date | null => {
  if (!date) return null;
  const d = new Date(date);
  return isNaN(d.getTime()) ? null : d;
};

export const isOverdue = (date: any): boolean => {
  const d = parseSafe(date);
  if (!d) return false;
  return d.getTime() < getNow().getTime();
};

export const getDiffInHours = (date1: any, date2: any = getNow()): number => {
  const d1 = parseSafe(date1);
  const d2 = parseSafe(date2);
  if (!d1 || !d2) return 0;
  return Math.abs(d2.getTime() - d1.getTime()) / 3600000;
};

export const getDiffInDays = (date1: any, date2: any = getNow()): number => {
  return getDiffInHours(date1, date2) / 24;
};

export const isSameDay = (date1: any, date2: any = getNow()): boolean => {
  const d1 = parseSafe(date1);
  const d2 = parseSafe(date2);
  if (!d1 || !d2) return false;
  return d1.toDateString() === d2.toDateString();
};

export const formatSafeTime = (date: any): string => {
  const d = parseSafe(date);
  if (!d) return '--:--';
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
};

export const formatSafeDateISO = (date: any): string => {
  const d = parseSafe(date);
  if (!d) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
export const formatSafeDate = (date: any): string => {
  const d = parseSafe(date);
  if (!d) return '--';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const formatSafeDateTime = (date: any): string => {
  const d = parseSafe(date);
  if (!d) return '--';
  return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

export const formatCustom = (date: any, options: Intl.DateTimeFormatOptions, fallback = '--'): string => {
  const d = parseSafe(date);
  if (!d) return fallback;
  return d.toLocaleString('en-IN', options);
};
