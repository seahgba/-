
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { User, ProgramType, Application, ApplicationStatus } from '../types';

interface SidebarProps {
  user: User;
  onLogout: () => void;
  onUpdateUser: (user: User) => void;
  currentView: 'dashboard' | 'userManagement';
  onViewChange: (view: 'dashboard' | 'userManagement') => void;
  applications: Application[];
}

const Sidebar: React.FC<SidebarProps> = ({ user, onLogout, onUpdateUser, currentView, onViewChange, applications }) => {
  const [showProfile, setShowProfile] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedUser, setEditedUser] = useState<User>(user);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const programOptions: ProgramType[] = ['小教', '中教', '幼教', '中小合流'];

  useEffect(() => {
    setEditedUser(user);
  }, [user, showProfile]);

  // 計算分類學分統計
  const creditStats = useMemo(() => {
    const userApps = applications.filter(a => a.username === user.username);
    
    const getStatsFor = (apps: Application[]) => ({
      approved: apps.filter(a => a.status === ApplicationStatus.APPROVED).reduce((sum, a) => sum + (Number(a.waiverCredits) || 0), 0),
      pending: apps.filter(a => a.status === ApplicationStatus.PENDING).reduce((sum, a) => sum + (Number(a.waiverCredits) || 0), 0),
      rejected: apps.filter(a => a.status === ApplicationStatus.REJECTED).reduce((sum, a) => sum + (Number(a.waiverCredits) || 0), 0),
    });

    const profApps = userApps.filter(a => a.courseCategory === '專業');
    const specApps = userApps.filter(a => a.courseCategory === '專門' || !a.courseCategory);

    return {
      professional: getStatsFor(profApps),
      specialized: getStatsFor(specApps),
      total: getStatsFor(userApps)
    };
  }, [applications, user.username]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("圖片檔案過大，請選擇 5MB 以下的圖片以利儲存");
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setEditedUser(prev => ({ ...prev, profileImage: event.target?.result as string }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditedUser(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    onUpdateUser(editedUser);
    setIsEditing(false);
  };

  const handleClose = () => {
    setShowProfile(false);
    setIsEditing(false);
    setEditedUser(user);
  };

  const isAdmin = user.role === 'Admin';

  return (
    <>
      <aside className="w-64 bg-slate-800 border-r border-slate-700 hidden md:flex flex-col text-white">
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white font-black text-xl shadow-lg">D</div>
            <span className="text-xl font-black tracking-tighter text-white">課程抵免系統</span>
          </div>
        </div>
        
        <div className="flex-1 p-4 flex flex-col space-y-4 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600">
          <section>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2 py-2 mb-1">主選單</div>
            <nav className="space-y-1">
              <button 
                onClick={() => onViewChange('dashboard')}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl font-bold transition-all ${currentView === 'dashboard' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span>儀表板主頁</span>
              </button>

              {isAdmin && (
                <button 
                  onClick={() => onViewChange('userManagement')}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl font-bold transition-all ${currentView === 'userManagement' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <span>帳號管理</span>
                </button>
              )}
            </nav>
          </section>

          {!isAdmin && (
            <section className="animate-in fade-in slide-in-from-left-4 duration-700 delay-150 space-y-4">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2 py-1">學分抵免統計</div>
              
              {/* 專業統計區塊 */}
              <div className="bg-slate-900/50 rounded-2xl p-4 border border-slate-700/50 space-y-2">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                  <span className="text-xs font-black text-indigo-400 uppercase tracking-widest">抵免專業統計</span>
                </div>
                <div className="flex justify-between items-center px-1">
                  <span className="text-[10px] font-bold text-slate-400">已通過</span>
                  <span className="text-xs font-black text-emerald-400">{creditStats.professional.approved} <span className="text-[9px] opacity-60">分</span></span>
                </div>
                <div className="flex justify-between items-center px-1">
                  <span className="text-[10px] font-bold text-slate-400">審核中</span>
                  <span className="text-xs font-black text-amber-400">{creditStats.professional.pending} <span className="text-[9px] opacity-60">分</span></span>
                </div>
                <div className="flex justify-between items-center px-1">
                  <span className="text-[10px] font-bold text-slate-400">已駁回</span>
                  <span className="text-xs font-black text-rose-400">{creditStats.professional.rejected} <span className="text-[9px] opacity-60">分</span></span>
                </div>
              </div>

              {/* 專門統計區塊 */}
              <div className="bg-slate-900/50 rounded-2xl p-4 border border-slate-700/50 space-y-2">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>
                  <span className="text-xs font-black text-purple-400 uppercase tracking-widest">抵免專門統計</span>
                </div>
                <div className="flex justify-between items-center px-1">
                  <span className="text-[10px] font-bold text-slate-400">已通過</span>
                  <span className="text-xs font-black text-emerald-400">{creditStats.specialized.approved} <span className="text-[9px] opacity-60">分</span></span>
                </div>
                <div className="flex justify-between items-center px-1">
                  <span className="text-[10px] font-bold text-slate-400">審核中</span>
                  <span className="text-xs font-black text-amber-400">{creditStats.specialized.pending} <span className="text-[9px] opacity-60">分</span></span>
                </div>
                <div className="flex justify-between items-center px-1">
                  <span className="text-[10px] font-bold text-slate-400">已駁回</span>
                  <span className="text-xs font-black text-rose-400">{creditStats.specialized.rejected} <span className="text-[9px] opacity-60">分</span></span>
                </div>
              </div>

              {/* 總計進度 */}
              <div className="px-2 pt-2 border-t border-slate-700/50">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-black text-slate-500 uppercase">已通過總進度</span>
                  <span className="text-xs font-black text-white">{creditStats.total.approved} <span className="text-[9px] opacity-60">分</span></span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-indigo-500 h-full transition-all duration-1000 ease-out" 
                    style={{ width: `${Math.min(100, (creditStats.total.approved / (creditStats.total.approved + creditStats.total.pending + 0.1)) * 100)}%` }}
                  ></div>
                </div>
              </div>
            </section>
          )}
        </div>

        <div className="p-4 border-t border-slate-700">
          <button
            onClick={() => setShowProfile(true)}
            className="w-full flex items-center space-x-3 px-3 py-4 mb-2 hover:bg-slate-700 rounded-xl transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-full bg-slate-600 flex items-center justify-center font-black text-white border border-slate-500 uppercase shrink-0 overflow-hidden shadow-inner">
              {user.profileImage ? (
                <img src={user.profileImage} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                user.username.charAt(0)
              )}
            </div>
            <div className="flex flex-col truncate">
              <span className="text-sm font-black text-white">{user.username}</span>
              <span className="text-[10px] text-indigo-400 font-black uppercase tracking-tighter group-hover:underline">管理個人資料</span>
            </div>
          </button>
          
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 text-xs font-black text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all border border-transparent hover:border-rose-500/20"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>登出系統</span>
          </button>
        </div>
      </aside>

      {/* 個人資料彈出視窗 */}
      {showProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 h-24 relative shrink-0">
              <button 
                onClick={handleClose}
                className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors p-1"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="px-8 pb-10 -mt-12 flex flex-col items-center text-center overflow-y-auto max-h-[85vh]">
              <div className="relative group shrink-0">
                <div className="w-24 h-24 rounded-3xl bg-white shadow-xl flex items-center justify-center text-indigo-600 text-3xl font-black border-4 border-white mb-4 overflow-hidden">
                  {editedUser.profileImage ? (
                    <img src={editedUser.profileImage} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    editedUser.username.charAt(0)
                  )}
                </div>
                {isEditing && (
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 w-24 h-24 rounded-3xl bg-black/50 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity mb-4"
                  >
                    <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    </svg>
                    <span className="text-[10px] font-black">上傳照片</span>
                  </button>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleFileChange} 
                />
              </div>
              
              <h3 className="text-2xl font-black text-slate-900">{user.username}</h3>
              <span className={`mt-1 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${user.role === 'Admin' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>
                {user.role === 'Admin' ? '管理人員' : '學生'}
              </span>

              <div className="w-full mt-6 space-y-4 text-left border-t border-slate-50 pt-6">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">使用者名稱</span>
                  {isEditing && isAdmin ? (
                    <input
                      name="username"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={editedUser.username}
                      onChange={handleInputChange}
                    />
                  ) : (
                    <p className="text-slate-800 font-black">{user.username}</p>
                  )}
                </div>

                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">電子郵件</span>
                  {isEditing ? (
                    <input
                      name="email"
                      type="email"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={editedUser.email || ''}
                      onChange={handleInputChange}
                    />
                  ) : (
                    <p className="text-slate-800 font-black truncate">{user.email || '未設定'}</p>
                  )}
                </div>

                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">學號</span>
                  {isEditing && isAdmin ? (
                    <input
                      name="studentId"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={editedUser.studentId || ''}
                      onChange={handleInputChange}
                    />
                  ) : (
                    <p className="text-slate-800 font-black">{user.studentId || '未設定'}</p>
                  )}
                </div>
                
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">所屬系所</span>
                  {isEditing && isAdmin ? (
                    <input
                      name="department"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={editedUser.department || ''}
                      onChange={handleInputChange}
                    />
                  ) : (
                    <p className="text-slate-800 font-black">{user.department || '未設定'}</p>
                  )}
                </div>

                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">修習學程</span>
                  {isEditing && isAdmin ? (
                    <select
                      name="program"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
                      value={editedUser.program || ''}
                      onChange={handleInputChange}
                    >
                      <option value="" disabled>請選擇學程</option>
                      {programOptions.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-slate-800 font-black">{user.program || '尚未設定'}</p>
                  )}
                </div>
              </div>

              {!isAdmin && isEditing && (
                <p className="mt-4 text-[10px] text-amber-600 font-black">提示：一般學生僅限修改個人照片與郵件，其餘資料請洽管理員。</p>
              )}

              <div className="mt-8 w-full flex space-x-2 shrink-0">
                {isEditing ? (
                  <>
                    <button 
                      onClick={handleSave}
                      className="flex-1 bg-indigo-600 text-white py-3 rounded-2xl font-black hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-100"
                    >
                      儲存變更
                    </button>
                    <button 
                      onClick={() => { setIsEditing(false); setEditedUser(user); }}
                      className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-2xl font-black hover:bg-slate-200 transition-all active:scale-95"
                    >
                      取消
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      onClick={() => setIsEditing(true)}
                      className="flex-1 bg-indigo-600 text-white py-3 rounded-2xl font-black hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-100"
                    >
                      編輯資料
                    </button>
                    <button 
                      onClick={handleClose}
                      className="flex-1 bg-slate-900 text-white py-3 rounded-2xl font-black hover:bg-black transition-all active:scale-95 shadow-lg"
                    >
                      關閉
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
