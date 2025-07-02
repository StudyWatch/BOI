// src/types/shift.ts

// --- סיווג בחירות עבור משמרת --- 
export type ShiftChoice = 'x' | '-' | '#' | '!' | '';

export interface ShiftPreference {
  choice: ShiftChoice;
  note?: string;
}

export interface DayPreferences {
  morning: { choice: ShiftChoice };
  morning2: { choice: ShiftChoice };
  afternoon: { choice: ShiftChoice };
  night: { choice: ShiftChoice };
  yavne1: { choice: ShiftChoice };
  yavne2: { choice: ShiftChoice };
  patrolAfternoon: { choice: ShiftChoice };
  visitorsCenter: { choice: ShiftChoice };
  dayNote?: string;
  isMilitary?: boolean;
}

// --- הגדרות משתמש --- 
export interface UserPreferences {
  preferredShifts: ShiftType[];
  avoidedShifts: ShiftType[];
  notes: string;
}

// --- טיפוס תפקיד --- 
export type Role = 'ahamash' | 'boker' | 'mavtach' | 'bokrit';

// --- טיפוס משמרת כולל morning2 --- 
export type ShiftType =
  | 'morning'
  | 'morning2'
  | 'afternoon'
  | 'night'
  | 'yavne1'
  | 'yavne2'
  | 'patrolAfternoon'
  | 'visitorsCenter';

// --- טבלת זמנים ותוויות --- 
export const SHIFT_TIMES: Record<ShiftType, { start: string; end: string; label: string }> = {
  morning:         { start: '06:30', end: '15:00', label: 'בוקר (א)' },
  morning2:        { start: '06:30', end: '16:30', label: 'בוקר ארוך (א2)' },
  afternoon:       { start: '14:45', end: '21:45', label: 'צהריים (ב)' },
  night:           { start: '21:45', end: '06:30', label: 'לילה (ג)' },
  yavne1:          { start: '05:45', end: '14:00', label: 'יבנה 1' },
  yavne2:          { start: '13:00', end: '20:30', label: 'יבנה 2' },
  patrolAfternoon: { start: '14:00', end: '21:45', label: 'סיור' },
  visitorsCenter:  { start: '08:30', end: '16:30', label: 'מרכז מבקרים' },
};

// --- טיפוס עובד --- 
export interface Employee {
  id: string;
  name: string;
  code: string;
  role: Role;
  funnyTitle?: string;
  preferences: Record<string, DayPreferences>;
  userPreferences?: UserPreferences;
  assignedShifts?: Record<string, AssignedShift[]>;
}

// --- שיבוץ בפועל --- 
export interface AssignedShift {
  employeeId: string;
  date: string;
  shift: ShiftType;
  role: Role;
  assignedBy: 'auto' | 'manual' | 'swap' | 'intelligent_auto';
  assignedAt: string;
}

// --- מבנה סידור שנוצר --- 
export interface GeneratedSchedule {
  date: string;
  morning: Employee[];
  morning2: Employee[];
  afternoon: Employee[];
  night: Employee[];
  yavne1: Employee[];
  yavne2: Employee[];
  patrolAfternoon: Employee[];
  visitorsCenter: Employee[];
  issues: string[];
}

// --- טיפוסי דרישות ומגבלות --- 
export interface ShiftRequirement {
  // לכל קטגוריית חלק יום - מערך אופציות (או/או) של טווחי תפקידים
  morning: RolesMap[];
  morning2: RolesMap[];
  afternoon: RolesMap[];
  night: RolesMap[];
  yavne1: RolesMap[];
  yavne2: RolesMap[];
  patrolAfternoon: RolesMap[];
  visitorsCenter: RolesMap[];
}

export type RolesMap = Record<Role, number>;

// הנתונים שמגיעים מה‐DB עבור weekly_constraints
export interface WeeklyRules {
  max_x: number;
  max_minus: number;
  min_open_mornings: number;
  max_x_with_1_exam: number;
  max_x_with_2_exams: number;
  min_open_mornings_with_1_exam: number;
  min_open_mornings_with_2_exams: number;
}

