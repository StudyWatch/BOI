import { supabase } from '@/integrations/supabase/client';
import { Employee, GeneratedSchedule, SHIFT_TIMES, ShiftType, Role } from '../types/shift';
import {
  canEmployeeFillRole,
  getAvailableEmployeesForShift,
  MORNING_SHIFTS,
  isShiftConflict
} from './shiftUtils';

const rolePriority: Record<Role, Role[]> = {
  mavtach: ['mavtach', 'boker', 'ahamash'],
  boker: ['boker', 'ahamash'],
  ahamash: ['ahamash'],
  bokrit: ['bokrit', 'ahamash']
};

export async function generateSchedule(
  employees: Employee[],
  month: Date,
  startDate?: string,
  endDate?: string
): Promise<GeneratedSchedule[]> {
  const [
    { data: reqRows, error: reqErr },
    { data: weekRow, error: weekErr }
  ] = await Promise.all([
    supabase
      .from('schedule_rules')
      .select('rule_value')
      .eq('rule_name', 'shift_requirements')
      .eq('active', true),
    supabase
      .from('schedule_rules')
      .select('rule_value')
      .eq('rule_name', 'weekly_constraints')
      .single()
  ]);
  if (reqErr || weekErr) throw reqErr || weekErr;
  const rawRules = (reqRows as any[]).map(r => r.rule_value);
  const weeklyRules = (weekRow!.rule_value as any);

  const stats: Record<string, any> = {};
  const assignments: Record<string, any[]> = {};
  employees.forEach(emp => {
    stats[emp.id] = {
      weeklyShifts: 0,
      weeklyMorningCount: 0,
      monthlyShifts: 0,
      monthlyMorning2Count: 0,
      consecutiveDays: 0,
      lastShiftDate: undefined
    };
    assignments[emp.id] = [];
  });

  const year = month.getFullYear();
  const m = month.getMonth();
  const daysInMonth = new Date(year, m + 1, 0).getDate();
  let weekDates: string[] = [];
  const out: GeneratedSchedule[] = [];
  let days: string[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(year, m, d);
    const date = dt.toISOString().slice(0, 10);
    if (
      (!startDate || date >= startDate) &&
      (!endDate || date <= endDate)
    ) {
      days.push(date);
    }
  }

  for (let idx = 0; idx < days.length; idx++) {
    const date = days[idx];
    const dt = new Date(date);
    const dow = dt.getDay();
    const isWeekend = dow === 5 || dow === 6;

    if (dow === 0) {
      weekDates = [];
      employees.forEach(e => {
        stats[e.id].weeklyShifts = 0;
        stats[e.id].weeklyMorningCount = 0;
      });
    }
    weekDates.push(date);

    const today: GeneratedSchedule = {
      date,
      morning: [],
      morning2: [],
      afternoon: [],
      night: [],
      yavne1: [],
      yavne2: [],
      patrolAfternoon: [],
      visitorsCenter: [],
      issues: []
    };

    type Part = 'morning' | 'afternoon' | 'night';
    const active: Record<Part, ShiftType[]> = isWeekend
      ? {
          morning: ['morning', 'yavne1', 'visitorsCenter'],
          afternoon: ['afternoon', 'yavne2'],
          night: ['night']
        }
      : {
          morning: ['morning', 'morning2', 'yavne1', 'visitorsCenter'],
          afternoon: ['afternoon', 'yavne2'],
          night: ['night']
        };

    for (const shiftKey of Object.keys(SHIFT_TIMES) as ShiftType[]) {
      if (shiftKey === 'morning2' || shiftKey === 'patrolAfternoon') continue;
      const part: Part =
        shiftKey === 'night'
          ? 'night'
          : MORNING_SHIFTS.has(shiftKey)
          ? 'morning'
          : 'afternoon';
      if (!active[part].includes(shiftKey)) continue;

      const rule = rawRules.find(
        r =>
          r.shift_type === shiftKey &&
          r.day_type === (isWeekend ? 'weekend' : 'weekday')
      );
      if (!rule) continue;

      // ----------- הבחירה הכי חכמה: כל חלופה כאופציה שווה (או-או) -----------
      const roleSets: any[] = [
        rule.required_roles,
        ...((rule.alternative_options ?? []).map(o => o.roles))
      ];
      let bestAssigned: Employee[] = [];
      let bestIssues: string[] = [];
      let bestScore = -Infinity;

      for (const rs of roleSets) {
        let assigned: Employee[] = [];
        let issues: string[] = [];
        let scoreSum = 0;

        if ((shiftKey === 'yavne1' || shiftKey === 'yavne2') && rs.mavtach > 0) {
          const { assigned: yAssigned, issues: yIssues } = assignYavne(
            employees,
            date,
            shiftKey,
            rs,
            assignments,
            stats,
            weekDates
          );
          assigned = yAssigned;
          issues = yIssues;
        } else {
          const { assigned: regAssigned, issues: regIssues } = assignShift(
            employees,
            date,
            shiftKey,
            rs,
            assignments,
            stats,
            weekDates
          );
          assigned = regAssigned;
          issues = regIssues;
        }

        if (issues.length === 0) {
          scoreSum = assigned.reduce((sum, e) => {
            return sum + scoreEmployee(
              e,
              date,
              shiftKey,
              e.role,
              assignments,
              stats,
              employees.reduce((s, ee) => s + stats[ee.id].monthlyShifts, 0) / employees.length,
              weekDates
            );
          }, 0);
        } else {
          scoreSum = -10000;
        }

        if (scoreSum > bestScore) {
          bestAssigned = assigned;
          bestIssues = issues;
          bestScore = scoreSum;
        }
      }

      (today as any)[shiftKey] = bestAssigned;
      today.issues.push(...bestIssues);

      bestAssigned.forEach(emp => {
        const st = stats[emp.id];
        st.weeklyShifts++;
        if (MORNING_SHIFTS.has(shiftKey)) st.weeklyMorningCount++;
        st.monthlyShifts++;
        st.consecutiveDays =
          st.lastShiftDate === date ? st.consecutiveDays + 1 : 1;
        st.lastShiftDate = date;
        assignments[emp.id].push({
          date,
          shift: shiftKey,
          employeeId: emp.id
        });
      });
    }

    // שיבוץ morning2: רק אחד מהמשובצים לבוקר שאינו יבנה
    if (!isWeekend && today.morning.length > 0) {
      const notYavne = today.morning.filter(e => e.role !== 'mavtach' && e.role !== 'boker' && e.role !== 'ahamash');
      const pickFrom = notYavne.length > 0 ? notYavne : today.morning;
      const pick = pickFrom.reduce((best, e) =>
        stats[e.id].monthlyMorning2Count < stats[best.id].monthlyMorning2Count
          ? e
          : best
      );
      today.morning2 = [pick];
      stats[pick.id].monthlyMorning2Count++;
    }

    // סיור בצהריים בשישי/שבת – קודם כל מי שאינו בקרית, אחרת לפי מנוחה אחרונה
    if (dow === 5 || dow === 6) {
      const afternoonAssigned = today.afternoon.slice();
      let patrolCandidates = afternoonAssigned.filter(e => e.role !== 'bokrit');
      if (patrolCandidates.length === 0) {
        patrolCandidates = afternoonAssigned.slice();
      }
      patrolCandidates.sort((a, b) => {
        const lastA = assignments[a.id].slice(-1)[0];
        const lastB = assignments[b.id].slice(-1)[0];
        const restA = lastA ? calcRestHours(lastA, date, 'patrolAfternoon') : 24;
        const restB = lastB ? calcRestHours(lastB, date, 'patrolAfternoon') : 24;
        return restB - restA;
      });
      today.patrolAfternoon = [patrolCandidates[0]];
    }

    // בסוף שבוע – ודא שלכל עובד לפחות בוקר אחד
    if (dow === 6 || idx === days.length - 1) {
      const openMorningShifts = weekDates
        .map(d2 => out.find(o => o.date === d2))
        .filter(o => o)
        .flatMap(o => (o!.morning.length ? [] : [o!]));
      employees.forEach(emp => {
        const had = assignments[emp.id].some(a =>
          weekDates.includes(a.date) && MORNING_SHIFTS.has(a.shift as any)
        );
        if (!had && openMorningShifts.length) {
          const slot = openMorningShifts.shift()!;
          slot.morning.push(emp);
          slot.issues.push(`⚠️ הודבק בוקר חוסר לשבוע של ${emp.name}`);
        }
      });

      // בסוף שבוע – ודא שלכל בקרית יש לפחות משמרת ב׳ (afternoon)
      const openAfternoonShifts = weekDates
        .map(d2 => out.find(o => o.date === d2))
        .filter(o => o)
        .flatMap(o => (o!.afternoon.length ? [] : [o!]));
      const bokriot = employees.filter(e => e.role === 'bokrit');
      bokriot.forEach(emp => {
        const had = assignments[emp.id].some(a =>
          weekDates.includes(a.date) && a.shift === 'afternoon'
        );
        if (!had && openAfternoonShifts.length) {
          const slot = openAfternoonShifts.shift()!;
          slot.afternoon.push(emp);
          slot.issues.push(`⚠️ הודבק צהריים חוסר לשבוע של ${emp.name}`);
        }
      });
    }

    out.push(today);
  }
  return out;
}

