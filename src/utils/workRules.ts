import { Employee, AssignedShift, WorkRuleViolation } from '../types/shift';

// =====================
//      פונקציות עזר
// =====================

// 1. בדיקת רצף ימים - מקסימום 6
const findConsecutiveWorkDays = (
  employeeId: string,
  schedule: Record<string, AssignedShift[]>,
  dates: string[]
): string[] => {
  let maxConsecutive: string[] = [];
  let current: string[] = [];
  dates.forEach(date => {
    const dayShifts = schedule[date]?.filter(shift => shift.employeeId === employeeId) || [];
    if (dayShifts.length > 0) {
      current.push(date);
    } else {
      if (current.length > maxConsecutive.length) maxConsecutive = [...current];
      current = [];
    }
  });
  if (current.length > maxConsecutive.length) maxConsecutive = [...current];
  return maxConsecutive;
};

// 2. ספירת לילות ב־14 ימים - מקסימום 7
const countNightShiftsIn14Days = (
  employeeId: string,
  schedule: Record<string, AssignedShift[]>,
  dates: string[]
): { count: number; dates: string[] } => {
  const nightDates: string[] = [];
  dates.forEach(date => {
    const dayShifts = schedule[date]?.filter(
      shift => shift.employeeId === employeeId && shift.shift === 'night'
    ) || [];
    if (dayShifts.length > 0) nightDates.push(date);
  });
  let maxInWindow = 0;
  let maxWindowDates: string[] = [];
  for (let i = 0; i <= dates.length - 14; i++) {
    const windowDates = dates.slice(i, i + 14);
    const windowNights = nightDates.filter(date => windowDates.includes(date));
    if (windowNights.length > maxInWindow) {
      maxInWindow = windowNights.length;
      maxWindowDates = windowNights;
    }
  }
  return { count: maxInWindow, dates: maxWindowDates };
};

// 3. בדיקת שיבוץ כפול ביום
const findDoubleShifts = (
  employeeId: string,
  schedule: Record<string, AssignedShift[]>,
  dates: string[]
): string[] => {
  const doubleShiftDates: string[] = [];
  dates.forEach(date => {
    const dayShifts = schedule[date]?.filter(shift => shift.employeeId === employeeId) || [];
    if (dayShifts.length > 1) doubleShiftDates.push(date);
  });
  return doubleShiftDates;
};

// 4. בדיקת מעברים קשים/אסורים בין משמרות בימים עוקבים
const findDifficultTransitions = (
  employeeId: string,
  schedule: Record<string, AssignedShift[]>,
  dates: string[]
): Array<{ from: string; to: string; date1: string; date2: string }> => {
  const transitions: Array<{ from: string; to: string; date1: string; date2: string }> = [];
  for (let i = 0; i < dates.length - 1; i++) {
    const today = dates[i], tomorrow = dates[i + 1];
    const todayShifts = schedule[today]?.filter(shift => shift.employeeId === employeeId) || [];
    const tomorrowShifts = schedule[tomorrow]?.filter(shift => shift.employeeId === employeeId) || [];

    if (todayShifts.length > 0 && tomorrowShifts.length > 0) {
      const todayShift = todayShifts[0].shift;
      const tomorrowShift = tomorrowShifts[0].shift;

      const problematicTransitions = [
        ['morning', 'afternoon'],
        ['afternoon', 'morning'],
        ['morning', 'night'],
        ['night', 'afternoon'],
        ['night', 'morning'],
        ['afternoon', 'night']
      ];
      if (problematicTransitions.some(([from, to]) => todayShift === from && tomorrowShift === to)) {
        transitions.push({ from: todayShift, to: tomorrowShift, date1: today, date2: tomorrow });
      }
    }
  }
  return transitions;
};

// 5. פונקציה לבדיקת מעבר אסור
const isProhibitedTransition = (from: string, to: string): boolean => {
  const prohibitedTransitions = [
    ['morning', 'afternoon'],
    ['afternoon', 'morning']
  ];
  return prohibitedTransitions.some(([f, t]) => from === f && to === t);
};

