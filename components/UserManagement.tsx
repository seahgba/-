
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User, ProgramType, Role } from '../types';
import * as XLSX from 'xlsx';

interface UserManagementProps {
  users: User[];
  currentUserLoginId: string;
  onUpdateUser: (updatedUser: User) => void;
  onAddUser: (newUser: User) => void;
  onBatchAddUsers: (newUsers: User[]) => void;
  onDeleteUser: (loginId: string) => void;
}

// 通用確認視窗組件
const ConfirmModal: React.FC<{ 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: () => void;
  title: string;
  message: string;
  type?: 'primary' | 'danger';
}> = ({ isOpen, onClose, onConfirm, title, message, type = 'primary' }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200 p-8 text-center">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${type === 'danger' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 17c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
        <p className="text-slate-500 text-sm mb-8 leading-relaxed">{message}</p>
        <div className="flex space-x-3">
          <button 
            onClick={onConfirm}
            className={`flex-1 text-white py-3 rounded-2xl font-bold transition-all active:scale-95 shadow-lg ${type === 'danger' ? 'bg-red-600 hover:bg-red-700 shadow-red-100' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100'}`}
          >
            確定{type === 'danger' ? '刪除' : '修改'}
          </button>
          <button 
            onClick={onClose}
            className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-2xl font-bold hover:bg-slate-200 transition-all active:scale-95"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
};

