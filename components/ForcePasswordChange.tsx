
import React, { useState } from 'react';
import { User } from '../types';

interface ForcePasswordChangeProps {
  user: User;
  onPasswordChanged: (newPassword: string) => void;
}

const ForcePasswordChange: React.FC<ForcePasswordChangeProps> = ({ user, onPasswordChanged }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('為了安全起見，密碼長度至少需 6 個字元。');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('兩次輸入的新密碼不相符，請重新確認。');
      return;
    }

    if (newPassword === user.password) {
      setError('新密碼不能與系統預設密碼相同。');
      return;
    }

    setIsSubmitting(true);
    // 模擬處理時間
    await new Promise(r => setTimeout(r, 1000));
    onPasswordChanged(newPassword);
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl border border-white/20 overflow-hidden animate-in zoom-in-95 duration-500">
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-10 text-center text-white relative">
          <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-6 backdrop-blur-lg shadow-inner">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-black tracking-tight">安全強化提示</h2>
          <p className="text-indigo-100 mt-2 text-sm font-medium">您好 {user.username}，偵測到您是首次登入，請先更新您的個人密碼以確保帳號安全。</p>
        </div>

        <form onSubmit={handleSubmit} className="p-10 space-y-6">
          {error && (
            <div className="bg-rose-50 text-rose-600 p-4 rounded-2xl text-xs font-bold border border-rose-100 flex items-start space-x-2 animate-in slide-in-from-top-2">
              <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">設定新密碼</label>
            <input
              type="password"
              required
              placeholder="請輸入 6 位以上新密碼"
              className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">確認新密碼</label>
            <input
              type="password"
              required
              placeholder="請再次輸入新密碼"
              className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black text-sm tracking-[0.2em] uppercase hover:bg-black transition-all shadow-xl active:scale-[0.98] disabled:bg-slate-300 disabled:cursor-not-allowed mt-4 flex items-center justify-center space-x-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>更新中...</span>
              </>
            ) : (
              <span>確認並儲存新密碼</span>
            )}
          </button>
          
          <p className="text-[10px] text-center text-slate-400 font-bold leading-relaxed px-4">
            * 您的新密碼將立即生效，往後登入請使用此新密碼。
          </p>
        </form>
      </div>
    </div>
  );
};

export default ForcePasswordChange;
