import * as XLSX from 'xlsx';
import { GeneratedSchedule, Employee } from '../types/shift';

// החזרת קיצור משמרת
const getShiftShort = (shiftKey: string): string => {
  switch (shiftKey) {
    case 'morning': return 'א';
    case 'morning2': return 'א2';
    case 'afternoon': return 'ב';
    case 'night': return 'ג';
    case 'yavne1': return 'יב1';
    case 'yavne2': return 'יב2';
    case 'patrolAfternoon': return 'סיור';
    case 'visitorsCenter': return 'מבקרים';
    default: return '';
  }
};

export const exportToExcel = (schedule: GeneratedSchedule[], month: Date) => {
  // 1. כל שמות העובדים
  const allNamesSet = new Set<string>();
  schedule.forEach(day => {
    Object.keys(day).forEach(shiftType => {
      if (['date', 'issues'].includes(shiftType)) return;
      const employees = (day as any)[shiftType];
      if (Array.isArray(employees)) {
        employees.forEach((emp: Employee) => allNamesSet.add(emp.name));
      }
    });
  });
  const allNames = Array.from(allNamesSet);
  allNames.sort((a, b) => a.localeCompare(b, 'he'));

  // 2. ראש טבלה: תאריך | שם1 | שם2 | ...
  const headers = ['תאריך', ...allNames];

  // 3. טבלה: שורה לכל יום
  const table: any[][] = [];
  table.push(['לוח משמרות - ' + month.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })]);
  table.push(['']);
  table.push(headers);

  schedule.forEach(day => {
    const dateObj = new Date(day.date);
    const dateStr = dateObj.toLocaleDateString('he-IL');
    const row: string[] = [dateStr];

    // שם → סוג משמרת (בקיצור)
    const shiftsByName: Record<string, string> = {};
    Object.keys(day).forEach(shiftType => {
      if (['date', 'issues'].includes(shiftType)) return;
      const employees = (day as any)[shiftType];
      if (Array.isArray(employees)) {
        employees.forEach((emp: Employee) => {
          const short = getShiftShort(shiftType);
          if (short) shiftsByName[emp.name] = short;
        });
      }
    });

    allNames.forEach(name => {
      row.push(shiftsByName[name] || '');
    });

    table.push(row);
  });

  // 4. יצירת worksheet
  const ws = XLSX.utils.aoa_to_sheet(table);

  // ממזג כותרת
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: allNames.length } }];

  // עיצוב: רוחב עמודות
  ws['!cols'] = [{ width: 13 }, ...allNames.map(() => ({ width: 9 }))];

  // עיצוב כותרת
  if (ws['A1']) {
    ws['A1'].s = {
      font: { bold: true, size: 16, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '4472C4' } },
      alignment: { horizontal: 'center' }
    };
  }
  // עיצוב שורת כותרות
  for (let C = 0; C < headers.length; C++) {
    const cell = XLSX.utils.encode_cell({ r: 2, c: C });
    if (!ws[cell]) continue;
    ws[cell].s = {
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '548235' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: {
        top: { style: 'thin', color: { rgb: '000000' } },
        bottom: { style: 'thin', color: { rgb: '000000' } },
        left: { style: 'thin', color: { rgb: '000000' } },
        right: { style: 'thin', color: { rgb: '000000' } }
      }
    };
  }
  // עיצוב שורות
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  for (let R = 3; R <= range.e.r; ++R) {
    for (let C = 0; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[cellAddress]) continue;
      // הדגשת שבת בצבע תכלת, שאר הימים – אייקונים
      const dateCell = ws[XLSX.utils.encode_cell({ r: R, c: 0 })];
      let fillColor = (R % 2 === 0) ? 'F7F7F7' : 'FFFFFF'; // אלטרנטיבי
      if (dateCell && dateCell.v) {
        const [d, m, y] = dateCell.v.split('.');
        const date = new Date(`${y}-${m}-${d}`);
        const day = date.getDay();
        if (day === 6) fillColor = 'DDEBF7'; // שבת - תכלת
        if (day === 5) fillColor = 'FFF2CC'; // שישי - צהבהב
      }
      ws[cellAddress].s = {
        alignment: { horizontal: 'center', vertical: 'center' },
        fill: { fgColor: { rgb: fillColor } },
        border: {
          top: { style: 'thin', color: { rgb: 'CCCCCC' } },
          bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
          left: { style: 'thin', color: { rgb: 'CCCCCC' } },
          right: { style: 'thin', color: { rgb: 'CCCCCC' } }
        }
      };
    }
  }

  // workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'לוח משמרות');

  // שם קובץ
  const monthName = month.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });
  const filename = `לוח_משמרות_${monthName}.xlsx`;

  XLSX.writeFile(wb, filename);
};
