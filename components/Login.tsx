
import React, { useState } from 'react';
import { User } from '../types';

interface LoginProps {
  onLogin: (user: User) => void;
  users: User[];
}

const Login: React.FC<LoginProps> = ({ onLogin, users }) => {
  const [loginIdInput, setLoginIdInput] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const matchedUser = users.find(
      u => u.loginId.toLowerCase() === loginIdInput.toLowerCase() && u.password === password
    );

    if (matchedUser) {
      onLogin(matchedUser);
    } else {
      setError('帳號 ID 或密碼錯誤，請重新輸入');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 px-4">
      <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl w-full max-w-md border border-white/20">
        <div className="text-center mb-10">
          <div className="bg-indigo-50 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner rotate-3">
            <svg className="w-10 h-10 text-indigo-600 -rotate-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">系統登入</h1>
          <p className="text-slate-400 mt-2 font-medium">請輸入您的帳號 ID 以進入系統</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm font-bold border border-red-100 animate-pulse">
              {error}
            </div>
          )}
          
          <div className="space-y-2">
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">帳號 ID (loginId)</label>
            <input
              type="text"
              className="w-full px-5 py-4 bg-white border-2 border-black rounded-2xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 outline-none transition-all shadow-sm font-bold text-slate-700 placeholder-slate-200"
              placeholder="請輸入帳號"
              value={loginIdInput}
              onChange={(e) => setLoginIdInput(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">密碼 Password</label>
            <input
              type="password"
              className="w-full px-5 py-4 bg-white border-2 border-black rounded-2xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 outline-none transition-all shadow-sm font-bold text-slate-700 placeholder-slate-200"
              placeholder="請輸入密碼"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-lg hover:bg-black transition-all shadow-xl active:scale-[0.98] mt-4"
          >
            立即登入
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
