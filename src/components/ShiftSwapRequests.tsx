import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Employee, AssignedShift, Role } from '../types/shift';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { RefreshCw, Users, AlertTriangle, CheckCircle } from 'lucide-react';

// היררכיית תפקידים
const ROLE_HIERARCHY: Record<Role, Role[]> = {
  ahamash: ['ahamash', 'boker', 'mavtach', 'bokrit'],
  boker: ['boker', 'mavtach', 'bokrit'],
  mavtach: ['mavtach'],
  bokrit: ['bokrit']
};

const SHIFT_TIMES: Record<string, { start: string; end: string }> = {
  morning: { start: '06:30', end: '15:00' },
  morning2: { start: '06:30', end: '16:30' },
  afternoon: { start: '14:45', end: '21:45' },
  night: { start: '21:45', end: '06:30' },
  yavne1: { start: '05:45', end: '14:00' },
  yavne2: { start: '13:00', end: '20:30' },
  patrolAfternoon: { start: '14:00', end: '21:45' },
  visitorsCenter: { start: '08:30', end: '16:30' }
};

const canEmployeeFillRole = (employeeRole: Role, requiredRole: Role): boolean => {
  return ROLE_HIERARCHY[employeeRole]?.includes(requiredRole) || false;
};

const parseTime = (timeStr: string): number => {
  const [h, m] = timeStr.split(':').map(Number);
  return h + m / 60;
};
const hasEnoughRest = (prev: string, next: string): boolean => {
  const prevEnd = SHIFT_TIMES[prev]?.end, nextStart = SHIFT_TIMES[next]?.start;
  if (!prevEnd || !nextStart) return true;
  let diff = parseTime(nextStart) - parseTime(prevEnd);
  if (diff < 0) diff += 24;
  return diff >= 8;
};

const canSwapShifts = (
  fromEmployee: Employee,
  fromShift: AssignedShift,
  toEmployee: Employee,
  toShift: AssignedShift,
  schedule: Record<string, AssignedShift[]>
): { canSwap: boolean; violations: string[] } => {
  const violations: string[] = [];
  if (!fromEmployee || !toEmployee || !fromShift || !toShift) {
    violations.push('נתוני משמרת/עובד לא הוזנו');
    return { canSwap: false, violations };
  }
  if (!canEmployeeFillRole(toEmployee.role as Role, fromShift.role as Role))
    violations.push(`${toEmployee.name} לא יכול למלא את תפקיד ${fromShift.role}`);
  if (!canEmployeeFillRole(fromEmployee.role as Role, toShift.role as Role))
    violations.push(`${fromEmployee.name} לא יכול למלא את תפקיד ${toShift.role}`);
  const checkCriticalRole = (shift: AssignedShift, skipEmployee: Employee) => {
    const others = (schedule[shift.date] || []).filter(s =>
      s.role === shift.role && s.employeeId !== skipEmployee.id
    );
    if (others.length === 0)
      return `לא ניתן להחליף את ${skipEmployee.name} כי אין עוד ${shift.role} במשמרת`;
    return '';
  };
  let missing = checkCriticalRole(fromShift, fromEmployee);
  if (missing) violations.push(missing);
  const checkSameDay = (empId: string, date: string, shift: string) => {
    const shifts = schedule[date]?.filter(s => s.employeeId === empId) || [];
    return shifts.some(s => s.shift !== shift);
  };
  if (checkSameDay(toEmployee.id, fromShift.date, fromShift.shift))
    violations.push(`${toEmployee.name} כבר שובץ למשמרת אחרת באותו יום`);
  if (checkSameDay(fromEmployee.id, toShift.date, toShift.shift))
    violations.push(`${fromEmployee.name} כבר שובץ למשמרת אחרת באותו יום`);
  if (!hasEnoughRest(toShift.shift, fromShift.shift))
    violations.push(`אין מספיק מנוחה בין משמרת ${toShift.shift} ל-${fromShift.shift}`);
  if (!hasEnoughRest(fromShift.shift, toShift.shift))
    violations.push(`אין מספיק מנוחה בין משמרת ${fromShift.shift} ל-${toShift.shift}`);
  return { canSwap: violations.length === 0, violations };
};

interface ShiftSwapModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentEmployee?: Employee;
  currentShift?: AssignedShift;
  employees: Employee[];
  onSwapRequested: () => void;
}

// הצגת כל התפקידים בעברית
const getShiftLabel = (shiftType: string): string => {
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
  return labels[shiftType] || shiftType;
};

