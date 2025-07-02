
import React from 'react';
import { Info, AlertTriangle } from 'lucide-react';

interface WeeklyStats {
  week: number;
  xCount: number;
  minusCount: number;
  limits: { maxX: number; maxMinus: number };
  isValid: boolean;
}

interface WeeklyStatsDisplayProps {
  weeklyStats: WeeklyStats[];
  employeeName: string;
}

export const WeeklyStatsDisplay: React.FC<WeeklyStatsDisplayProps> = ({
  weeklyStats,
  employeeName
}) => {
  if (weeklyStats.length === 0) return null;

  return (
    <div className="fixed left-4 top-1/2 transform -translate-y-1/2 bg-white border border-gray-200 rounded-lg shadow-lg p-4 w-64 z-50">
      <div className="flex items-center gap-2 mb-3">
        <Info className="h-5 w-5 text-blue-500" />
        <h3 className="font-semibold">סטטיסטיקות שבועיות</h3>
      </div>
      <div className="text-sm text-gray-600 mb-3">{employeeName}</div>
      
      {weeklyStats.map((stat, index) => (
        <div key={index} className="mb-3 p-2 bg-gray-50 rounded">
          <div className="flex justify-between items-center mb-1">
            <span className="font-medium">שבוע {stat.week}</span>
            {!stat.isValid && <AlertTriangle className="h-4 w-4 text-red-500" />}
          </div>
          <div className="text-sm text-gray-600">
            <div className={stat.xCount > stat.limits.maxX ? 'text-red-600 font-medium' : ''}>
              ❌ איקסים: {stat.xCount}/{stat.limits.maxX}
            </div>
            <div className={stat.minusCount > stat.limits.maxMinus ? 'text-orange-600 font-medium' : ''}>
              ➖ מינוסים: {stat.minusCount}/{stat.limits.maxMinus}
            </div>
          </div>
        </div>
      ))}
      
      <div className="border-t pt-3 mt-3">
        <div className="text-xs text-gray-500">
          💡 עצה: השאר לפחות בוקר אחד פתוח כל שבוע
        </div>
      </div>
    </div>
  );
};
