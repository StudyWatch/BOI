import React, { useState, useEffect, useRef } from 'react'
import { toast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  Employee,
  DayPreferences,
  ShiftChoice,
  UserPreferences,
  SHIFT_TIMES
} from '../types/shift'
import {
  getWeekStart,
  createEmptyDayPreferences,
  setMilitaryService,
  setMilitaryServiceForMonth
} from '../utils/shiftUtils'
import undoManager from '../utils/undoManager'
import {
  Shield, Sun, Clock, Moon, Undo2, Copy, X, Eraser, ArrowUp, Calendar, Info, AlertTriangle, XCircle
} from 'lucide-react'
import { PersonalSummary } from './PersonalSummary'
import { UserPreferencesForm } from './UserPreferencesForm'
import { useIsMobile } from '@/hooks/use-mobile'

// ========================== Utility ==========================
const getFirstHalf = (currentMonth: Date) =>
  Array.from({ length: 15 }, (_, i) => new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i + 1))

const getSecondHalf = (currentMonth: Date) => {
  const last = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate()
  return Array.from({ length: last - 15 }, (_, i) => new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i + 16))
}

const getMonthWeeks = (month: Date) => {
  const year = month.getFullYear()
  const mon = month.getMonth()
  const days = new Date(year, mon + 1, 0).getDate()
  const weeks: { weekStart: string, dates: string[] }[] = []
  let weekMap: Record<string, string[]> = {}
  for (let day = 1; day <= days; day++) {
    const date = new Date(year, mon, day)
    const ws = getWeekStart(date).toISOString().split('T')[0]
    if (!weekMap[ws]) weekMap[ws] = []
    weekMap[ws].push(date.toISOString().slice(0, 10))
  }
  for (let w in weekMap) {
    weeks.push({ weekStart: w, dates: weekMap[w] })
  }
  return weeks
}
function getWeekKeyOfDate(dateStr: string, month: Date) {
  const weeks = getMonthWeeks(month)
  const week = weeks.find(w => w.dates.includes(dateStr))
  return week?.weekStart || weeks[0]?.weekStart
}

