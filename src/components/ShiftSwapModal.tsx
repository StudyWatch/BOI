import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Employee, AssignedShift, Role } from '../types/shift';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { RefreshCw, Users, AlertTriangle, CheckCircle, Clock, X, Check, Hand, Repeat } from 'lucide-react';

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
// בדיקת חילוף דו-כיווני
const canSwapShifts = (
  fromEmployee: Employee, fromShift: AssignedShift,
  toEmployee: Employee, toShift: AssignedShift,
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
// מסירת משמרת - בדיקה
const canHandoverShift = (
  fromEmployee: Employee,
  fromShift: AssignedShift,
  toEmployee: Employee,
  schedule: Record<string, AssignedShift[]>
): { canHandover: boolean; violations: string[] } => {
  const violations: string[] = [];
  if (!fromEmployee || !toEmployee || !fromShift) {
    violations.push('נתונים חסרים.');
    return { canHandover: false, violations };
  }
  if (!canEmployeeFillRole(toEmployee.role as Role, fromShift.role as Role))
    violations.push(`${toEmployee.name} לא מתאים לתפקיד ${fromShift.role}`);
  if ((schedule[fromShift.date] || []).some(s => s.employeeId === toEmployee.id))
    violations.push(`${toEmployee.name} כבר שובץ למשמרת אחרת באותו יום`);
  const others = (schedule[fromShift.date] || []).filter(s => s.role === fromShift.role && s.employeeId !== fromEmployee.id);
  if (others.length === 0) violations.push(`לא ניתן למסור: ${fromEmployee.name} הוא היחיד בתפקיד!`);
  return { canHandover: violations.length === 0, violations };
};

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

interface ShiftSwapRequest {
  id: string;
  from_employee_id: string;
  to_employee_id: string;
  from_shift_date: string;
  from_shift_type: string;
  to_shift_date: string;
  to_shift_type: string;
  status: 'pending' | 'accepted' | 'rejected';
  type?: 'swap' | 'handover';
  created_at: string;
  reviewed_at?: string;
  notes?: string;
}

interface ShiftSwapModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentEmployee?: Employee;
  currentShift?: AssignedShift;
  employees: Employee[];
  onSwapRequested: () => void;
}