// ====== פונקציות עזר ======

function assignYavne(
  employees: Employee[],
  date: string,
  shift: ShiftType,
  required: any,
  assignments: Record<string, any[]>,
  stats: Record<string, any>,
  weekDates: string[]
): { assigned: Employee[]; issues: string[] } {
  let assigned: Employee[] = [];
  let issues: string[] = [];

  let pool = getAvailableEmployeesForShift(employees, date, shift).filter(
    e =>
      stats[e.id].consecutiveDays < 6 &&
      (e.role === 'mavtach' || e.role === 'boker' || e.role === 'ahamash')
  );
  pool = pool.filter(e => e.role !== 'bokrit');
  pool = pool.filter(e => {
    const last = assignments[e.id].slice(-1)[0];
    return !last || !isShiftConflict(last.shift, shift, last.date, date);
  });

  const avgMonthly =
    employees.reduce((s, e) => s + stats[e.id].monthlyShifts, 0) / employees.length;

  const scored = pool
    .map(e => ({
      e,
      score: scoreEmployee(
        e,
        date,
        shift,
        'mavtach',
        assignments,
        stats,
        avgMonthly,
        weekDates
      )
    }))
    .filter(x => x.score > -1000)
    .sort((a, b) => b.score - a.score);

  for (let i = 0; i < (required.mavtach || 1); i++) {
    if (scored.length) {
      const top = scored.slice(0, 3);
      const pick = top[Math.floor(Math.random() * top.length)];
      assigned.push(pick.e);
      scored.splice(scored.indexOf(pick), 1);
    } else {
      issues.push(`❌ חסר mavtach ביבנה (${shift}) ב־${date}`);
    }
  }
  return { assigned, issues };
}

