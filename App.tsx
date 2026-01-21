
import React, { useState, useEffect, useCallback } from 'react';
import { User, Application, ApplicationStatus } from './types';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import UserDashboard from './components/UserDashboard';
import Sidebar from './components/Sidebar';
import UserManagement from './components/UserManagement';
import ForcePasswordChange from './components/ForcePasswordChange';

const APP_USERS_KEY = 'datarequest_pro_users_v2';
const APP_APPS_KEY = 'datarequest_pro_apps_v2';

const App: React.FC = () => {
  // 初始化目前登入用戶
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('currentUser');
    return saved ? JSON.parse(saved) : null;
  });

  const [currentView, setCurrentView] = useState<'dashboard' | 'userManagement'>('dashboard');

  // 初始化申請資料
  const [applications, setApplications] = useState<Application[]>(() => {
    try {
      const saved = localStorage.getItem(APP_APPS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("載入申請資料失敗", e);
      return [];
    }
  });

  // 初始化用戶資料庫
  const [allUsers, setAllUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem(APP_USERS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error("載入使用者資料失敗", e);
    }
    
    // 預設帳號 - 加入 isFirstLogin: false 避免現有預設帳號也被鎖定
    return [
      { loginId: 'admin', username: '管理員', role: 'Admin', email: 'admin@university.edu.tw', studentId: 'AD-001', department: '資訊管理處', program: '中教', password: 'admin123', isFirstLogin: false },
      { loginId: 'user1', username: '王小明', role: 'User', email: 's112001001@university.edu.tw', studentId: '112001001', department: '資訊管理學系', program: '小教', password: 'user123', isFirstLogin: false },
      { loginId: 'user2', username: '李大華', role: 'User', email: 's112001002@university.edu.tw', studentId: '112001002', department: '電腦科學系', program: '幼教', password: 'user123', isFirstLogin: false }
    ];
  });

  // 封裝儲存邏輯
  const saveUsersToLocal = useCallback((users: User[]) => {
    localStorage.setItem(APP_USERS_KEY, JSON.stringify(users));
  }, []);

  // 當 applications 變動時存入 localStorage
  useEffect(() => {
    localStorage.setItem(APP_APPS_KEY, JSON.stringify(applications));
  }, [applications]);

  // 當 allUsers 變動時自動同步
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
    setAllUsers(prev => {
      const next = prev.map(u => u.loginId === updatedUser.loginId ? { ...u, ...updatedUser } : u);
      saveUsersToLocal(next); 
      return next;
    });

    if (currentUser && currentUser.loginId === updatedUser.loginId) {
      const mergedUser = { ...currentUser, ...updatedUser };
      setCurrentUser(mergedUser);
      localStorage.setItem('currentUser', JSON.stringify(mergedUser));
    }
  };

  const addNewUser = (newUser: User) => {
    // 強制新帳號必須在首次登入時改密碼
    const userWithFlag = { ...newUser, isFirstLogin: true };
    setAllUsers(prev => {
      const next = [...prev, userWithFlag];
      saveUsersToLocal(next);
      return next;
    });
  };

  const handleBatchAddUsers = (newUsers: User[]) => {
    // 批量匯入的帳號也全部設為首次登入
    const usersWithFlag = newUsers.map(u => ({ ...u, isFirstLogin: true }));
    setAllUsers(prev => {
      const next = [...prev, ...usersWithFlag];
      saveUsersToLocal(next);
      return next;
    });
  };

  const deleteUser = (loginId: string) => {
    setAllUsers(prev => {
      const next = prev.filter(u => u.loginId !== loginId);
      saveUsersToLocal(next);
      return next;
    });
  };

  const addApplication = (appData: Omit<Application, 'id' | 'status' | 'createdAt'>) => {
    const newApp: Application = {
      ...appData,
      id: Math.random().toString(36).substr(2, 9).toUpperCase(),
      status: ApplicationStatus.PENDING,
      createdAt: new Date().toLocaleString('zh-TW', { hour12: false }),
    };
    setApplications(prev => [newApp, ...prev]);
  };

  const updateApplicationStatus = (id: string, status: ApplicationStatus) => {
    setApplications(prev => 
      prev.map(app => app.id === id ? { ...app, status } : app)
    );
  };

  if (!currentUser) {
    return <Login onLogin={handleLogin} users={allUsers} />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-900">
      {/* 如果是首次登入，顯示強制改密碼遮罩，此時 Sidebar 與內容會被蓋住 */}
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
                onAddUser={addNewUser}
                onBatchAddUsers={handleBatchAddUsers}
                onDeleteUser={deleteUser}
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
