import {
  Employee,
  ShiftChoice,
  DayPreferences,
  AssignedShift,
  Role,
  ShiftType
} from '../types/shift';
import { SHIFT_TIMES } from '../types/shift';

/** כל המשמרות שיכולות להחשבן ב'ספירה אמיתית' של משמרת בוקר */
export const MORNING_SHIFTS = new Set<ShiftType>([
  'morning',
  'morning2',
  'yavne1',
  'visitorsCenter'
]);

/** האם משמרת היא משמרת בוקר (לספירה) */
export function isMorningShift(shift: ShiftType): boolean {
  return MORNING_SHIFTS.has(shift);
}

/** סופר כמה בקרים בפועל שובצו לעובד בטווח תאריכים */
export function countMorningShiftsForEmployee(
  scheduleMap: Record<string, AssignedShift[]>,
  employeeId: string,
  datesWindow: string[]
): number {
  let count = 0;
  for (const date of datesWindow) {
    const assigned = scheduleMap[date] || [];
    if (
      assigned.some(
        s => s.employeeId === employeeId && isMorningShift(s.shift)
      )
    ) {
      count++;
    }
  }
  return count;
}

/**
 * בוחר עובד למשמרת סיור (patrolAfternoon) בשישי/שבת
 * רק מתוך אלה עם role==='boker', ובהיררכיית העדפה: ahamash > mavtach > boker
 */
export function pickTourPerson(bTeam: Employee[]): Employee | null {
  // רק בוקרים
  const eligible = bTeam.filter(e => e.role === 'boker');
  if (eligible.length === 0) return null;
  const order: Role[] = ['ahamash', 'mavtach', 'boker'];
  eligible.sort((a, b) => order.indexOf(a.role) - order.indexOf(b.role));
  return eligible[0];
}

/** כל המשמרות שיכולות להופיע בהעדפות כלליות */
export const PREFERENCE_SHIFT_LIST = [
  'morning',
  'afternoon',
  'night',
  'yavne1',
  'yavne2',
  'patrolAfternoon',
  'visitorsCenter'
] as const;
export type PreferenceShift = typeof PREFERENCE_SHIFT_LIST[number];
export function isPreferenceShift(shift: ShiftType): shift is PreferenceShift {
  return PREFERENCE_SHIFT_LIST.includes(shift as PreferenceShift);
}

/**
 * האם עובד יכול למלא requiredRole במשמרת shiftType?
 * לפי היררכיית תפקידים + סינון bokrit מאזורים רגישים
 */
export function canEmployeeFillRole(
  employeeRole: Role,
  requiredRole: Role,
  shiftType?: ShiftType
): boolean {
  const hierarchy: Record<Role, Role[]> = {
    ahamash: ['ahamash', 'boker', 'mavtach', 'bokrit'],
    boker:   ['boker', 'mavtach', 'bokrit'],
    mavtach: ['mavtach'],
    bokrit:  ['bokrit']
  };
  if (!hierarchy[employeeRole].includes(requiredRole)) return false;

  // באזורים רגישים (yavne1, yavne2, visitorsCenter, patrolAfternoon) – רק mavtach
  const sensitive: ShiftType[] = [
    'yavne1', 'yavne2', 'visitorsCenter', 'patrolAfternoon'
  ];
  if (sensitive.includes(shiftType as ShiftType)) {
    return employeeRole === 'mavtach';
  }

  return true;
}

/**
 * מי פנוי לשיבוץ במשמרת מסוימת בתאריך:
 * – לא במילואים
 * – לא חסום (choice = 'x')
 */
export function getAvailableEmployeesForShift(
  employees: Employee[],
  date: string,
  shift: ShiftType
): Employee[] {
  return employees.filter(emp => {
    const dp = emp.preferences?.[date];
    if (dp?.isMilitary) return false;

    const part: 'morning'|'afternoon'|'night' =
      shift === 'night'
        ? 'night'
        : MORNING_SHIFTS.has(shift)
          ? 'morning'
          : 'afternoon';

    if (dp?.[part]?.choice === 'x') return false;
    return true;
  });
}

/**
 * בדיקת קונפליקט בין שתי משמרות:
 * – באותו יום: לא אותה משמרת, ולא בוקר+לא בוקר
 * – בין לילה לבוקר למחרת
 */