function assignShift(
  employees: Employee[],
  date: string,
  shift: ShiftType,
  required: any,
  assignments: Record<string, any[]>,
  stats: Record<string, any>,
  weekDates: string[]
): { assigned: Employee[]; issues: string[] } {
  let pool = getAvailableEmployeesForShift(employees, date, shift).filter(
    e => stats[e.id].consecutiveDays < 6
  );
  pool = pool.filter(e => {
    const last = assignments[e.id].slice(-1)[0];
    return !last || !isShiftConflict(last.shift, shift, last.date, date);
  });
  pool.sort(() => Math.random() - 0.5);

  const avgMonthly =
    employees.reduce((s, e) => s + stats[e.id].monthlyShifts, 0) / employees.length;

  const assigned: Employee[] = [];
  const issues: string[] = [];

  (Object.entries(required) as [Role, number][]).forEach(
    ([role, cnt]) => {
      for (let i = 0; i < cnt; i++) {
        const candidates = pool.filter(
          e =>
            !assigned.includes(e) &&
            canEmployeeFillRole(e.role, role, shift) &&
            !(role === 'mavtach' && shift !== 'patrolAfternoon' && e.role === 'bokrit')
        );
        const scored = candidates
          .map(e => ({
            e,
            score: scoreEmployee(
              e,
              date,
              shift,
              role,
              assignments,
              stats,
              avgMonthly,
              weekDates
            ) + ((e.role === 'bokrit' && (shift === 'morning' || shift === 'afternoon')) ? 2 : 0)
          }))
          .filter(x => x.score > -1000)
          .sort((a, b) => b.score - a.score);

        if (scored.length) {
          const top = scored.slice(0, 3);
          const pick = top[Math.floor(Math.random() * top.length)];
          assigned.push(pick.e);
        } else {
          issues.push(`❌ חסר ${role} במשמרת ${shift} ב־${date}`);
        }
      }
    }
  );
  return { assigned, issues };
}

