import React, { useState, useEffect, useCallback } from 'react';
import { User, Application, ApplicationStatus } from './types';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import UserDashboard from './components/UserDashboard';
import Sidebar from './components/Sidebar';
import UserManagement from './components/UserManagement';
import ForcePasswordChange from './components/ForcePasswordChange';
import { createClient } from '@supabase/supabase-js';

// 初始化 Supabase
const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const APP_USERS_KEY = 'datarequest_pro_users_v2';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('currentUser');
    return saved ? JSON.parse(saved) : null;
  });

  const [currentView, setCurrentView] = useState<'dashboard' | 'userManagement'>('dashboard');
  const [applications, setApplications] = useState<Application[]>([]);

  const [allUsers, setAllUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem(APP_USERS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) { console.error("載入使用者資料失敗", e); }
    return [
      { loginId: 'admin', username: '管理員', role: 'Admin', email: 'admin@university.edu.tw', studentId: 'AD-001', department: '資訊管理處', program: '中教', password: 'admin123', isFirstLogin: false },
      { loginId: 'user1', username: '王小明', role: 'User', email: 's112001001@university.edu.tw', studentId: '112001001', department: '資訊管理學系', program: '小教', password: 'user123', isFirstLogin: false }
    ];
  });

  // 從 Supabase 抓取資料
  const fetchFromSupabase = useCallback(async () => {
    const { data, error } = await supabase
      .from('requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      const formatted = data.map((item: any) => ({
        id: item.id.toString(),
        username: item.applicant_name,
        department: item.department,
        reason: item.reason,
        status: item.status as ApplicationStatus,
        createdAt: new Date(item.created_at).toLocaleString('zh-TW', { hour12: false }),
        program: item.program || '',
        email: item.email || '',
        studentId: item.student_id || ''
      }));
      setApplications(formatted);
    }
  }, []);

  useEffect(() => {
    fetchFromSupabase();
  }, [fetchFromSupabase]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('currentUser', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentView('dashboard');
    localStorage.removeItem('currentUser');
  };

  const updateUserProfile = (updatedUser: User) => {
    setAllUsers(prev => {
      const next = prev.map(u => u.loginId === updatedUser.loginId ? { ...u, ...updatedUser } : u);
      localStorage.setItem(APP_USERS_KEY, JSON.stringify(next));
      return next;
    });
  };

  const addApplication = async (appData: any) => {
    const { error } = await supabase
      .from('requests')
      .insert([{
        applicant_name: currentUser?.username || appData.username,
        department: appData.department,
        reason: appData.reason,
        status: 'pending',
        program: appData.program,
        student_id: appData.studentId,
        email: appData.email
      }]);

    if (error) {
      alert("儲存失敗: " + error.message);
    } else {
      fetchFromSupabase();
    }
  };

  const updateApplicationStatus = async (id: string, status: ApplicationStatus) => {
    const { error } = await supabase
      .from('requests')
      .update({ status: status })
      .eq('id', id);

    if (!error) {
      fetchFromSupabase();
    }
  };

  if (!currentUser) {
    return <Login onLogin={handleLogin} users={allUsers} />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-900">
      <Sidebar 
        user={currentUser} 
        onLogout={handleLogout} 
        onUpdateUser={updateUserProfile} 
        currentView={currentView}
        onViewChange={setCurrentView}
        applications={applications}
      />
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {currentUser.role === 'Admin' ? (
            currentView === 'dashboard' ? (
              <AdminDashboard 
                applications={applications} 
                onUpdateStatus={updateApplicationStatus} 
              />
            ) : (
              <UserManagement 
                users={allUsers} 
                currentUserLoginId={currentUser.loginId}
                onUpdateUser={updateUserProfile}
                onAddUser={(u) => setAllUsers(prev => [...prev, u])}
                onBatchAddUsers={(users) => setAllUsers(prev => [...prev, ...users])}
                onDeleteUser={(id) => setAllUsers(prev => prev.filter(u => u.loginId !== id))}
              />
            )
          ) : (
            <UserDashboard 
              username={currentUser.username}
              applications={applications.filter(a => a.username === currentUser.username)}
              onSubmit={addApplication}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
