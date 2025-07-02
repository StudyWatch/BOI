
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Menu, Users, UserPlus, Calendar, Settings, Zap, FileSpreadsheet, BarChart3 } from 'lucide-react';

interface MobileAdminMenuProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isDarkMode: boolean;
  employeesCount: number;
}

export const MobileAdminMenu: React.FC<MobileAdminMenuProps> = ({
  activeTab,
  onTabChange,
  isDarkMode,
  employeesCount
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    { id: 'employees', label: 'עובדים', icon: Users },
    { id: 'management', label: 'ניהול עובדים', icon: UserPlus },
    { id: 'shifts', label: 'משמרות', icon: Calendar },
    { id: 'requirements', label: 'הגדרות דרישות', icon: Settings },
    { id: 'schedule', label: 'מחולל סידור', icon: Zap },
    { id: 'schedule-view', label: 'תצוגת סידור', icon: Calendar },
    { id: 'reports', label: 'דוחות', icon: FileSpreadsheet }
  ];

  const handleTabSelect = (tabId: string) => {
    onTabChange(tabId);
    setIsOpen(false);
  };

  return (
    <div className="block sm:hidden">
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <Menu className="h-4 w-4" />
            <span className="text-sm">תפריט</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className={`w-64 ${isDarkMode ? 'bg-gray-800 text-white' : ''}`}>
          <SheetHeader>
            <SheetTitle className={`text-right ${isDarkMode ? 'text-white' : ''}`}>
              לוח ניהול - פאנל סדרן
            </SheetTitle>
            <div className="text-sm text-gray-500 text-right">
              עובדים פעילים: {employeesCount}
            </div>
          </SheetHeader>
          
          <div className="mt-6 space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              
              return (
                <Button
                  key={item.id}
                  variant={isActive ? "default" : "ghost"}
                  className={`w-full justify-start text-right ${
                    isActive 
                      ? 'bg-blue-600 text-white' 
                      : isDarkMode 
                        ? 'text-gray-200 hover:bg-gray-700' 
                        : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  onClick={() => handleTabSelect(item.id)}
                >
                  <div className="flex items-center gap-2 w-full justify-end">
                    <span className="text-sm">{item.label}</span>
                    <Icon className="h-4 w-4" />
                  </div>
                </Button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};
