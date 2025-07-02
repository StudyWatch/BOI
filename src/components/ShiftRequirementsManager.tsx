import React, {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle
} from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { AlternativeOptionsEditor } from './AlternativeOptionsEditor';

export interface ShiftRequirement {
  shiftType: string;
  dayType: 'weekday' | 'weekend';
  requiredRoles: Record<string, number>;
  alternativeOptions: Array<{ roles: Record<string, number> }>;
}

export interface ShiftRequirementsManagerProps {
  onUpdateRequirements: (requirements: ShiftRequirement[]) => void;
}

export interface ShiftRequirementsManagerHandle {
  save: () => Promise<void>;
  reset: () => void;
}

export const ShiftRequirementsManager = forwardRef<
  ShiftRequirementsManagerHandle,
  ShiftRequirementsManagerProps
>(({ onUpdateRequirements }, ref) => {
  const [requirements, setRequirements] = useState<ShiftRequirement[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const roles = ['ahamash', 'boker', 'mavtach', 'bokrit'] as const;
  const shifts = [
    'morning',
    'afternoon',
    'night',
    'yavne1',
    'yavne2',
    'patrolAfternoon',
    'visitorsCenter'
  ] as const;

  useEffect(() => {
    loadRequirements();
  }, []);

  async function loadRequirements() {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('schedule_rules')
        .select('rule_value')
        .eq('rule_name', 'shift_requirements')
        .eq('active', true)
        .order('created_at');
      if (error) throw error;

      const parsed: ShiftRequirement[] =
        data && data.length > 0
          ? data.map(row => {
              const rv = row.rule_value as any;
              return {
                shiftType: rv.shift_type,
                dayType: rv.day_type,
                requiredRoles: rv.required_roles || {},
                alternativeOptions: rv.alternative_options || []
              };
            })
          : initializeDefaultReqs();

      setRequirements(parsed);
      onUpdateRequirements(parsed);
    } catch (err) {
      console.error('Error loading requirements:', err);
      toast({
        title: 'שגיאה בטעינה',
        description: `לא ניתן לטעון דרישות: ${
          err instanceof Error ? err.message : 'שגיאה לא ידועה'
        }`,
        variant: 'destructive'
      });
      const defs = initializeDefaultReqs();
      setRequirements(defs);
      onUpdateRequirements(defs);
    } finally {
      setIsLoading(false);
    }
  }

  function initializeDefaultReqs(): ShiftRequirement[] {
    return [
      { shiftType: 'morning', dayType: 'weekday', requiredRoles: { ahamash: 1, boker: 1, mavtach: 1 }, alternativeOptions: [] },
      { shiftType: 'afternoon', dayType: 'weekday', requiredRoles: { ahamash: 1, mavtach: 1 }, alternativeOptions: [] },
      { shiftType: 'night', dayType: 'weekday', requiredRoles: { boker: 1, mavtach: 1 }, alternativeOptions: [] },
      { shiftType: 'yavne1', dayType: 'weekday', requiredRoles: { mavtach: 1 }, alternativeOptions: [] },
      { shiftType: 'yavne2', dayType: 'weekday', requiredRoles: { mavtach: 1 }, alternativeOptions: [] },
      { shiftType: 'patrolAfternoon', dayType: 'weekday', requiredRoles: { mavtach: 1 }, alternativeOptions: [] },
      { shiftType: 'visitorsCenter', dayType: 'weekday', requiredRoles: { mavtach: 1 }, alternativeOptions: [] },
      { shiftType: 'morning', dayType: 'weekend', requiredRoles: { ahamash: 1 }, alternativeOptions: [] },
      {
        shiftType: 'afternoon',
        dayType: 'weekend',
        requiredRoles: { ahamash: 1, mavtach: 1 },
        alternativeOptions: [
          { roles: { ahamash: 1, bokrit: 1 } },
          { roles: { ahamash: 1, mavtach: 1 } }
        ]
      },
      { shiftType: 'night', dayType: 'weekend', requiredRoles: { boker: 1, mavtach: 1 }, alternativeOptions: [] },
      { shiftType: 'yavne1', dayType: 'weekend', requiredRoles: { mavtach: 1 }, alternativeOptions: [] },
      { shiftType: 'yavne2', dayType: 'weekend', requiredRoles: { mavtach: 1 }, alternativeOptions: [] },
      { shiftType: 'patrolAfternoon', dayType: 'weekend', requiredRoles: { mavtach: 1 }, alternativeOptions: [] },
      { shiftType: 'visitorsCenter', dayType: 'weekend', requiredRoles: { mavtach: 1 }, alternativeOptions: [] }
    ];
  }

  function updateRoleCount(
    shiftType: string,
    dayType: 'weekday' | 'weekend',
    role: string,
    count: number
  ) {
    const next = requirements.map(req =>
      req.shiftType === shiftType && req.dayType === dayType
        ? {
            ...req,
            requiredRoles:
              count > 0
                ? { ...req.requiredRoles, [role]: count }
                : Object.fromEntries(
                    Object.entries(req.requiredRoles).filter(([r]) => r !== role)
                  )
          }
        : req
    );
    setRequirements(next);
    onUpdateRequirements(next);
  }

  function updateAlternativeOptions(
    shiftType: string,
    dayType: 'weekday' | 'weekend',
    options: ShiftRequirement['alternativeOptions']
  ) {
    const next = requirements.map(req =>
      req.shiftType === shiftType && req.dayType === dayType
        ? { ...req, alternativeOptions: options }
        : req
    );
    setRequirements(next);
    onUpdateRequirements(next);
  }

  async function save() {
    if (isSaving) return;
    setIsSaving(true);
    try {
      // First – נמחק את כל הקיימות
      await supabase
        .from('schedule_rules')
        .delete()
        .eq('rule_name', 'shift_requirements');
      // ואז נוסיף את הנוכחיות
      const payload = requirements.map(req => ({
        rule_name: 'shift_requirements',
        rule_value: {
          shift_type: req.shiftType,
          day_type: req.dayType,
          required_roles: req.requiredRoles,
          alternative_options: req.alternativeOptions
        },
        active: true,
        updated_at: new Date().toISOString()
      }));
      const { error } = await supabase
        .from('schedule_rules')
        .insert(payload);
      if (error) throw error;
      toast({
        title: 'נשמר בהצלחה',
        description: `נשמרו ${requirements.length} דרישות משמרות`
      });
    } catch (err) {
      console.error('Error saving requirements:', err);
      toast({
        title: 'שגיאה בשמירה',
        description: `${err instanceof Error ? err.message : 'שגיאה לא ידועה'}`,
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  }

  function reset() {
    const defs = initializeDefaultReqs();
    setRequirements(defs);
    onUpdateRequirements(defs);
    toast({
      title: 'איפוס לברירת מחדל',
      description: 'הדרישות אופסו. זכור לשמור!'
    });
  }

  useImperativeHandle(ref, () => ({ save, reset }), [requirements]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <div className="animate-spin h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
          <div>טוען דרישות משמרות...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>הגדרת דרישות תפקידים למשמרות</span>
          <div className="space-x-2">
            <Button variant="outline" size="sm" onClick={reset} disabled={isSaving}>
              אפס
            </Button>
            <Button size="sm" onClick={save} disabled={isSaving}>
              {isSaving ? 'שומר...' : 'שמור'}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="weekday">
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="weekday">ימי חול</TabsTrigger>
            <TabsTrigger value="weekend">שישי-שבת</TabsTrigger>
          </TabsList>

          {(['weekday', 'weekend'] as const).map(dayType => (
            <TabsContent key={dayType} value={dayType} className="space-y-4">
              {shifts.map(shift => {
                const req = requirements.find(
                  r => r.shiftType === shift && r.dayType === dayType
                )!;
                return (
                  <Card key={`${dayType}-${shift}`} className="border-gray-200">
                    <CardHeader>
                      <CardTitle>
                        {/* אפשר להחליף לתווית מפורשת */}
                        {shift}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label>דרישות בסיסיות:</Label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                          {roles.map(role => (
                            <div key={role}>
                              <Label className="text-xs">{role}</Label>
                              <Input
                                type="number"
                                min={0}
                                max={10}
                                value={req.requiredRoles[role] || 0}
                                onChange={e =>
                                  updateRoleCount(
                                    shift,
                                    dayType,
                                    role,
                                    parseInt(e.target.value) || 0
                                  )
                                }
                                className="h-8 text-sm"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                      <AlternativeOptionsEditor
                        shiftType={shift}
                        dayType={dayType}
                        options={req.alternativeOptions}
                        onUpdateOptions={opts =>
                          updateAlternativeOptions(shift, dayType, opts)
                        }
                      />
                    </CardContent>
                  </Card>
                );
              })}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
});