const ShiftSwapModal: React.FC<ShiftSwapModalProps> = ({
  isOpen,
  onClose,
  currentEmployee,
  currentShift,
  employees,
  onSwapRequested
}) => {
  const [mode, setMode] = useState<'swap' | 'handover'>('swap');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [selectedShift, setSelectedShift] = useState<string>('');
  const [availableEmployees, setAvailableEmployees] = useState<Employee[]>([]);
  const [availableShifts, setAvailableShifts] = useState<AssignedShift[]>([]);
  const [validationResult, setValidationResult] = useState<{ ok: boolean; violations: string[] } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [allAssignments, setAllAssignments] = useState<Record<string, AssignedShift[]>>({});
  const [myRequests, setMyRequests] = useState<ShiftSwapRequest[]>([]);
  const isModalOpenRef = useRef(false);

  useEffect(() => {
    isModalOpenRef.current = isOpen;
    if (isOpen && currentEmployee && currentShift) {
      loadAllAssignments();
      loadMySwapRequests();
      setSelectedEmployee('');
      setSelectedShift('');
      setValidationResult(null);
      setMode('swap');
    } else {
      setSelectedEmployee('');
      setSelectedShift('');
      setAvailableShifts([]);
      setAvailableEmployees([]);
      setValidationResult(null);
      setMyRequests([]);
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

  const loadMySwapRequests = async () => {
    if (!isModalOpenRef.current || !currentEmployee) return;
    try {
      const { data, error } = await supabase
        .from('shift_swap_requests')
        .select('*')
        .eq('from_employee_id', currentEmployee.id)
        .order('created_at', { ascending: false });
      if (error) return;
      setMyRequests(data || []);
    } catch {}
  };

  // עדכון - בונה את הרשימה לפי מצב swap/העברה
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
    if (selectedEmployee && mode === 'swap' && isModalOpenRef.current) {
      loadEmployeeShifts(selectedEmployee);
    } else {
      setAvailableShifts([]);
      setSelectedShift('');
    }
  }, [selectedEmployee, mode]);

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

  // ולידציה
  useEffect(() => {
    if (!selectedEmployee || !currentEmployee || !currentShift) {
      setValidationResult(null);
      return;
    }
    if (mode === 'handover') {
      const toEmp = employees.find(e => e.id === selectedEmployee);
      if (!toEmp) return setValidationResult(null);
      const result = canHandoverShift(currentEmployee, currentShift, toEmp, allAssignments);
      setValidationResult({ ok: result.canHandover, violations: result.violations });
    } else if (mode === 'swap' && selectedShift) {
      const toEmp = employees.find(e => e.id === selectedEmployee);
      const toShift = availableShifts.find(s => `${s.date}-${s.shift}` === selectedShift);
      if (!toEmp || !toShift) return setValidationResult(null);
      const { canSwap, violations } = canSwapShifts(currentEmployee, currentShift, toEmp, toShift, allAssignments);
      setValidationResult({ ok: canSwap, violations });
    } else {
      setValidationResult(null);
    }
  }, [mode, selectedEmployee, selectedShift, allAssignments, currentEmployee, currentShift]);

  // שליחה
  const handleSubmit = async () => {
    if (!selectedEmployee || !currentEmployee || !currentShift || !validationResult?.ok) {
      toast({
        title: 'שגיאה',
        description: 'נא לבחור עובד מתאים ולוודא שאין בעיות',
        variant: 'destructive'
      });
      return;
    }
    setIsLoading(true);
    try {
      let payload: any = {
        from_employee_id: currentEmployee.id,
        to_employee_id: selectedEmployee,
        from_shift_date: currentShift.date,
        from_shift_type: currentShift.shift,
        status: 'pending',
        type: mode,
        notes: mode === 'handover'
          ? `בקשת מסירת משמרת - ${currentEmployee.name} מציע ל${employees.find(e => e.id === selectedEmployee)?.name}`
          : `בקשת חילוף - ${currentEmployee.name} <-> ${employees.find(e => e.id === selectedEmployee)?.name}`
      };
      if (mode === 'swap') {
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
        payload.to_shift_date = selectedShiftData.date;
        payload.to_shift_type = selectedShiftData.shift;
      } else {
        payload.to_shift_date = currentShift.date;
        payload.to_shift_type = currentShift.shift;
      }
      const { error } = await supabase
        .from('shift_swap_requests')
        .insert(payload);
      if (error) {
        toast({
          title: 'שגיאה',
          description: 'שגיאה ביצירת הבקשה',
          variant: 'destructive'
        });
        setIsLoading(false);
        return;
      }
      toast({
        title: mode === 'handover' ? 'בקשת מסירה נשלחה' : 'בקשת חילוף נשלחה',
        description: 'הבקשה נשלחה בהצלחה לעובד הנבחר',
      });
      onSwapRequested();
      loadMySwapRequests();
      onClose();
    } catch (error) {
      toast({
        title: 'שגיאה',
        description: 'אירעה שגיאה בשליחת הבקשה',
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
            {mode === 'handover'
              ? <>מסירת משמרת <Hand className="ml-1 h-6 w-6 text-blue-400" /></>
              : <>הצעת חילוף <Repeat className="ml-1 h-6 w-6 text-orange-500" /></>
            }
          </DialogTitle>
        </DialogHeader>
        <div className="flex gap-2 mb-2">
          <Button variant={mode === 'swap' ? "default" : "outline"} size="sm" onClick={() => setMode('swap')}>הצעת חילוף</Button>
          <Button variant={mode === 'handover' ? "default" : "outline"} size="sm" onClick={() => setMode('handover')}>מסירת משמרת</Button>
        </div>
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
              בחר עובד ({availableEmployees.length} זכאים):
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
          {/* רק ב-SWAP בוחרים משמרת מהשני */}
          {selectedEmployee && mode === 'swap' && (
            <div>
              <label className="block text-sm font-medium mb-2">
                בחר משמרת ({availableShifts.length} זמינות):
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
              validationResult.ok
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {validationResult.ok ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-green-800 text-sm sm:text-base">
                      אפשר להציע!
                    </span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    <span className="font-medium text-red-800 text-sm sm:text-base">
                      לא ניתן
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
              onClick={handleSubmit}
              disabled={!validationResult?.ok || isLoading}
              className="h-12 sm:h-10 text-base sm:text-sm order-1 sm:order-2 flex-1"
            >
              {isLoading
                ? (mode === 'handover' ? 'שולח...' : 'שולח...')
                : (mode === 'handover' ? 'שלח בקשת מסירה' : 'שלח בקשת חילוף')}
            </Button>
          </div>
          {/* הצגת בקשות חילוף שלי */}
          <div>
            <div className="font-medium mt-6 mb-1">הבקשות ששלחת:</div>
            {myRequests.length === 0 ? (
              <div className="text-xs text-gray-500">לא שלחת בקשות חילוף/מסירה.</div>
            ) : (
              myRequests.map(req => (
                <div key={req.id} className="flex items-center gap-3 text-xs py-1">
                  {req.type === 'handover' ? <Hand className="h-4 w-4" /> : <Repeat className="h-4 w-4" />}
                  <span>
                    {new Date(req.created_at).toLocaleDateString('he-IL')}
                    : {getShiftLabel(req.from_shift_type)}{req.type === 'swap' && ' → ' + getShiftLabel(req.to_shift_type)}
                  </span>
                  <Badge variant={
                    req.status === 'pending' ? 'secondary' :
                      req.status === 'accepted' ? 'default' : 'destructive'
                  }>
                    {req.status === 'pending' ? 'ממתין' :
                      req.status === 'accepted' ? 'אושר' : 'נדחה'}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShiftSwapModal;