// 6. בדיקת מנוחה <8 שעות בין זוג משמרות עוקבות
const findShortRestPeriods = (
  employeeId: string,
  schedule: Record<string, AssignedShift[]>,
  dates: string[]
): Array<{ shift1: string; shift2: string; date1: string; date2: string }> => {
  const violations: Array<{ shift1: string; shift2: string; date1: string; date2: string }> = [];
  for (let i = 0; i < dates.length - 1; i++) {
    const today = dates[i], tomorrow = dates[i + 1];
    const todayShifts = schedule[today]?.filter(shift => shift.employeeId === employeeId) || [];
    const tomorrowShifts = schedule[tomorrow]?.filter(shift => shift.employeeId === employeeId) || [];

    if (todayShifts.length > 0 && tomorrowShifts.length > 0) {
      const todayShift = todayShifts[0].shift;
      const tomorrowShift = tomorrowShifts[0].shift;
      if (hasLessThan8HoursRest(todayShift, tomorrowShift)) {
        violations.push({
          shift1: todayShift, shift2: tomorrowShift, date1: today, date2: tomorrow
        });
      }
    }
  }
  return violations;
};

// 7. מחשב האם יש פחות מ-8 שעות מנוחה
const hasLessThan8HoursRest = (shift1: string, shift2: string): boolean => {
  const shiftTimes: Record<string, { end: string; start: string }> = {
    morning: { start: '06:30', end: '15:00' },
    morning2: { start: '06:30', end: '16:30' },
    afternoon: { start: '14:45', end: '21:45' },
    night: { start: '21:45', end: '06:30' },
    yavne1: { start: '05:45', end: '14:00' },
    yavne2: { start: '13:00', end: '20:30' },
    patrolAfternoon: { start: '14:00', end: '21:45' },
    visitorsCenter: { start: '08:30', end: '16:30' }
  };

  const shift1End = shiftTimes[shift1]?.end;
  const shift2Start = shiftTimes[shift2]?.start;
  if (!shift1End || !shift2Start) return false;

  const endTime = parseTime(shift1End);
  const startTime = parseTime(shift2Start);

  let diffHours = startTime - endTime;
  if (diffHours < 0) diffHours += 24;
  return diffHours < 8;
};

const parseTime = (timeStr: string): number => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours + minutes / 60;
};

// 8. בדיקת חובת בוקר/בוקר2 בכל מחצית (1–15, 16–סוף), אלא אם יש מילואים
const checkMorningRequirementInHalves = (
  employee: Employee,
  schedule: Record<string, AssignedShift[]>,
  dates: string[]
): { half: 'first' | 'second'; dates: string[] }[] => {
  const firstHalf: string[] = [], secondHalf: string[] = [];
  dates.forEach(date => {
    const day = Number(date.split('-')[2]);
    if (day <= 15) firstHalf.push(date);
    else secondHalf.push(date);
  });

  const out: { half: 'first' | 'second'; dates: string[] }[] = [];
  [firstHalf, secondHalf].forEach((halfDates, i) => {
    if (!halfDates.length) return;
    const hasMiluim = halfDates.some(date => employee.preferences?.[date]?.isMilitary);
    if (hasMiluim) return;

    const hasMorning = halfDates.some(date => {
      const shifts = schedule[date]?.filter(
        s => s.employeeId === employee.id && (s.shift === 'morning' || s.shift === 'morning2')
      );
      return shifts && shifts.length > 0;
    });

    if (!hasMorning) {
      out.push({ half: i === 0 ? 'first' : 'second', dates: halfDates });
    }
  });
  return out;
};

// 9. בדיקת בקרים פתוחים (הרחבה) – דוג׳ למינימום בקרים פתוחים בראשון–חמישי
const checkOpenMorningsPerWeek = (
  employee: Employee,
  schedule: Record<string, AssignedShift[]>,
  dates: string[]
): { weekStart: string; openMornings: number; blocked: number; dates: string[] }[] => {
  const out = [];
  for (let i = 0; i < dates.length; i += 7) {
    const weekDates = dates.slice(i, i + 7);
    let open = 0, blocked = 0;
    weekDates.forEach(date => {
      const day = new Date(date).getDay();
      if (day >= 0 && day <= 4) { // ראשון–חמישי
        const morningPref = employee.preferences?.[date]?.morning?.choice;
        if (morningPref !== 'x') open++; else blocked++;
      }
    });
    out.push({ weekStart: weekDates[0], openMornings: open, blocked, dates: weekDates });
  }
  return out;
};

const getShiftLabel = (shift: string): string => {
  const labels: Record<string, string> = {
    morning: 'בוקר (א)',
    morning2: 'בוקר ארוך (א2)',
    afternoon: 'צהריים (ב)',
    night: 'לילה (ג)',
    yavne1: 'יבנה 1',
    yavne2: 'יבנה 2',
    patrolAfternoon: 'ב סיור',
    visitorsCenter: 'מרכז מבקרים'
  };
  return labels[shift] || shift;
};