const ShiftSwapModal: React.FC<ShiftSwapModalProps> = ({
  isOpen,
  onClose,
  currentEmployee,
  currentShift,
  employees,
  onSwapRequested
}) => {
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [selectedShift, setSelectedShift] = useState<string>('');
  const [availableEmployees, setAvailableEmployees] = useState<Employee[]>([]);
  const [availableShifts, setAvailableShifts] = useState<AssignedShift[]>([]);
  const [validationResult, setValidationResult] = useState<{ canSwap: boolean; violations: string[] } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [allAssignments, setAllAssignments] = useState<Record<string, AssignedShift[]>>({});
  const isModalOpenRef = useRef(false);

  useEffect(() => {
    isModalOpenRef.current = isOpen;
    if (isOpen && currentEmployee && currentShift) {
      loadAllAssignments();
      setSelectedEmployee('');
      setSelectedShift('');
      setValidationResult(null);
    } else {
      setSelectedEmployee('');
      setSelectedShift('');
      setAvailableShifts([]);
      setAvailableEmployees([]);
      setValidationResult(null);
    }
  }, [isOpen, currentEmployee, currentShift]);

  const loadAllAssignments = async () => {
    if (!isModalOpenRef.current) return;
    try {
      const { data, error } = await supabase
        .from('shift_assignments')
        .select('*')
        .gte('date', new Date().toISOString().split('T')[0]);
      if (!isModalOpenRef.current) return;
      if (error) return;
      const assignments: Record<string, AssignedShift[]> = {};
      (data || []).forEach((assignment: any) => {
        if (!assignments[assignment.date]) assignments[assignment.date] = [];
        assignments[assignment.date].push({
          employeeId: assignment.employee_id,
          date: assignment.date ?? '',
          shift: assignment.shift_type ?? '',
          role: (assignment.role ?? '') as Role,
          assignedBy: assignment.assigned_by ?? '',
          assignedAt: assignment.assigned_at ?? ''
        });
      });
      setAllAssignments(assignments);
      if (currentEmployee && currentShift) findEligibleEmployees(assignments, currentEmployee, currentShift);
    } catch {}
  };

  const findEligibleEmployees = (
    assignments: Record<string, AssignedShift[]>,
    curEmployee: Employee,
    curShift: AssignedShift
  ) => {
    if (!isModalOpenRef.current) return;
    const eligible = employees.filter(emp => {
      if (emp.id === curEmployee.id) return false;
      if (!canEmployeeFillRole(emp.role as Role, curShift.role as Role)) return false;
      if ((assignments[curShift.date] || []).some(s => s.employeeId === emp.id)) return false;
      const others = (assignments[curShift.date] || []).filter(s => s.role === curShift.role && s.employeeId !== curEmployee.id);
      if (others.length === 0) return false;
      return true;
    });
    setAvailableEmployees(eligible);
  };

  useEffect(() => {
    if (selectedEmployee && isModalOpenRef.current) {
      loadEmployeeShifts(selectedEmployee);
    } else {
      setAvailableShifts([]);
      setSelectedShift('');
    }
  }, [selectedEmployee]);

  const loadEmployeeShifts = async (employeeId: string) => {
    if (!isModalOpenRef.current || !currentEmployee || !currentShift) return;
    try {
      const { data, error } = await supabase
        .from('shift_assignments')
        .select('*')
        .eq('employee_id', employeeId)
        .gte('date', new Date().toISOString().split('T')[0]);
      if (!isModalOpenRef.current) return;
      if (error) return;
      const eligibleShifts = (data || []).filter((shift: any) =>
        canEmployeeFillRole(currentEmployee.role as Role, shift.role as Role) &&
        canEmployeeFillRole(shift.role as Role, currentShift.role as Role) &&
        !(shift.date === currentShift.date && shift.shift_type === currentShift.shift)
      );
      const shifts: AssignedShift[] = eligibleShifts.map((shift: any) => ({
        employeeId: shift.employee_id,
        date: shift.date ?? '',
        shift: shift.shift_type ?? '',
        role: (shift.role ?? '') as Role,
        assignedBy: shift.assigned_by ?? '',
        assignedAt: shift.assigned_at ?? ''
      }));
      setAvailableShifts(shifts);
    } catch {}
  };

  useEffect(() => {
    if (selectedEmployee && selectedShift && isModalOpenRef.current && currentEmployee && currentShift) {
      validateSwap();
    } else {
      setValidationResult(null);
    }
  }, [selectedEmployee, selectedShift, allAssignments, currentEmployee, currentShift]);

  const validateSwap = () => {
    if (!isModalOpenRef.current || !currentEmployee || !currentShift) return;
    const targetEmployee = employees.find(emp => emp.id === selectedEmployee);
    const targetShift = availableShifts.find(shift =>
      `${shift.date}-${shift.shift}` === selectedShift
    );
    if (!targetEmployee || !targetShift) {
      setValidationResult(null);
      return;
    }
    const result = canSwapShifts(
      currentEmployee,
      currentShift,
      targetEmployee,
      targetShift,
      allAssignments
    );
    if (isModalOpenRef.current) setValidationResult(result);
  };

  const handleSubmitSwap = async () => {
    if (!selectedEmployee || !selectedShift || !validationResult?.canSwap || !currentEmployee || !currentShift) {
      toast({
        title: 'שגיאה',
        description: 'יש לבחור עובד ומשמרת תקינים להחלפה',
        variant: 'destructive'
      });
      return;
    }
    setIsLoading(true);
    try {
      const selectedShiftData = availableShifts.find(shift =>
        `${shift.date}-${shift.shift}` === selectedShift
      );
      if (!selectedShiftData) {
        toast({
          title: 'שגיאה',
          description: 'המשמרת שנבחרה לא נמצאה',
          variant: 'destructive'
        });
        setIsLoading(false);
        return;
      }
      const { error } = await supabase
        .from('shift_swap_requests')
        .insert({
          from_employee_id: currentEmployee.id,
          to_employee_id: selectedEmployee,
          from_shift_date: currentShift.date,
          from_shift_type: currentShift.shift,
          to_shift_date: selectedShiftData.date,
          to_shift_type: selectedShiftData.shift,
          status: 'pending',
          notes: `בקשת חילוף - ${currentEmployee.name} מבקש להחליף עם ${employees.find(e => e.id === selectedEmployee)?.name}`
        });
      if (error) {
        toast({
          title: 'שגיאה',
          description: 'שגיאה ביצירת בקשת החילוף',
          variant: 'destructive'
        });
        setIsLoading(false);
        return;
      }
      toast({
        title: 'בקשת חילוף נשלחה',
        description: 'הבקשה נשלחה בהצלחה והעובד יקבל התראה',
      });
      onSwapRequested();
      onClose();
    } catch (error) {
      toast({
        title: 'שגיאה',
        description: 'אירעה שגיאה בשליחת בקשת החילוף',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    isModalOpenRef.current = false;
    onClose();
  };

  if (!currentEmployee || !currentShift) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md sm:max-w-lg mx-2 sm:mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <RefreshCw className="h-5 w-5" />
            הצעת חילוף משמרת
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 sm:space-y-6">
          <div className="bg-blue-50 p-3 sm:p-4 rounded-lg">
            <div className="font-medium text-sm sm:text-base mb-2">המשמרת שלך:</div>
            <div className="text-xs sm:text-sm text-gray-600 space-y-1">
              <div>{currentShift?.date ? new Date(currentShift.date).toLocaleDateString('he-IL') : '-'} - {getShiftLabel(currentShift?.shift || '')}</div>
              <div>תפקיד: {currentShift?.role || '-'}</div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              <Users className="inline h-4 w-4 mr-1" />
              בחר עובד להחלפה איתו ({availableEmployees.length} זכאים):
            </label>
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger className="h-12 sm:h-10">
                <SelectValue placeholder="בחר עובד" />
              </SelectTrigger>
              <SelectContent>
                {availableEmployees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    <div className="flex items-center justify-between w-full">
                      <span>{employee.name}</span>
                      <Badge variant="outline" className="ml-2 text-xs">
                        {employee.role}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedEmployee && (
            <div>
              <label className="block text-sm font-medium mb-2">
                בחר משמרת להחלפה ({availableShifts.length} זמינות):
              </label>
              <Select value={selectedShift} onValueChange={setSelectedShift}>
                <SelectTrigger className="h-12 sm:h-10">
                  <SelectValue placeholder="בחר משמרת" />
                </SelectTrigger>
                <SelectContent>
                  {availableShifts.map((shift, idx) => (
                    <SelectItem
                      key={`${shift.date}-${shift.shift}-${idx}`}
                      value={`${shift.date}-${shift.shift}`}
                    >
                      <div className="text-sm">
                        <div>{shift?.date ? new Date(shift.date).toLocaleDateString('he-IL') : '-'} - {getShiftLabel(shift?.shift || '')}</div>
                        <div className="text-xs text-gray-500">תפקיד: {shift?.role || '-'}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {validationResult && (
            <div className={`p-3 sm:p-4 rounded-lg border ${
              validationResult.canSwap
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {validationResult.canSwap ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-green-800 text-sm sm:text-base">
                      החילוף אפשרי!
                    </span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    <span className="font-medium text-red-800 text-sm sm:text-base">
                      לא ניתן לבצע חילוף
                    </span>
                  </>
                )}
              </div>
              {validationResult.violations.length > 0 && (
                <div className="space-y-1">
                  {validationResult.violations.map((violation, idx) => (
                    <div key={idx} className="text-xs sm:text-sm text-red-700 bg-red-100 p-2 rounded">
                      {violation}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
              className="h-12 sm:h-10 text-base sm:text-sm order-2 sm:order-1"
            >
              ביטול
            </Button>
            <Button
              onClick={handleSubmitSwap}
              disabled={!validationResult?.canSwap || isLoading}
              className="h-12 sm:h-10 text-base sm:text-sm order-1 sm:order-2 flex-1"
            >
              {isLoading ? 'שולח...' : 'שלח בקשת חילוף'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShiftSwapModal;
