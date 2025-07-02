
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { Users, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface LoginPageProps {
  onLogin: (userType: 'employee' | 'admin', employeeId?: string) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [employeeCode, setEmployeeCode] = useState('');
  const [adminCode, setAdminCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const ADMIN_CODE = 'admin123';

  const handleEmployeeLogin = async () => {
    setIsLoading(true);
    
    try {
      // חיפוש עובד לפי קוד
      const { data: employee, error } = await supabase
        .from('employees')
        .select('*')
        .eq('code', employeeCode)
        .eq('active', true)
        .single();

      if (error || !employee) {
        toast({
          title: 'שגיאה',
          description: 'קוד עובד לא תקין או לא פעיל',
          variant: 'destructive'
        });
        setIsLoading(false);
        return;
      }

      toast({
        title: 'התחברות מוצלחת',
        description: `ברוך הבא ${employee.name}!`,
      });
      onLogin('employee', employee.id);
    } catch (error) {
      console.error('שגיאה בהתחברות עובד:', error);
      toast({
        title: 'שגיאה',
        description: 'אירעה שגיאה בהתחברות, נסה שוב',
        variant: 'destructive'
      });
    }
    
    setIsLoading(false);
  };

  const handleAdminLogin = async () => {
    setIsLoading(true);
    
    if (adminCode === ADMIN_CODE) {
      toast({
        title: 'התחברות מוצלחת',
        description: 'ברוך הבא למערכת הניהול!',
      });
      onLogin('admin');
    } else {
      toast({
        title: 'שגיאה',
        description: 'קוד סדרן לא תקין',
        variant: 'destructive'
      });
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl grid md:grid-cols-2 gap-6">
        {/* Employee Login */}
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Users className="h-6 w-6" />
              כניסת עובדים
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="employee-code" className="block text-sm font-medium mb-2">
                קוד עובד
              </label>
              <Input
                id="employee-code"
                type="text"
                placeholder="הכנס קוד עובד"
                value={employeeCode}
                onChange={(e) => setEmployeeCode(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleEmployeeLogin()}
                disabled={isLoading}
              />
            </div>
            <Button 
              onClick={handleEmployeeLogin}
              disabled={isLoading || !employeeCode}
              className="w-full"
            >
              {isLoading ? 'מתחבר...' : 'התחבר'}
            </Button>
            <div className="text-xs text-gray-500 text-center space-y-1">
              <div>עובדים: הכנסו את הקוד האישי שלכם</div>
              <div className="bg-blue-50 p-2 rounded">
                <strong>קודי עובדים לדוגמה:</strong><br />
                EMP001, EMP002, EMP003
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Admin Login */}
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Settings className="h-6 w-6" />
              כניסת סדרן
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="admin-code" className="block text-sm font-medium mb-2">
                קוד סדרן
              </label>
              <Input
                id="admin-code"
                type="password"
                placeholder="הכנס קוד סדרן"
                value={adminCode}
                onChange={(e) => setAdminCode(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAdminLogin()}
                disabled={isLoading}
              />
            </div>
            <Button 
              onClick={handleAdminLogin}
              disabled={isLoading || !adminCode}
              className="w-full"
              variant="secondary"
            >
              {isLoading ? 'מתחבר...' : 'התחבר'}
            </Button>
            <div className="text-xs text-gray-500 text-center space-y-1">
              <div>סדרנים: כניסה למערכת הניהול</div>
              <div className="bg-green-50 p-2 rounded">
                <strong>קוד סדרן:</strong> admin123
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
