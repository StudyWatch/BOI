// src/utils/validateWorkRules.ts

import { supabase } from '@/integrations/supabase/client';
import type { Employee, AssignedShift, WorkRuleViolation } from '../types/shift';
import { MORNING_SHIFTS } from './shiftUtils';

export async function validateWorkRules(
  employee: Employee,
  schedule: Record<string, AssignedShift[]>
): Promise<WorkRuleViolation[]> {
  const violations: WorkRuleViolation[] = [];
  const dates = Object.keys(schedule).sort();

  // 1️⃣ טען חוקים שבועיים פעם אחת
  const { data: weekData, error: weekError } = await supabase
    .from('schedule_rules')
    .select('rule_value')
    .eq('rule_name', 'weekly_constraints')
    .single();
  if (weekError || !weekData) {
    console.warn('לא נטען weekly_constraints:', weekError);
    return violations;
  }
  // חמשת השדות שאנחנו משתמשים בהם
  const {
    max_x,
    max_minus,
    min_open_mornings,
    max_x_with_1_exam,
    max_x_with_2_exams,
    min_open_mornings_with_1_exam,
    min_open_mornings_with_2_exams
  } = weekData.rule_value as any;

  // ■ 1. רצף ימים (מקסימום 6)
  {
    let cur: string[] = [], best: string[] = [];
    for (const d of dates) {
      if (schedule[d].some(s => s.employeeId === employee.id)) {
        cur.push(d);
      } else {
        if (cur.length > best.length) best = cur;
        cur = [];
      }
    }
    if (cur.length > best.length) best = cur;
    if (best.length > 6) {
      violations.push({
        type: 'consecutive_days',
        severity: 'error',
        message: `עבודה ${best.length} ימים רצופים (מקסימום 6)`,
        employeeId: employee.id,
        dates: best
      });
    }
  }

  // ■ 2. משמרות לילה בחלון 14 ימים (מקסימום 7)
  {
    const nightDates = dates.filter(d =>
      schedule[d].some(s => s.employeeId === employee.id && s.shift === 'night')
    );
    let bestCount = 0, bestWindow: string[] = [];
    for (let i = 0; i + 14 <= dates.length; i++) {
      const win = dates.slice(i, i + 14);
      const cnt = nightDates.filter(d => win.includes(d)).length;
      if (cnt > bestCount) {
        bestCount = cnt;
        bestWindow = [...nightDates.filter(d => win.includes(d))];
      }
    }
    if (bestCount > 7) {
      violations.push({
        type: 'night_shifts',
        severity: 'error',
        message: `${bestCount} משמרות לילה ב-14 ימים (מקסימום 7)`,
        employeeId: employee.id,
        dates: bestWindow
      });
    }
  }

  // ■ 3. כפילויות באותו יום
  {
    for (const d of dates) {
      const cnt = schedule[d].filter(s => s.employeeId === employee.id).length;
      if (cnt > 1) {
        violations.push({
          type: 'double_shift',
          severity: 'error',
          message: 'שיבוץ כפול באותו יום',
          employeeId: employee.id,
          dates: [d]
        });
      }
    }
  }

  // ■ 4. מעברים קשים ואסורים + מנוחה <8 שעות
  {
    const times: Record<string, { end: string; start: string }> = {
      morning:         { end: '15:00', start: '06:30' },
      morning2:        { end: '16:30', start: '06:30' },
      afternoon:       { end: '21:45', start: '14:45' },
      night:           { end: '06:30', start: '21:45' },
      yavne1:          { end: '14:00', start: '05:45' },
      yavne2:          { end: '20:30', start: '13:00' },
      patrolAfternoon: { end: '21:45', start: '14:00' },
      visitorsCenter:  { end: '16:30', start: '08:30' },
    };
    const parseH = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h + m / 60;
    };
    // רשימת מעברים אסורים (לא לכל המעברים, רק לדוגמא)
    const prohibited: Array<[string, string]> = [
      ['morning', 'afternoon'],
      ['afternoon', 'morning'],
      ['morning', 'night'],
      ['night', 'morning'],
      ['afternoon', 'night'],
      ['night', 'afternoon'],
    ];

    for (let i = 0; i < dates.length - 1; i++) {
      const d1 = dates[i], d2 = dates[i + 1];
      const s1 = schedule[d1].find(s => s.employeeId === employee.id)?.shift;
      const s2 = schedule[d2].find(s => s.employeeId === employee.id)?.shift;
      if (!s1 || !s2) continue;

      // חישוב מנוחה
      const end1 = parseH(times[s1].end);
      let start2 = parseH(times[s2].start);
      let rest = start2 - end1;
      if (rest < 0) rest += 24;
      if (rest < 8) {
        violations.push({
          type: 'short_rest',
          severity: 'error',
          message: `פחות מ-8 שעות מנוחה בין ${s1} ל-${s2}`,
          employeeId: employee.id,
          dates: [d1, d2]
        });
      }

      // בדיקת אסורים/קשים
      if (prohibited.some(([f, t]) => f === s1 && t === s2)) {
        const sev = (s1 === 'night' && s2 === 'morning') ? 'error' : 'warning';
        violations.push({
          type: 'difficult_transition',
          severity: sev,
          message: `${sev === 'error' ? 'אסור' : 'קשה'} לעבור מ-${s1} → ${s2}`,
          employeeId: employee.id,
          dates: [d1, d2]
        });
      }
    }
  }

  // ■ 5. חובת בוקר + סימוני X/− + פתיחות בוקר לכל שבוע
  {
    // תחלק לפי שבועות (יום ראשון = תחילת השבוע)
    const weeks: string[][] = [];
    let cur: string[] = [];
    for (const d of dates) {
      if (new Date(d).getDay() === 0 && cur.length) {
        weeks.push(cur);
        cur = [];
      }
      cur.push(d);
    }
    if (cur.length) weeks.push(cur);

    for (const week of weeks) {
      let xCount = 0, minusCount = 0, openCount = 0, milCount = 0;
      const prefs = employee.preferences || {};
      const hasExam = week.some(d => (prefs[d]?.dayNote || '').includes('מבחן'));

      // ספר X, −, פתוח ועבודה בוקר
      let didMorning = false;
      for (const d of week) {
        const p = prefs[d];
        if (p?.isMilitary) {
          milCount++;
          continue;
        }
        if (p.morning.choice === 'x') xCount++;
        if (p.morning.choice === '-') minusCount++;
        if (p.morning.choice !== 'x') openCount++;
        if (schedule[d].some(s => s.employeeId === employee.id && MORNING_SHIFTS.has(s.shift))) {
          didMorning = true;
        }
      }

      // בחר את המינימום/מקסימום הרלוונטיים
      let minOpen = min_open_mornings;
      let maxXsect = max_x;
      if (milCount === 1 || hasExam) {
        minOpen = min_open_mornings_with_1_exam ?? minOpen;
        maxXsect = max_x_with_1_exam ?? maxXsect;
      }
      if (milCount >= 2) {
        minOpen = min_open_mornings_with_2_exams ?? minOpen;
        maxXsect = max_x_with_2_exams ?? maxXsect;
      }

      // 5.1 חובה בוקר
      if (!milCount && !hasExam && openCount > 0 && !didMorning) {
        violations.push({
          type: 'weekly_morning_block',
          severity: 'error',
          message: 'חסרה משמרת בוקר לפחות אחת בשבוע',
          employeeId: employee.id,
          dates: week
        });
      }
      // 5.2 פתיחות בוקר
      if (openCount < minOpen) {
        violations.push({
          type: 'weekly_morning_block',
          severity: 'error',
          message: `נותרו רק ${openCount} בקרים פתוחים (נדרש מינימום ${minOpen})`,
          employeeId: employee.id,
          dates: week
        });
      }
      // 5.3 X
      if (xCount > maxXsect) {
        violations.push({
          type: 'weekly_x_limit',
          severity: 'error',
          message: `סומן ${xCount} איקסים בשבוע (מותר ${maxXsect})`,
          employeeId: employee.id,
          dates: week
        });
      }
      // 5.4 −
      if (minusCount > max_minus) {
        violations.push({
          type: 'weekly_minus_limit',
          severity: 'error',
          message: `סומן ${minusCount} מינוסים בשבוע (מותר ${max_minus})`,
          employeeId: employee.id,
          dates: week
        });
      }
    }
  }

  return violations;
}
