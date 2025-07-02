
import { Employee } from '../types/shift';

export const mockEmployees: Employee[] = [
  {
    id: '1',
    name: 'עובד דוגמה 1',
    code: 'EMP001',
    role: 'ahamash',
    funnyTitle: 'מלך הבוקר',
    preferences: {},
    userPreferences: {
      preferredShifts: ['morning'],
      avoidedShifts: ['night'],
      notes: 'מעדיף משמרות בוקר'
    }
  },
  {
    id: '2',
    name: 'עובד דוגמה 2',
    code: 'EMP002',
    role: 'boker',
    preferences: {},
    userPreferences: {
      preferredShifts: ['afternoon'],
      avoidedShifts: [],
      notes: ''
    }
  }
];