// 批量匯入彈窗組件
const BatchImportModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onImport: (newUsers: User[]) => void;
  existingLoginIds: string[];
}> = ({ isOpen, onClose, onImport, existingLoginIds }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        '帳號ID': 'student123',
        '姓名': '王小明',
        '密碼': 'pwd123',
        '電子郵件': 'student123@university.edu.tw',
        '學號': '11200001',
        '系所': '資管系',
        '學程': '小教',
        '權限': 'User'
      }
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "帳號匯入範本");
    XLSX.writeFile(wb, "帳號批量匯入範本.xlsx");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleProcessImport = () => {
    if (!file) {
      setError("請先選擇 Excel 檔案");
      return;
    }

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

        if (jsonData.length === 0) {
          setError("檔案內容為空");
          setIsProcessing(false);
          return;
        }

        const newUsers: User[] = [];
        let duplicateCount = 0;
        let missingFieldCount = 0;

        jsonData.forEach((row) => {
          const loginId = String(row['帳號ID'] || '').trim();
          const username = String(row['姓名'] || '').trim();
          const password = String(row['密碼'] || '').trim();
          const email = String(row['電子郵件'] || '').trim();

          if (!loginId || !username || !password || !email) {
            missingFieldCount++;
            return;
          }

          if (existingLoginIds.includes(loginId.toLowerCase())) {
            duplicateCount++;
            return;
          }

          newUsers.push({
            loginId,
            username,
            password,
            email,
            studentId: String(row['學號'] || '').trim(),
            department: String(row['系所'] || '').trim(),
            program: (row['學程'] || '') as ProgramType,
            role: (row['權限'] === 'Admin' ? 'Admin' : 'User') as Role,
            isFirstLogin: true, 
          });
        });

        if (newUsers.length === 0) {
          setError(`未匯入任何帳號。原因：${duplicateCount} 個重複，${missingFieldCount} 個欄位不完全。`);
        } else {
          onImport(newUsers);
          alert(`成功匯入 ${newUsers.length} 個帳號！\n(跳過：${duplicateCount} 個重複，${missingFieldCount} 個不完全)`);
          onClose();
        }
      } catch (err) {
        console.error(err);
        setError("解析 Excel 失敗，請確保檔案格式正確。");
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-8 pb-4 border-b border-slate-50 flex justify-between items-center">
          <div>
            <h3 className="text-2xl font-black text-slate-900">批量匯入帳號</h3>
            <p className="text-slate-400 text-sm font-medium">使用 Excel 檔案一次新增多個用戶</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-8 space-y-6">
          <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
            <p className="text-xs text-indigo-700 font-bold mb-3 leading-relaxed">
              請確保 Excel 欄位名稱正確：<br/>
              <span className="bg-white/50 px-1 rounded">帳號ID</span>、
              <span className="bg-white/50 px-1 rounded">姓名</span>、
              <span className="bg-white/50 px-1 rounded">密碼</span>、
              <span className="bg-white/50 px-1 rounded">電子郵件</span>
            </p>
            <button 
              onClick={handleDownloadTemplate}
              className="text-xs font-black text-indigo-600 hover:underline flex items-center space-x-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              <span>下載 Excel 範例檔</span>
            </button>
          </div>

          <div 
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-3xl p-10 text-center cursor-pointer transition-all ${file ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-indigo-400 bg-slate-50'}`}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".xlsx,.xls" 
              onChange={handleFileChange} 
            />
            <div className="flex flex-col items-center">
              <svg className={`w-12 h-12 mb-2 ${file ? 'text-emerald-500' : 'text-slate-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm font-black text-slate-700">{file ? file.name : '點擊選取 Excel 檔案'}</p>
              {!file && <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-widest">支援 .xlsx, .xls</p>}
            </div>
          </div>

          {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-bold border border-red-100">{error}</div>}

          <div className="flex space-x-3">
            <button
              onClick={handleProcessImport}
              disabled={!file || isProcessing}
              className="flex-1 bg-slate-900 text-white py-4 rounded-3xl font-black hover:bg-black transition-all shadow-xl disabled:bg-slate-300 active:scale-95"
            >
              {isProcessing ? '處理中...' : '開始匯入帳號'}
            </button>
            <button
              onClick={onClose}
              className="px-8 bg-slate-100 text-slate-500 py-4 rounded-3xl font-black hover:bg-slate-200 transition-all"
            >
              取消
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// 新增單一用戶彈窗組件
const AddUserModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onAdd: (newUser: User) => void;
  existingLoginIds: string[];
}> = ({ isOpen, onClose, onAdd, existingLoginIds }) => {
  const initialState: User = {
    loginId: '',
    username: '',
    email: '',
    password: '',
    role: 'User',
    studentId: '',
    department: '',
    program: '',
    isFirstLogin: true, 
  };

  const [formData, setFormData] = useState<User>(initialState);
  const [error, setError] = useState('');

  // 每次開啟時重置為空白
  useEffect(() => {
    if (isOpen) {
      setFormData(initialState);
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.loginId || !formData.username || !formData.password || !formData.email) {
      setError('請填寫所有必填欄位 (*)');
      return;
    }
    if (existingLoginIds.includes(formData.loginId.toLowerCase())) {
      setError('此 帳號 ID 已存在，請使用其他 ID');
      return;
    }
    onAdd(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200 my-8">
        <div className="p-8 pb-4 border-b border-slate-50 flex justify-between items-center">
          <div>
            <h3 className="text-2xl font-black text-slate-900">建立新帳號</h3>
            <p className="text-slate-400 text-sm font-medium">請填寫基本資料以建立系統使用者</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          {error && <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-bold border border-red-100">{error}</div>}
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">帳號 ID (登入用) *</label>
              <input
                required
                placeholder="例如: student123"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                value={formData.loginId}
                onChange={e => setFormData({ ...formData, loginId: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">顯示姓名 *</label>
              <input
                required
                placeholder="輸入真實姓名"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                value={formData.username}
                onChange={e => setFormData({ ...formData, username: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">電子郵件 *</label>
            <input
              required
              type="email"
              placeholder="example@university.edu.tw"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">登入密碼 *</label>
            <input
              required
              type="text"
              placeholder="請設定登入密碼"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">權限角色</label>
            <div className="flex space-x-2">
              {(['Admin', 'User'] as Role[]).map(role => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setFormData({ ...formData, role })}
                  className={`flex-1 py-3 rounded-2xl text-xs font-black transition-all ${formData.role === role ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-slate-50 text-slate-500 border border-slate-100'}`}
                >
                  {role === 'Admin' ? '管理人員' : '學生'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">學號</label>
              <input
                placeholder="輸入學生學號"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none"
                value={formData.studentId}
                onChange={e => setFormData({ ...formData, studentId: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">系所名稱</label>
              <input
                placeholder="輸入系所"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none"
                value={formData.department}
                onChange={e => setFormData({ ...formData, department: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">修習學程</label>
            <select
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none cursor-pointer"
              value={formData.program as string}
              onChange={e => setFormData({ ...formData, program: e.target.value })}
            >
              <option value="">未設定 (請選擇)</option>
              <option value="小教">小教</option>
              <option value="中教">中教</option>
              <option value="幼教">幼教</option>
              <option value="中小合流">中小合流</option>
            </select>
          </div>

          <div className="pt-6 flex space-x-3">
            <button
              type="submit"
              className="flex-1 bg-slate-900 text-white py-4 rounded-3xl font-black hover:bg-black transition-all shadow-xl active:scale-95"
            >
              確認建立帳號
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-8 bg-slate-100 text-slate-500 py-4 rounded-3xl font-black hover:bg-slate-200 transition-all"
            >
              取消
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const UserRow: React.FC<{ 
  user: User; 
  currentUserLoginId: string;
  onSaveRequest: (user: User) => void;
  onDeleteRequest: (user: User) => void;
  lastSavedLoginId: string | null;
}> = ({ user, currentUserLoginId, onSaveRequest, onDeleteRequest, lastSavedLoginId }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [tempData, setTempData] = useState<User>(user);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const programOptions: ProgramType[] = ['小教', '中教', '幼教', '中小合流'];

  useEffect(() => {
    if (lastSavedLoginId === user.loginId) {
      setIsEditing(false);
    }
  }, [lastSavedLoginId, user.loginId]);

  const handleToggleEdit = () => {
    if (isEditing) {
      const finalData = { ...tempData };
      if (tempData.password !== user.password) {
        finalData.isFirstLogin = true;
      }
      onSaveRequest(finalData);
    } else {
      setIsEditing(true);
      setTempData(user);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setTempData(user);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setTempData(prev => ({ ...prev, [name]: value }));
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("圖片檔案過大，請選擇 5MB 以下的圖片。");
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setTempData(prev => ({ ...prev, profileImage: event.target?.result as string }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const isSelf = user.loginId === currentUserLoginId;
  const isSuperAdmin = user.loginId === 'admin';
  const iAmSuperAdmin = currentUserLoginId === 'admin';
  
  const canChangeRole = !isSuperAdmin || iAmSuperAdmin;
  const canBeDeleted = !isSuperAdmin && !isSelf;

  return (
    <tr className={`hover:bg-slate-50 transition-colors ${isEditing ? 'bg-indigo-50/30' : ''}`}>
      <td className="px-6 py-5">
        <div className="flex items-center space-x-3">
          <div 
            className={`w-10 h-10 rounded-xl flex items-center justify-center text-slate-600 font-bold border border-slate-200 shadow-sm shrink-0 overflow-hidden relative group ${isEditing ? 'cursor-pointer ring-2 ring-indigo-300' : 'bg-white'}`}
            onClick={() => isEditing && fileInputRef.current?.click()}
          >
            {tempData.profileImage ? (
              <img src={isEditing ? tempData.profileImage : user.profileImage} alt={user.username} className="w-full h-full object-cover" />
            ) : (
              user.username.charAt(0)
            )}
            
            {isEditing && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                </svg>
              </div>
            )}
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleAvatarChange} 
            />
          </div>
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="space-y-1">
                <input
                  name="username"
                  value={tempData.username}
                  onChange={handleChange}
                  className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <p className="text-[10px] text-slate-400 font-bold">登入 ID: {user.loginId}</p>
              </div>
            ) : (
              <>
                <p className="font-bold text-slate-900 truncate">{user.username}</p>
                <p className="text-[10px] text-slate-400 font-bold mb-1">ID: {user.loginId}</p>
              </>
            )}
            <div className="flex flex-wrap gap-1">
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${user.role === 'Admin' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>
                {user.role === 'Admin' ? '管理員' : '學生'} {isSelf && '(您)'}
              </span>
              {user.isFirstLogin && (
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-100 text-rose-600 border border-rose-200">
                  待改密碼
                </span>
              )}
            </div>
          </div>
        </div>
      </td>
      <td className="px-6 py-5">
        {isEditing ? (
          <input
            name="email"
            type="email"
            value={tempData.email || ''}
            onChange={handleChange}
            className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        ) : (
          <p className="text-xs font-medium text-slate-500 truncate max-w-[150px]">{user.email || 'N/A'}</p>
        )}
      </td>
      <td className="px-6 py-5">
        {isEditing ? (
          <input
            name="studentId"
            value={tempData.studentId || ''}
            onChange={handleChange}
            className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        ) : (
          <p className="text-sm font-semibold text-slate-700">{user.studentId || 'N/A'}</p>
        )}
      </td>
      <td className="px-6 py-5">
        {isEditing ? (
          <input
            name="department"
            value={tempData.department || ''}
            onChange={handleChange}
            className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        ) : (
          <span className="text-sm text-slate-600">{user.department || 'N/A'}</span>
        )}
      </td>
      <td className="px-6 py-5">
        {isEditing ? (
          <div className="space-y-2">
            <select
              name="program"
              value={tempData.program || ''}
              onChange={handleChange}
              className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
            >
              <option value="" disabled>選擇學程</option>
              {programOptions.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            <div className="flex items-center space-x-2 pt-1 border-t border-slate-100">
               <span className="text-[10px] font-bold text-slate-400 uppercase">權限:</span>
               <select
                 name="role"
                 value={tempData.role}
                 onChange={handleChange}
                 disabled={!canChangeRole}
                 className={`text-[10px] font-bold rounded px-1 py-0.5 outline-none border ${!canChangeRole ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-white border-indigo-200 text-indigo-600'}`}
               >
                 <option value="Admin">管理員</option>
                 <option value="User">學生</option>
               </select>
            </div>
          </div>
        ) : (
          <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold whitespace-nowrap">
            {user.program || 'N/A'}
          </span>
        )}
      </td>
      <td className="px-6 py-5">
        <div className="flex items-center space-x-2">
          {isEditing ? (
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              value={tempData.password || ''}
              onChange={handleChange}
              className="w-32 px-2 py-1 bg-white border border-slate-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          ) : (
            <span className="font-mono text-sm text-slate-600 min-w-[80px]">
              {showPassword ? user.password : '••••••••'}
            </span>
          )}
          <button 
            onClick={() => setShowPassword(!showPassword)}
            className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors text-slate-400 hover:text-indigo-600"
            title={showPassword ? "隱藏密碼" : "顯示密碼"}
          >
            {showPassword ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268-2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            )}
          </button>
        </div>
      </td>
      <td className="px-6 py-5 text-right whitespace-nowrap">
        <div className="flex justify-end space-x-2">
          {isEditing ? (
            <>
              <button 
                onClick={handleToggleEdit}
                className="p-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all shadow-md active:scale-90"
                title="儲存更改"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
              </button>
              <button 
                onClick={handleCancel}
                className="p-2 bg-slate-200 text-slate-600 rounded-xl hover:bg-slate-300 transition-all active:scale-90"
                title="取消"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={handleToggleEdit}
                className="p-2 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm active:scale-90"
                title="編輯資料"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              </button>
              <button 
                onClick={() => onDeleteRequest(user)}
                disabled={!canBeDeleted}
                className={`p-2 bg-white border border-slate-200 rounded-xl transition-all shadow-sm active:scale-90 ${!canBeDeleted ? 'opacity-30 cursor-not-allowed text-slate-300' : 'text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200'}`}
                title={isSuperAdmin ? "禁止刪除原始管理員" : isSelf ? "無法刪除目前登入的帳號" : "刪除帳號"}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
};

const UserManagement: React.FC<UserManagementProps> = ({ users, currentUserLoginId, onUpdateUser, onAddUser, onBatchAddUsers, onDeleteUser }) => {
  const [activePage, setActivePage] = useState<'admins' | 'users'>('admins');
  const [searchQuery, setSearchQuery] = useState('');
  const [programFilter, setProgramFilter] = useState<string>('All');

  const [confirmModal, setConfirmModal] = useState<{ 
    isOpen: boolean; 
    userToProcess: User | null;
    actionType: 'save' | 'delete';
  }>({ isOpen: false, userToProcess: null, actionType: 'save' });

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [lastSavedLoginId, setLastSavedLoginId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'danger' } | null>(null);

  const filteredBase = useMemo(() => {
    return users.filter(u => activePage === 'admins' ? u.role === 'Admin' : u.role === 'User');
  }, [users, activePage]);

  const displayedUsers = useMemo(() => {
    if (activePage === 'admins') return filteredBase;
    
    return filteredBase.filter(u => {
      const matchesSearch = 
        u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.loginId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.studentId || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesProgram = programFilter === 'All' || u.program === programFilter;
      
      return matchesSearch && matchesProgram;
    });
  }, [filteredBase, activePage, searchQuery, programFilter]);

  const handleSaveRequest = (updatedUser: User) => {
    setConfirmModal({ isOpen: true, userToProcess: updatedUser, actionType: 'save' });
  };

  const handleDeleteRequest = (user: User) => {
    setConfirmModal({ isOpen: true, userToProcess: user, actionType: 'delete' });
  };

  const handleConfirmAction = () => {
    if (confirmModal.userToProcess) {
      if (confirmModal.actionType === 'save') {
        onUpdateUser(confirmModal.userToProcess);
        setLastSavedLoginId(confirmModal.userToProcess.loginId);
        triggerToast('修改成功', 'success');
        setTimeout(() => setLastSavedLoginId(null), 100);
      } else {
        onDeleteUser(confirmModal.userToProcess.loginId);
        triggerToast(`帳號 ${confirmModal.userToProcess.username} 已成功移除`, 'danger');
      }
    }
    setConfirmModal({ isOpen: false, userToProcess: null, actionType: 'save' });
  };

  const handleAddUser = (newUser: User) => {
    onAddUser(newUser);
    triggerToast('成功新增帳號', 'success');
  };

  const handleBatchImport = (newUsers: User[]) => {
    onBatchAddUsers(newUsers);
    triggerToast(`成功批量新增 ${newUsers.length} 個帳號`, 'success');
  };

  const triggerToast = (msg: string, type: 'success' | 'danger') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 relative">
      {toast && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[150] animate-in slide-in-from-top-4 duration-300">
          <div className={`px-6 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 border text-white ${toast.type === 'danger' ? 'bg-red-500 border-red-400' : 'bg-emerald-500 border-emerald-400'}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-bold">{toast.msg}</span>
          </div>
        </div>
      )}

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">帳號權限管理中心</h1>
          <p className="text-slate-500 mt-1 font-medium">管理員可透過單一或批量方式維護系統使用者資料。</p>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={() => setIsBatchModalOpen(true)}
            className="bg-indigo-50 text-indigo-700 px-6 py-3 rounded-2xl font-black shadow-sm hover:bg-indigo-100 active:scale-95 transition-all flex items-center justify-center space-x-2 border border-indigo-100"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>批量匯入 (Excel)</span>
          </button>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black shadow-xl hover:bg-black active:scale-95 transition-all flex items-center justify-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>新增單一帳號</span>
          </button>
        </div>
      </header>

      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="inline-flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-inner">
            <button
              onClick={() => setActivePage('admins')}
              className={`px-8 py-2.5 rounded-xl text-sm font-black transition-all flex items-center space-x-2 ${activePage === 'admins' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <span>管理員</span>
              <span className={`px-2 py-0.5 rounded-lg text-[10px] ${activePage === 'admins' ? 'bg-indigo-100' : 'bg-slate-200'}`}>
                {users.filter(u => u.role === 'Admin').length}
              </span>
            </button>
            <button
              onClick={() => setActivePage('users')}
              className={`px-8 py-2.5 rounded-xl text-sm font-black transition-all flex items-center space-x-2 ${activePage === 'users' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <span>一般使用者</span>
              <span className={`px-2 py-0.5 rounded-lg text-[10px] ${activePage === 'users' ? 'bg-indigo-100' : 'bg-slate-200'}`}>
                {users.filter(u => u.role === 'User').length}
              </span>
            </button>
          </div>

          {activePage === 'users' && (
            <div className="flex flex-1 max-w-2xl items-center space-x-3 animate-in fade-in slide-in-from-right-4 duration-300">
               <div className="relative flex-1">
                <svg className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input 
                  type="text"
                  placeholder="搜尋姓名、ID、郵件或學號..."
                  className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
               </div>
               <select 
                className="px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold shadow-sm outline-none cursor-pointer hover:border-indigo-300"
                value={programFilter}
                onChange={(e) => setProgramFilter(e.target.value)}
               >
                 <option value="All">所有學程</option>
                 <option value="小教">小教</option>
                 <option value="中教">中教</option>
                 <option value="幼教">幼教</option>
                 <option value="中小合流">中小合流</option>
               </select>
            </div>
          )}
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left table-fixed min-w-[900px]">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 text-[10px] font-black uppercase tracking-widest">
                  <th className="px-6 py-4 w-[22%]">用戶名稱 / 帳號 ID</th>
                  <th className="px-6 py-4 w-[18%]">電子郵件</th>
                  <th className="px-6 py-4 w-[12%]">學號</th>
                  <th className="px-6 py-4 w-[12%]">系所</th>
                  <th className="px-6 py-4 w-[14%]">學程與權限</th>
                  <th className="px-6 py-4 w-[12%]">登入密碼</th>
                  <th className="px-6 py-4 w-32 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-20 text-center text-slate-400">
                      <div className="flex flex-col items-center">
                        <svg className="w-12 h-12 mb-3 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 9.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="font-bold">找不到符合條件的帳號</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  displayedUsers.map((user) => (
                    <UserRow 
                      key={user.loginId} 
                      user={user} 
                      currentUserLoginId={currentUserLoginId}
                      onSaveRequest={handleSaveRequest} 
                      onDeleteRequest={handleDeleteRequest}
                      lastSavedLoginId={lastSavedLoginId}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <ConfirmModal 
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, userToProcess: null, actionType: 'save' })}
        onConfirm={handleConfirmAction}
        title={confirmModal.actionType === 'delete' ? '確認刪除帳號' : '確認修改資料'}
        type={confirmModal.actionType === 'delete' ? 'danger' : 'primary'}
        message={confirmModal.actionType === 'delete' 
          ? `您確定要永久刪除「${confirmModal.userToProcess?.username}」的帳號嗎？此操作無法還原。`
          : `您確定要儲存「${confirmModal.userToProcess?.username}」的修改資訊（含郵件與權限）嗎？`}
      />

      <AddUserModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddUser}
        existingLoginIds={users.map(u => u.loginId.toLowerCase())}
      />

      <BatchImportModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        onImport={handleBatchImport}
        existingLoginIds={users.map(u => u.loginId.toLowerCase())}
      />
    </div>
  );
};

export default UserManagement;