function scoreEmployee(
  emp: Employee,
  date: string,
  shift: ShiftType,
  requiredRole: Role,
  assignments: Record<string, any[]>,
  stats: Record<string, any>,
  avgMonthly: number,
  weekDates: string[]
): number {
  const dp = emp.preferences[date];
  if (dp?.isMilitary) return -1000;

  let score = 0;
  const part =
    shift === 'night'
      ? 'night'
      : MORNING_SHIFTS.has(shift)
      ? 'morning'
      : 'afternoon';
  const ch = dp?.[part]?.choice;
  if (ch === 'x') return -1000;
  if (ch === '-') score -= 20;
  if (ch === '#') score += 10;
  if (ch === '!') score += 0;

  if (emp.userPreferences?.preferredShifts?.includes(shift)) score += 2;
  if (emp.role === requiredRole) score += 3;
  else if (canEmployeeFillRole(emp.role, requiredRole, shift)) score += 1;

  score -= stats[emp.id].monthlyShifts * 0.25;

  if (assignments[emp.id].some(a => a.shift === shift)) score -= 5;

  // בונוס חזק לבקרית ב-afternoon
  if (emp.role === 'bokrit' && shift === 'afternoon') score += 30;
  if (emp.role === 'bokrit' && shift === 'morning') score += 5;

  if (MORNING_SHIFTS.has(shift) && stats[emp.id].weeklyMorningCount === 0) {
    score += 1000;
  }

  const recent = assignments[emp.id].slice(-2);
  if (
    recent.length === 2 &&
    weekDates.includes(recent[0].date) &&
    weekDates.includes(recent[1].date)
  ) score -= 2;

  const last = assignments[emp.id].slice(-1)[0];
  if (last) {
    const rest = calcRestHours(last, date, shift);
    if (rest < 7.5) return -1000;
  }

  score += Math.random() * 1.5;
  return score;
}

function calcRestHours(
  last: any,
  curDate: string,
  curShift: ShiftType
): number {
  const END: Record<ShiftType, number> = {
    morning: 15,
    morning2: 16.5,
    afternoon: 21.75,
    night: 6.5,
    yavne1: 14,
    yavne2: 20.5,
    patrolAfternoon: 21.75,
    visitorsCenter: 16.5
  };
  const START: Record<ShiftType, number> = {
    morning: 6.5,
    morning2: 6.5,
    afternoon: 14.75,
    night: 21.75,
    yavne1: 5.75,
    yavne2: 13,
    patrolAfternoon: 14,
    visitorsCenter: 8.5
  };
  const lastEnd = END[last.shift] || 0;
  const curStart = START[curShift] || 0;
  const days = Math.floor(
    (new Date(curDate).getTime() - new Date(last.date).getTime()) / 86400000
  );
  if (days === 0) return Math.max(0, curStart - lastEnd);
  if (days === 1) return Math.max(0, 24 - lastEnd + curStart);
  return 24;
}