// ===================== WeeklyStatsFloating =====================
const WeeklyStatsFloating: React.FC<{
  preferences: Record<string, DayPreferences>,
  currentMonth: Date,
  employeeName: string,
  selectedWeek: string,
  onClose: () => void,
  visible: boolean
}> = ({ preferences, currentMonth, employeeName, selectedWeek, onClose, visible }) => {
  const [rules, setRules] = useState<any>(null)
  const [weekStats, setWeekStats] = useState<any>(null)

  useEffect(() => {
    const loadRules = async () => {
      const { data, error } = await supabase
        .from('schedule_rules')
        .select('rule_value')
        .eq('rule_name', 'weekly_constraints')
        .single()
      if (!error && data?.rule_value) {
        let parsed: any
        try {
          parsed = typeof data.rule_value === 'string'
            ? JSON.parse(data.rule_value)
            : data.rule_value
        } catch {
          parsed = data.rule_value
        }
        setRules(parsed)
      }
    }
    loadRules()
  }, [])

  useEffect(() => {
    if (!rules || !selectedWeek) return
    const weekDates = getMonthWeeks(currentMonth).find(w => w.weekStart === selectedWeek)?.dates || []
    let x = 0, minus = 0, exams = 0, blockedMornings = 0

    weekDates.forEach(date => {
      const dayPrefs = preferences[date]
      if (!dayPrefs) return
      if (dayPrefs.dayNote && dayPrefs.dayNote.toLowerCase().includes('מבחן')) exams++
      const shifts: (keyof DayPreferences)[] = [
        'morning', 'afternoon', 'night', 'morning2',
        'yavne1', 'yavne2', 'patrolAfternoon', 'visitorsCenter'
      ]
      shifts.forEach(shift => {
        const ch = dayPrefs[shift]?.choice
        if (ch === 'x') x++
        if (ch === '-') minus++
      })
      const d = new Date(date)
      if (d.getDay() >= 0 && d.getDay() <= 4 && dayPrefs.morning.choice === 'x') blockedMornings++
    })

    const allowedX = exams === 0
      ? rules.max_x
      : exams === 1
        ? rules.max_x_with_1_exam
        : rules.max_x_with_2_exams
    const allowedMinus = rules.max_minus
    const requiredOpenMornings = exams === 0
      ? rules.min_open_mornings
      : exams === 1
        ? rules.min_open_mornings_with_1_exam
        : rules.min_open_mornings_with_2_exams
    const maxBlockedMornings = 5 - requiredOpenMornings

    setWeekStats({
      weekLabel: selectedWeek,
      x, minus, exams, blockedMornings,
      allowedX, allowedMinus, requiredOpenMornings, maxBlockedMornings,
      isValid: (x <= allowedX) && (minus <= allowedMinus) && (blockedMornings <= maxBlockedMornings)
    })
  }, [preferences, selectedWeek, currentMonth, rules])

  if (!weekStats || !rules || !visible) return null

  return (
    <div className={`fixed right-4 top-24 z-50 w-80 rounded-2xl shadow-xl border bg-white p-4 space-y-2 animate-in fade-in`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Info className="h-5 w-5 text-blue-500" />
          <span className="font-bold text-base">סטטיסטיקה – שבוע {new Date(weekStats.weekLabel).toLocaleDateString('he-IL')}</span>
        </div>
        <button className="p-1 hover:bg-gray-200 rounded-full" onClick={onClose}><XCircle className="h-5 w-5 text-gray-500" /></button>
      </div>
      <div className="text-sm text-gray-500 mb-2">{employeeName}</div>
      <div className={`mb-2 p-2 rounded-lg ${weekStats.isValid ? 'bg-green-50' : 'bg-red-50 border border-red-300'}`}>
        <div className="flex flex-col gap-1">
          <span className={weekStats.x > weekStats.allowedX ? 'text-red-600 font-bold' : ''}>
            ❌ איקסים: {weekStats.x}/{weekStats.allowedX}
          </span>
          <span className={weekStats.minus > weekStats.allowedMinus ? 'text-orange-600 font-bold' : ''}>
            ➖ מינוסים: {weekStats.minus}/{weekStats.allowedMinus}
          </span>
          <span className={weekStats.blockedMornings > weekStats.maxBlockedMornings ? 'text-yellow-700 font-bold' : ''}>
            🌅 בקרים חסומים (א׳–ה׳): {weekStats.blockedMornings}/{weekStats.maxBlockedMornings}
          </span>
        </div>
        {weekStats.exams > 0 && (
          <div className="text-xs text-blue-700 mt-1">
            זוהו {weekStats.exams} מבחנים – מותר {weekStats.allowedX} איקסים, חובה להשאיר {weekStats.requiredOpenMornings} בקרים פתוחים.
          </div>
        )}
        {!weekStats.isValid && (
          <div className="mt-2 text-xs text-red-600 flex items-center gap-1">
            <AlertTriangle className="h-4 w-4" />
            <span>חריגה ממגבלות! יש לתקן את הסימון.</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ===================== Main Component =====================
const CHOICE_COLORS: Record<ShiftChoice | '', string> = {
  x: 'bg-red-100 border-red-300 text-red-800 hover:bg-red-200 active:bg-red-300',
  '-': 'bg-orange-100 border-orange-300 text-orange-800 hover:bg-orange-200 active:bg-orange-300',
  '#': 'bg-green-100 border-green-300 text-green-800 hover:bg-green-200 active:bg-green-300',
  '!': 'bg-blue-100 border-blue-300 text-blue-800 hover:bg-blue-200 active:bg-blue-300',
  '': 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100 active:bg-gray-200'
}
const SHIFTS = ['morning', 'afternoon', 'night'] as const
type ShiftKey = typeof SHIFTS[number]
const SHIFT_ICONS: Record<ShiftKey, React.ComponentType<any>> = {
  morning: Sun,
  afternoon: Clock,
  night: Moon
}

export const EmployeeShiftSelector: React.FC<{
  employees: Employee[]
  selectedMonth: Date
  onUpdateEmployee: (updated: Employee) => Promise<void> | void
  isDarkMode?: boolean
  isAdminBoard?: boolean // <<< הוסף כאן! 
}> = ({
  employees,
  selectedMonth: currentMonth,
  onUpdateEmployee,
  isDarkMode = false,
  isAdminBoard = false // <<< ברירת מחדל
}) => {
  // התנאי עושה כניסה אוטומטית לעובד רק אם זה לא לוח סדרן ויש רק אחד:
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    !isAdminBoard && employees.length === 1 ? employees[0] : null
  )
  const [preferences, setPreferences] = useState<Record<string, DayPreferences>>({})
  const [userPreferences, setUserPreferences] = useState<UserPreferences>({ preferredShifts: [], avoidedShifts: [], notes: '' })
  const [activeTab, setActiveTab] = useState<'schedule' | 'summary' | 'constraints' | 'preferences'>('schedule')
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [selectedWeek, setSelectedWeek] = useState('')
  const [blockInput, setBlockInput] = useState(false)
  const [statsVisible, setStatsVisible] = useState(true)
  const isMobile = useIsMobile()
  const dayRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})

  useEffect(() => {
    if (!selectedEmployee) return
    setUserPreferences(selectedEmployee.userPreferences || { preferredShifts: [], avoidedShifts: [], notes: '' })
    const fetchDailyPrefs = async () => {
      const { data, error } = await supabase
        .from('employee_daily_preferences')
        .select('*')
        .eq('employee_id', selectedEmployee.id)
        .gte('date', new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).toISOString().slice(0, 10))
        .lte('date', new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).toISOString().slice(0, 10))
        .order('date', { ascending: true })
      if (!error && data) {
        const map: Record<string, DayPreferences> = {}
        data.forEach(row => {
          const r = row as any
          map[row.date] = {
            morning: { choice: r.morning_choice as ShiftChoice },
            afternoon: { choice: r.afternoon_choice as ShiftChoice },
            night: { choice: r.night_choice as ShiftChoice },
            morning2: { choice: (r.morning2_choice as ShiftChoice) ?? '' },
            yavne1: { choice: (r.yavne1_choice as ShiftChoice) ?? '' },
            yavne2: { choice: (r.yavne2_choice as ShiftChoice) ?? '' },
            patrolAfternoon: { choice: (r.patrolAfternoon_choice as ShiftChoice) ?? '' },
            visitorsCenter: { choice: (r.visitorsCenter_choice as ShiftChoice) ?? '' },
            dayNote: row.day_note || '',
            isMilitary: row.is_military || false
          }
        })
        setPreferences(map)
      }
    }
    fetchDailyPrefs()
  }, [selectedEmployee, currentMonth])

  useEffect(() => {
    const weeks = getMonthWeeks(currentMonth)
    setSelectedWeek(weeks[0]?.weekStart || '')
  }, [currentMonth])

  useEffect(() => {
    const handleScroll = () => {
      const viewportCenter = window.scrollY + window.innerHeight / 2
      let minDist = Infinity
      let closestKey: string | null = null
      Object.entries(dayRefs.current).forEach(([key, el]) => {
        if (el) {
          const rect = el.getBoundingClientRect()
          const elementCenter = rect.top + window.scrollY + rect.height / 2
          const dist = Math.abs(viewportCenter - elementCenter)
          if (dist < minDist) {
            minDist = dist
            closestKey = key
          }
        }
      })
      if (closestKey) {
        const weekKey = getWeekKeyOfDate(closestKey, currentMonth)
        if (weekKey !== selectedWeek) {
          setStatsVisible(false)
          setTimeout(() => {
            setSelectedWeek(weekKey)
            setStatsVisible(true)
          }, 100)
        }
      }
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    setTimeout(handleScroll, 150)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [preferences, currentMonth, selectedWeek])

  const upsertDay = async (dateKey: string, dp: DayPreferences) => {
    if (!selectedEmployee) return
    const row = {
      employee_id: selectedEmployee.id,
      date: dateKey,
      morning_choice: dp.morning.choice,
      afternoon_choice: dp.afternoon.choice,
      night_choice: dp.night.choice,
      morning2_choice: dp.morning2.choice ?? '',
      yavne1_choice: dp.yavne1.choice ?? '',
      yavne2_choice: dp.yavne2.choice ?? '',
      patrolAfternoon_choice: dp.patrolAfternoon.choice ?? '',
      visitorsCenter_choice: dp.visitorsCenter.choice ?? '',
      day_note: dp.dayNote ?? null,
      is_military: dp.isMilitary || false,
      updated_at: new Date().toISOString()
    }
    const { error } = await supabase
      .from('employee_daily_preferences')
      .upsert([row], { onConflict: 'employee_id,date' })
    if (error) console.error('שגיאה בשמירת העדפת יום:', error)
  }

  const validateAndSave = async (newPrefs: Record<string, DayPreferences>) => {
    setPreferences(newPrefs)
    onUpdateEmployee({ ...selectedEmployee!, preferences: newPrefs, userPreferences })
    try {
      await Promise.all(
        Object.entries(newPrefs).map(([dateKey, dp]) => upsertDay(dateKey, dp))
      )
      toast({
        title: 'נשמר בהצלחה ✅',
        description: 'העדפות השיבוץ עודכנו.',
        variant: 'default'
      })
    } catch {
      toast({
        title: 'שגיאה',
        description: 'אירעה שגיאה בשמירת ההעדפות, נסה שוב.',
        variant: 'destructive'
      })
    }
  }

  const updateShift = (dateKey: string, shift: ShiftKey, choice: ShiftChoice) => {
    if (blockInput) return
    undoManager.saveState({ action: `${shift} ב־${dateKey}`, ...preferences })
    const next = { ...preferences }
    if (!next[dateKey]) next[dateKey] = createEmptyDayPreferences()
    const currentChoice = next[dateKey][shift].choice
    next[dateKey][shift] = { choice: currentChoice === choice ? '' : choice }
    validateAndSave(next)
  }

  const blockAllShifts = (dateKey: string) => {
    if (blockInput) return
    undoManager.saveState({ action: `חסום הכל ב־${dateKey}`, ...preferences })
    const next = { ...preferences }
    if (!next[dateKey]) next[dateKey] = createEmptyDayPreferences()
    ['morning', 'afternoon', 'night'].forEach(s => {
      (next[dateKey] as any)[s] = { choice: 'x' }
    })
    validateAndSave(next)
  }

  const clearAllShifts = (dateKey: string) => {
    if (blockInput) return
    undoManager.saveState({ action: `נקה הכל ב־${dateKey}`, ...preferences })
    const next = { ...preferences }
    if (!next[dateKey]) next[dateKey] = createEmptyDayPreferences()
    ['morning', 'afternoon', 'night'].forEach(s => {
      (next[dateKey] as any)[s] = { choice: '' }
    })
    validateAndSave(next)
  }

  const clearAllMonth = () => {
    undoManager.saveState({ action: `נקה הכל לחודש`, ...preferences })
    const next: Record<string, DayPreferences> = {}
    const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate()
    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
        .toISOString().slice(0, 10)
      next[dateKey] = createEmptyDayPreferences()
    }
    validateAndSave(next)
    toast({
      title: 'נוקה בהצלחה',
      description: 'כל ההעדפות של החודש נמחקו',
      variant: 'default'
    })
  }

  const updateNote = (dateKey: string, note: string) => {
    if (blockInput) return
    undoManager.saveState({ action: `הערה ב־${dateKey}`, ...preferences })
    const next = { ...preferences }
    if (!next[dateKey]) next[dateKey] = createEmptyDayPreferences()
    next[dateKey].dayNote = note
    validateAndSave(next)
  }

  const toggleMilitary = (dateKey: string) => {
    if (blockInput) return
    undoManager.saveState({ action: `מילואים ב־${dateKey}`, ...preferences })
    const next = setMilitaryService(preferences, dateKey)
    validateAndSave(next)
  }

  const toggleMilitaryMonth = () => {
    undoManager.saveState({ action: `מילואים לכל החודש`, ...preferences })
    const next = setMilitaryServiceForMonth(preferences, currentMonth)
    validateAndSave(next)
  }

  const copyPrev = () => {
    undoManager.saveState({ action: `העתקה מחודש קודם`, ...preferences })
    const prev = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1)
    const daysInPrev = new Date(prev.getFullYear(), prev.getMonth() + 1, 0).getDate()
    const next = { ...preferences }
    for (let d = 1; d <= daysInPrev; d++) {
      const pk = new Date(prev.getFullYear(), prev.getMonth(), d).toISOString().slice(0, 10)
      const ck = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d).toISOString().slice(0, 10)
      if (preferences[pk]) next[ck] = { ...preferences[pk] }
    }
    validateAndSave(next)
  }

  const handleUndo = () => {
    const prev = undoManager.undo()
    if (prev) validateAndSave(prev)
  }

  const handleUserPreferencesUpdate = (up: UserPreferences) => {
    setUserPreferences(up)
    onUpdateEmployee({ ...selectedEmployee!, userPreferences: up })
  }

  const renderDay = (day: Date) => {
    const key = day.toISOString().slice(0, 10)
    const dp = preferences[key] || createEmptyDayPreferences()
    return (
      <div
        key={key}
        ref={el => { dayRefs.current[key] = el }}
        data-key={key}
        className={`p-3 sm:p-4 border rounded-lg mb-3 sm:mb-4 ${
          dp.isMilitary
            ? 'bg-yellow-50 border-yellow-200'
            : isDarkMode
              ? 'bg-gray-800 border-gray-600'
              : 'bg-white border-gray-200'
        }`}>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3 gap-2">
          <div className="flex items-center gap-2">
            <span className={`font-medium text-sm sm:text-base ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {day.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric' })}
            </span>
            {dp.isMilitary && (
              <Badge className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1">
                <Shield className="h-3 w-3 mr-1" />
                מילואים
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-2 text-xs sm:text-sm">
            <Button size="sm" variant="outline" onClick={() => clearAllShifts(key)} className="h-8 px-2 sm:px-3 text-xs">
              <Eraser className="h-3 w-3 mr-1" /> נקה יום
            </Button>
            <Button size="sm" variant="outline" onClick={() => blockAllShifts(key)} className="h-8 px-2 sm:px-3 text-xs">
              <X className="h-3 w-3 mr-1" /> חסום יום
            </Button>
            <Button
              size="sm"
              variant={dp.isMilitary ? "default" : "outline"}
              onClick={() => toggleMilitary(key)}
              className={`h-8 px-2 sm:px-3 text-xs ${
                dp.isMilitary 
                  ? 'bg-yellow-500 hover:bg-yellow-600 text-white' 
                  : 'border-yellow-300 text-yellow-700 hover:bg-yellow-50'
              }`}
            >
              <Shield className="h-3 w-3 mr-1" />
              {dp.isMilitary ? 'ביטול מילואים' : 'סימון מילואים'}
            </Button>
          </div>
        </div>
        {!isMobile ? (
          <div className="flex flex-row-reverse gap-6 mb-4">
            {SHIFTS.map(shift => {
              const Icon = SHIFT_ICONS[shift]
              const curr = (dp[shift] as any).choice
              return (
                <div key={shift} className="flex flex-col items-center flex-1 min-w-[160px]">
                  <div className={`flex items-center justify-center text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                    <Icon className="h-4 w-4 ml-2" />
                    {SHIFT_TIMES[shift].label}
                    <span className="text-xs text-gray-500 ml-2">
                      ({SHIFT_TIMES[shift].start}-{SHIFT_TIMES[shift].end})
                    </span>
                  </div>
                  <div className="flex flex-row-reverse gap-2">
                    {(['#', '-', 'x', '!'] as ShiftChoice[]).map(c => (
                      <button
                        key={c}
                        disabled={dp.isMilitary}
                        onClick={() => updateShift(key, shift, c)}
                        className={`
                          h-10 w-12 rounded-lg border-2 font-bold text-base
                          transition-all duration-150 transform active:scale-95
                          disabled:opacity-50 disabled:cursor-not-allowed
                          ${curr === c ? CHOICE_COLORS[c] : CHOICE_COLORS['']}`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="space-y-4 mb-4">
            {SHIFTS.map(shift => {
              const Icon = SHIFT_ICONS[shift]
              const curr = (dp[shift] as any).choice
              return (
                <div key={shift} className="space-y-2">
                  <div className={`flex items-center text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                    <Icon className="h-4 w-4 mr-2" />
                    {SHIFT_TIMES[shift].label}
                    <span className="text-xs text-gray-500 mr-2">
                      ({SHIFT_TIMES[shift].start}-{SHIFT_TIMES[shift].end})
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {(['#', '-', 'x', '!'] as ShiftChoice[]).map(c => (
                      <button
                        key={c}
                        disabled={dp.isMilitary}
                        onClick={() => updateShift(key, shift, c)}
                        className={`
                          h-12 rounded-lg border-2 font-bold text-lg
                          transition-all duration-150 transform active:scale-95
                          disabled:opacity-50 disabled:cursor-not-allowed
                          ${curr === c ? CHOICE_COLORS[c] : CHOICE_COLORS['']}
                          min-h-[48px] touch-manipulation`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-xs text-center text-gray-500">
                    <span>מעדיף</span>
                    <span>זמין</span>
                    <span>חוסם</span>
                    <span>דחוף</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        <div className="space-y-2">
          <label className={`text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>הערה:</label>
          <Input
            placeholder="הערות ליום..."
            disabled={dp.isMilitary}
            value={dp.dayNote || ''}
            onChange={e => updateNote(key, e.target.value)}
            className={`text-sm ${isDarkMode ? 'bg-gray-700 text-white border-gray-600' : 'bg-white'}`}
          />
        </div>
      </div>
    )
  }

  // ---------------- תצוגת בחירת עובד ----------------
  if (!selectedEmployee) {
    return (
      <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="container mx-auto p-3 sm:p-8 max-w-7xl">
          <Card className={`mb-4 ${isDarkMode ? 'bg-gray-800 border-gray-600' : ''}`}>
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className={`text-lg sm:text-xl ${isDarkMode ? 'text-white' : ''}`}>
                בחר עובד
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {employees.map(emp => (
                  <Button
                    key={emp.id}
                    variant="outline"
                    onClick={() => setSelectedEmployee(emp)}
                    className="p-4 h-auto flex flex-col items-start"
                  >
                    <div className="font-semibold">{emp.name}</div>
                    <div className="text-sm text-gray-500">{emp.role}</div>
                    {emp.funnyTitle && (
                      <div className="text-xs text-gray-400">{emp.funnyTitle}</div>
                    )}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // --------------- המשך רינדור הלוח כרגיל ---------------
  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <WeeklyStatsFloating
        preferences={preferences}
        currentMonth={currentMonth}
        employeeName={selectedEmployee?.name || ''}
        selectedWeek={selectedWeek}
        onClose={() => setStatsVisible(false)}
        visible={statsVisible}
      />
      <div className="container mx-auto p-3 sm:p-8 max-w-7xl">
        <Card className={`mb-4 ${isDarkMode ? 'bg-gray-800 border-gray-600' : ''}`}>
          <CardHeader className="pb-3 sm:pb-4">
            <div className="flex flex-col space-y-3 sm:flex-row sm:justify-between sm:items-center sm:space-y-0">
              <CardTitle className={`text-lg sm:text-xl ${isDarkMode ? 'text-white' : ''}`}>
                שלום, {selectedEmployee.name}
              </CardTitle>
              <div className="flex flex-col sm:flex-row-reverse gap-2">
                <Button 
                  size="sm" 
                  variant="destructive" 
                  onClick={clearAllMonth}
                  className="h-9 flex-1 sm:flex-none"
                >
                  <Eraser className="h-4 w-4 mr-1" />
                  נקה הכל לחודש
                </Button>
                {undoManager.getLastAction() && (
                  <Button size="sm" onClick={handleUndo} className="h-9">
                    <Undo2 className="h-4 w-4 mr-1" />
                    בטל פעולה אחרונה
                  </Button>
                )}
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={toggleMilitaryMonth}
                  className="h-9 flex-1 sm:flex-none"
                >
                  <Shield className="h-4 w-4 mr-1" />
                  מילואים לחודש
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={copyPrev}
                  className="h-9 flex-1 sm:flex-none"
                >
                  <Copy className="h-4 w-4 mr-1" />
                  העתק חודש קודם
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedEmployee(null)}
                  className="h-9 flex-1 sm:flex-none"
                >
                  ← חזור לבחירת עובד
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>
        <Tabs value={activeTab} onValueChange={v => setActiveTab(v as any)} className="space-y-4">
          {isMobile && (
            <TabsList className="grid grid-cols-4 mb-4 h-10 w-full max-w-xl mx-auto">
              <TabsTrigger value="schedule" className="text-xs">שיבוץ</TabsTrigger>
              <TabsTrigger value="summary" className="text-xs">סיכום</TabsTrigger>
              <TabsTrigger value="constraints" className="text-xs">בדיקות</TabsTrigger>
              <TabsTrigger value="preferences" className="text-xs">העדפות</TabsTrigger>
            </TabsList>
          )}
          <TabsContent value="schedule" className="space-y-4">
            <h3 className={`text-lg sm:text-xl font-semibold ${isDarkMode ? 'text-white' : ''}`}>
              {currentMonth.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })}
            </h3>
            <Tabs defaultValue="first-half">
              <TabsList className="grid grid-cols-2 gap-1 sm:gap-2 mb-4 h-10">
                <TabsTrigger value="first-half" className="text-sm">1–15</TabsTrigger>
                <TabsTrigger value="second-half" className="text-sm">16–סוף</TabsTrigger>
              </TabsList>
              <TabsContent value="first-half" className="space-y-3">
                {getFirstHalf(currentMonth).map(renderDay)}
              </TabsContent>
              <TabsContent value="second-half" className="space-y-3">
                {getSecondHalf(currentMonth).map(renderDay)}
              </TabsContent>
            </Tabs>
          </TabsContent>
          <TabsContent value="summary">
            <PersonalSummary
              employee={selectedEmployee}
              currentMonth={currentMonth}
              onExportPDF={() => {}}
              onExportExcel={() => {}}
            />
          </TabsContent>
          <TabsContent value="constraints">
            <div className="p-6 text-sm text-gray-700 dark:text-gray-200">
              כאן יוצגו בקרוב בדיקות מתקדמות וסטטיסטיקות נוספות.
            </div>
          </TabsContent>
          <TabsContent value="preferences">
            <UserPreferencesForm
              preferences={userPreferences}
              onUpdatePreferences={handleUserPreferencesUpdate}
              isDarkMode={isDarkMode}
            />
          </TabsContent>
        </Tabs>
        {isMobile && (
          <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
            <div className="bg-white rounded-full shadow-lg border p-1 flex gap-1">
              <Button
                size="sm"
                variant={activeTab === 'schedule' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('schedule')}
                className="rounded-full h-10 w-10 p-0"
              >
                <Calendar className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant={activeTab === 'summary' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('summary')}
                className="rounded-full h-10 w-10 p-0"
              >
                📊
              </Button>
              <Button
                size="sm"
                variant={activeTab === 'constraints' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('constraints')}
                className="rounded-full h-10 w-10 p-0"
              >
                ✓
              </Button>
              <Button
                size="sm"
                variant={activeTab === 'preferences' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('preferences')}
                className="rounded-full h-10 w-10 p-0"
              >
                ⚙️
              </Button>
            </div>
          </div>
        )}
        {showScrollTop && (
          <Button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 h-12 w-12 rounded-full shadow-lg z-40"
            size="sm"
          >
            <ArrowUp className="h-5 w-5" />
          </Button>
        )}
      </div>
    </div>
  )
}
