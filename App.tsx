import React, { useState, useEffect, useCallback } from 'react';
import { User, Application, ApplicationStatus } from './types';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import UserDashboard from './components/UserDashboard';
import Sidebar from './components/Sidebar';
import UserManagement from './components/UserManagement';
import ForcePasswordChange from './components/ForcePasswordChange';
// [Supabase 修改] 引入 Supabase 客戶端
import { createClient } from '@supabase/supabase-js';

// [Supabase 修改] 初始化連結，這裡會抓取你在 Netlify 設定的環境變數
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const APP_USERS_KEY = 'datarequest_pro_users_v2';
const APP_APPS_KEY = 'datarequest_pro_apps_v2';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('currentUser');
    return saved ? JSON.parse(saved) : null;
  });

  const [currentView, setCurrentView] = useState<'dashboard' | 'userManagement'>('dashboard');
  const [applications, setApplications] = useState<Application[]>([]); // 改為空陣列，改由 useEffect 抓取

  // [Supabase 修改] 初始化用戶資料庫 (維持 LocalStorage 模擬，或未來可同步至 Supabase)
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
      { loginId: 'user1', username: '王小明', role: 'User', email: 's112001001@university.edu.tw', studentId: '112001001', department: '資訊管理學系', program: '小教', password: 'user123', isFirstLogin: false },
    ];
  });

  // [Supabase 修改] 當網頁開啟時，自動從 Supabase 抓取所有申請資料
  useEffect(() => {
    const fetchFromSupabase = async () => {
      const { data, error } = await supabase
        .from('requests') // 這是你在 Supabase 建立的資料表名稱
        .select('*')
        .order('id', { ascending: false });

      if (error) {
        console.error("抓取資料失敗:", error.message);
      } else if (data) {
        // 將資料庫欄位轉換回前端格式
        const formatted = data.map(item => ({
          id: item.id.toString(),
          username: item.applicant_name,
          department: item.department,
          reason: item.reason,
          status: item.status as ApplicationStatus,
          createdAt: new Date(item.created_at).toLocaleString('zh-TW', { hour12: false }),
        }));
        setApplications(formatted);
      }
    };
    fetchFromSupabase();
  }, []);

  const saveUsersToLocal = useCallback((users: User[]) => {
    localStorage.setItem(APP_USERS_KEY, JSON.stringify(users));
  }, []);

  useEffect(() => {
    saveUsersToLocal(allUsers);
  }, [allUsers, saveUsersToLocal]);

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
    setAllUsers(prev => prev.map(u => u.loginId === updatedUser.loginId ? { ...u, ...updatedUser } : u));
    if (currentUser && currentUser.loginId === updatedUser.loginId) {
      const mergedUser = { ...currentUser, ...updatedUser };
      setCurrentUser(mergedUser);
      localStorage.setItem('currentUser', JSON.stringify(mergedUser));
    }
  };

  // [Supabase 修改] 提交新申請，同步寫入雲端
  const addApplication = async (appData: Omit<Application, 'id' | 'status' | 'createdAt'>) => {
    const tempId = Math.random().toString(36).substr(2, 9).toUpperCase();
    
    // 準備寫入 Supabase 的物件 (請對應你資料表的欄位名)
    const { error } = await supabase
      .from('requests')
      .insert([{
        applicant_name: appData.username,
        department: appData.department,
        reason: appData.reason,
        status: ApplicationStatus.PENDING,
        ai_analysis: "等待分析中..."
      }]);

    if (error) {
      alert("資料上傳失敗：" + error.message);
    } else {
      // 成功後重新抓取或手動更新 UI
      window.location.reload(); // 最簡單的方式是重新整理來抓取最新雲端資料
    }
  };

  const updateApplicationStatus = async (id: string, status: ApplicationStatus) => {
    // [Supabase 修改] 管理員審核時，同步更新雲端狀態
    const { error } = await supabase
      .from('requests')
      .update({ status: status })
      .eq('id', id);

    if (!error) {
      setApplications(prev => prev.map(app => app.id === id ? { ...app, status } : app));
    }
  };

  if (!currentUser) {
    return <Login onLogin={handleLogin} users={allUsers} />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-900">
      {currentUser.isFirstLogin && (
        <ForcePasswordChange 
          user={currentUser} 
          onPasswordChanged={(newPassword) => {
            updateUserProfile({ ...currentUser, password: newPassword, isFirstLogin: false });
          }} 
        />
      )}
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
                onAddUser={(u) => setAllUsers(prev => [...prev, { ...u, isFirstLogin: true }])}
                onBatchAddUsers={(users) => setAllUsers(prev => [...prev, ...users.map(u => ({ ...u, isFirstLogin: true }))])}
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