// --- סוגי הפרות חוקי עבודה --- 
export type WorkRuleViolationType =
  | 'consecutive_days'
  | 'night_shifts'
  | 'difficult_transition'
  | 'double_shift'
  | 'short_rest'
  | 'weekly_x_limit'
  | 'weekly_minus_limit'
  | 'weekly_morning_block'
  | 'prohibited_transition'
  | 'weekly_morning_miss'
  | 'weekly_open_mornings';

// יחסי חומרת ההפרות
export type ViolationSeverity = 'error' | 'warning';

export interface WorkRuleViolation {
  type: WorkRuleViolationType;
  severity: ViolationSeverity;
  message: string;
  employeeId: string;
  dates: string[];
}

// --- בקשות להחלפת משמרת --- 
export interface ShiftSwapRequest {
  id: string;
  from_employee_id: string;
  to_employee_id: string;
  from_shift_date: string;
  from_shift_type: ShiftType;
  to_shift_date: string;
  to_shift_type: ShiftType;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  reviewed_at?: string;
  notes?: string;
}

// --- עזרות וכלים --- 
export const ROLE_HIERARCHY: Record<Role, Role[]> = {
  ahamash: ['ahamash', 'boker', 'mavtach', 'bokrit'],
  boker:   ['boker', 'mavtach', 'bokrit'],
  mavtach: ['mavtach'],
  bokrit:  ['bokrit'],
};

export const ROLE_COLORS: Record<Role, string> = {
  ahamash: 'bg-green-500',
  boker:   'bg-blue-500',
  mavtach: 'bg-orange-500',
  bokrit:  'bg-purple-500',
};

/** בודק אם התאריך נופל ביום ו' או ש' */
export const isFridayOrSaturday = (date: string): boolean => {
  const d = new Date(date).getDay();
  return d === 5 || d === 6;
};

/** עזר להבאת דרישות ברירת מחדל אם אין DB */
export const getShiftRequirements = (date: string): ShiftRequirement => {
  const isFriSat = isFridayOrSaturday(date);
  const base: ShiftRequirement = {
    morning:         [{ ahamash:1, boker:1, mavtach:1, bokrit:0 }],
    morning2:        [{ ahamash:1, boker:0, mavtach:0, bokrit:0 }],
    afternoon:       [{ ahamash:1, boker:0, mavtach:1, bokrit:0 }],
    night:           [{ ahamash:0, boker:1, mavtach:1, bokrit:0 }],
    yavne1:          [{ ahamash:0, boker:0, mavtach:1, bokrit:0 }],
    yavne2:          [{ ahamash:0, boker:0, mavtach:1, bokrit:0 }],
    patrolAfternoon: [{ ahamash:0, boker:0, mavtach:1, bokrit:0 }],
    visitorsCenter:  [{ ahamash:1, boker:0, mavtach:0, bokrit:0 }],
  };

  if (isFriSat) {
    // ביום שישי/שבת מצמצמים את הלהקות
    base.morning = [{ ahamash:1, boker:0, mavtach:0, bokrit:0 }];
    base.afternoon = [{ ahamash:1, boker:0, mavtach:0, bokrit:0 }];
    base.night = [{ ahamash:0, boker:1, mavtach:1, bokrit:0 }];
    base.patrolAfternoon = [{ ahamash:0, boker:0, mavtach:1, bokrit:0 }];
    base.yavne1 = [{ ahamash:0, boker:0, mavtach:1, bokrit:0 }];
    base.yavne2 = [{ ahamash:0, boker:0, mavtach:1, bokrit:0 }];
  }

  return base;
};
export const SHIFT_COLORS: Record<ShiftType, string> = {
  morning: 'bg-yellow-200',
  morning2: 'bg-yellow-300',
  afternoon: 'bg-orange-200',
  night: 'bg-blue-200',
  yavne1: 'bg-purple-200',
  yavne2: 'bg-purple-300',
  patrolAfternoon: 'bg-red-200',
  visitorsCenter: 'bg-green-200',
};