export function isShiftConflict(
  shift1: ShiftType,
  shift2: ShiftType,
  date1: string,
  date2: string
): boolean {
  const d1 = new Date(date1), d2 = new Date(date2);
  const diffDays = Math.round((d2.getTime() - d1.getTime()) / 86400000);

  if (diffDays === 0) {
    if (shift1 === shift2) return true;
    return MORNING_SHIFTS.has(shift1) === MORNING_SHIFTS.has(shift2);
  }
  if (diffDays === 1) {
    return shift1 === 'night' && MORNING_SHIFTS.has(shift2);
  }
  if (diffDays === -1) {
    return shift2 === 'night' && MORNING_SHIFTS.has(shift1);
  }
  return false;
}

/** משך משמרת בשעות */
export function calculateShiftDuration(shift: ShiftType): number {
  const map: Record<ShiftType, number> = {
    morning: 8.5,
    morning2: 10,
    afternoon: 7,
    night: 8.75,
    yavne1: 8.25,
    yavne2: 7.5,
    patrolAfternoon: 7.75,
    visitorsCenter: 8
  };
  return map[shift] ?? 0;
}

/** שעת התחלה של משמרת בתאריך */
export function getShiftStartTime(shift: ShiftType, date: string): Date {
  const times: Record<ShiftType, string> = {
    morning: '06:30',
    morning2: '06:30',
    afternoon: '14:45',
    night: '21:45',
    yavne1: '05:45',
    yavne2: '13:00',
    patrolAfternoon: '14:00',
    visitorsCenter: '08:30'
  };
  const [h, m] = times[shift].split(':').map(Number);
  const d = new Date(date);
  d.setHours(h, m, 0, 0);
  return d;
}

/** שעת סיום של משמרת בתאריך */
export function getShiftEndTime(shift: ShiftType, date: string): Date {
  const times: Record<ShiftType, string> = {
    morning: '15:00',
    morning2: '16:30',
    afternoon: '21:45',
    night: '06:30',
    yavne1: '14:00',
    yavne2: '20:30',
    patrolAfternoon: '21:45',
    visitorsCenter: '16:30'
  };
  const [h, m] = times[shift].split(':').map(Number);
  const d = new Date(date);
  if (shift === 'night') d.setDate(d.getDate() + 1);
  d.setHours(h, m, 0, 0);
  return d;
}

/** תחילת שבוע (יום ראשון) */
export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0,0,0,0);
  return d;
}

/** תאריכים בשבוע */
export function getWeekDates(weekStart: Date): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d.toISOString().slice(0,10);
  });
}

/** ברירת מחדל להעדפות יום ריקות */
export function createEmptyDayPreferences(): DayPreferences {
  return {
    morning: { choice: '' },
    morning2: { choice: '' },
    afternoon: { choice: '' },
    night: { choice: '' },
    yavne1: { choice: '' },
    yavne2: { choice: '' },
    patrolAfternoon: { choice: '' },
    visitorsCenter: { choice: '' },
    dayNote: '',
    isMilitary: false
  };
}

/**
 * בדיקת מגבלות שבועיות:
 * – עד 5 איקסים + 2 לכל 'מבחן'
 * – עד 2 מינוסים
 */
export function validateWeeklyConstraints(
  weekDates: string[],
  prefs: Record<string, DayPreferences>
): {
  isValid: boolean;
  counts: { x: number; minus: number; exams: number };
  limits: { maxX: number; maxMinus: number; examCount: number };
} {
  let x = 0, minus = 0, exams = 0;
  for (const d of weekDates) {
    const p = prefs[d];
    if (!p) continue;
    if (p.dayNote?.toLowerCase().includes('מבחן')) exams++;
    for (const v of Object.values(p)) {
      if (typeof v === 'object' && 'choice' in v) {
        if (v.choice === 'x') x++;
        if (v.choice === '-') minus++;
      }
    }
  }
  const maxX = 5 + exams * 2;
  const maxMinus = 2;
  return {
    isValid: x <= maxX && minus <= maxMinus,
    counts: { x, minus, exams },
    limits: { maxX, maxMinus, examCount: exams }
  };
}

/** סימון או הסרת סימון מילואים ליום מסוים */
export function setMilitaryService(
  preferences: Record<string, DayPreferences>,
  dateKey: string
): Record<string, DayPreferences> {
  const next = { ...preferences };
  if (!next[dateKey]) {
    next[dateKey] = createEmptyDayPreferences();
  }
  next[dateKey].isMilitary = !next[dateKey].isMilitary;
  return next;
}

/** סימון מילואים לכל החודש */
export function setMilitaryServiceForMonth(
  preferences: Record<string, DayPreferences>,
  month: Date
): Record<string, DayPreferences> {
  const next = { ...preferences };
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const key = new Date(month.getFullYear(), month.getMonth(), d).toISOString().slice(0, 10);
    if (!next[key]) {
      next[key] = createEmptyDayPreferences();
    }
    next[key].isMilitary = true;
  }
  return next;
}