// =============================
//    MAIN VALIDATOR
// =============================

export const validateWorkRules = (
  employee: Employee,
  schedule: Record<string, AssignedShift[]>,
  acceptedViolations: Set<string> = new Set()
): WorkRuleViolation[] => {
  const violations: WorkRuleViolation[] = [];
  const dates = Object.keys(schedule).sort();

  function pushViolation(v: WorkRuleViolation) {
    const key = [
      v.type,
      v.employeeId,
      (v.dates || []).join(','),
      v.message
    ].join('|');
    if (acceptedViolations && typeof acceptedViolations.has === 'function' && !acceptedViolations.has(key)) {
      violations.push(v);
    }
    // אם לא מעוניין בתמיכה - השאר רק violations.push(v)
  }

  // 1. בדיקת רצף ימים (מקסימום 6)
  const consecutiveDays = findConsecutiveWorkDays(employee.id, schedule, dates);
  if (consecutiveDays.length > 6) {
    pushViolation({
      type: 'consecutive_days',
      severity: 'error',
      message: `עבודה ${consecutiveDays.length} ימים רצופים (מקסימום 6)`,
      employeeId: employee.id,
      dates: consecutiveDays
    });
  }

  // 2. משמרות לילה בחלון 14 ימים (מקסימום 7)
  const nightShifts = countNightShiftsIn14Days(employee.id, schedule, dates);
  if (nightShifts.count > 7) {
    pushViolation({
      type: 'night_shifts',
      severity: 'error',
      message: `${nightShifts.count} משמרות לילה ב-14 ימים (מקסימום 7)`,
      employeeId: employee.id,
      dates: nightShifts.dates
    });
  }

  // 3. כפילות באותו יום
  const doubleShifts = findDoubleShifts(employee.id, schedule, dates);
  doubleShifts.forEach(date => {
    pushViolation({
      type: 'double_shift',
      severity: 'error',
      message: 'שיבוץ כפול באותו יום',
      employeeId: employee.id,
      dates: [date]
    });
  });

  // 4. מעברים אסורים/קשים + מנוחה <8 שעות
  const difficultTransitions = findDifficultTransitions(employee.id, schedule, dates);
  difficultTransitions.forEach(transition => {
    const severity = isProhibitedTransition(transition.from, transition.to) ? 'error' : 'warning';
    pushViolation({
      type: 'difficult_transition',
      severity,
      message: `מעבר ${severity === 'error' ? 'אסור' : 'קשה'}: ${getShiftLabel(transition.from)} → ${getShiftLabel(transition.to)}`,
      employeeId: employee.id,
      dates: [transition.date1, transition.date2]
    });
  });

  // 5. מנוחה פחות מ-8 שעות
  const shortRestViolations = findShortRestPeriods(employee.id, schedule, dates);
  shortRestViolations.forEach(violation => {
    pushViolation({
      type: 'short_rest',
      severity: 'error',
      message: `פחות מ-8 שעות מנוחה בין ${getShiftLabel(violation.shift1)} ל-${getShiftLabel(violation.shift2)}`,
      employeeId: employee.id,
      dates: [violation.date1, violation.date2]
    });
  });

  // 6. חובת בוקר/בוקר2 בכל מחצית (1–15, 16–סוף), אלא אם יש מילואים
  const missingMornings = checkMorningRequirementInHalves(employee, schedule, dates);
  missingMornings.forEach(halfObj => {
    pushViolation({
      type: 'shift_duration',
      severity: 'error',
      message: `חסרה משמרת א' או א2 במחצית החודש (${halfObj.half === 'first' ? '1–15' : '16–סוף'} ימים) לעובד ${employee.name}`,
      employeeId: employee.id,
      dates: halfObj.dates
    });
  });

  // 7. (הרחבה) – בדיקת בקרים פתוחים – חובה לפחות 2 בקרים פתוחים בראשון–חמישי
  checkOpenMorningsPerWeek(employee, schedule, dates).forEach(({ weekStart, openMornings, blocked, dates }) => {
    if (openMornings < 2) {
      pushViolation({
        type: 'weekly_morning_block',
        severity: 'error',
        message: `בשבוע שמתחיל ב-${weekStart} יש פחות מ-2 בקרים פתוחים (נמצאו רק ${openMornings})`,
        employeeId: employee.id,
        dates
      });
    }
  });

  return violations;
};
