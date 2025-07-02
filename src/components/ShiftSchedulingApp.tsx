
import React, { useState } from 'react';
import { Toaster } from '@/components/ui/toaster';
import LoginPage from './LoginPage';
import EmployeeDashboard from './EmployeeDashboard';
import AdminDashboard from './AdminDashboard';

type UserType = 'employee' | 'admin' | null;

const ShiftSchedulingApp: React.FC = () => {
  const [userType, setUserType] = useState<UserType>(null);
  const [employeeId, setEmployeeId] = useState<string | null>(null);

  const handleLogin = (type: 'employee' | 'admin', empId?: string) => {
    console.log('Login attempt:', { type, empId });
    setUserType(type);
    if (type === 'employee' && empId) {
      setEmployeeId(empId);
    }
  };

  const handleLogout = () => {
    console.log('Logging out...');
    setUserType(null);
    setEmployeeId(null);
  };

  // Show login page if not logged in
  if (!userType) {
    return (
      <div className="min-h-screen bg-gray-50">
        <LoginPage onLogin={handleLogin} />
        <Toaster />
      </div>
    );
  }

  // Show employee dashboard
  if (userType === 'employee' && employeeId) {
    return (
      <div className="min-h-screen bg-gray-50">
        <EmployeeDashboard employeeId={employeeId} onLogout={handleLogout} />
        <Toaster />
      </div>
    );
  }

  // Show admin dashboard
  if (userType === 'admin') {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminDashboard />
        <div className="fixed top-4 right-4 z-50">
          <button
            onClick={handleLogout}
            className="bg-white shadow-md rounded-lg px-4 py-2 text-sm hover:bg-gray-50 border"
          >
            התנתק
          </button>
        </div>
        <Toaster />
      </div>
    );
  }

  // Fallback - should not reach here
  return (
    <div className="min-h-screen bg-gray-50">
      <LoginPage onLogin={handleLogin} />
      <Toaster />
    </div>
  );
};

export default ShiftSchedulingApp;
