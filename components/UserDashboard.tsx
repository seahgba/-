
import React, { useState } from 'react';
import { Application, ApplicationStatus, Attachment, CourseCategory } from '../types';
import { refineDescription } from '../services/geminiService';
import AttachmentViewer from './AttachmentViewer';

interface UserDashboardProps {
  username: string;
  applications: Application[];
  onSubmit: (app: Omit<Application, 'id' | 'status' | 'createdAt'>) => void;
}

const UserDashboard: React.FC<UserDashboardProps> = ({ username, applications, onSubmit }) => {
  const [formData, setFormData] = useState({
    courseName: '',
    equivalentCourseName: '',
    courseCredits: '',
    waiverCredits: '',
    semesterTaken: '',
    waiverSemester: '',
    offeringUniversity: '',
    description: '',
    courseCategory: '專門' as CourseCategory,
  });
  
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isRefining, setIsRefining] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [viewerState, setViewerState] = useState<{ isOpen: boolean; fileName: string; fileData?: string }>({
    isOpen: false,
    fileName: '',
  });

  // 驗證學分是否合法
  const isCreditsInvalid = formData.courseCredits !== '' && 
                          formData.waiverCredits !== '' && 
                          Number(formData.courseCredits) < Number(formData.waiverCredits);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if ((name === 'courseCredits' || name === 'waiverCredits') && value !== '') {
      const cleanValue = value.replace(/[^\d]/g, '');
      setFormData(prev => ({ ...prev, [name]: cleanValue }));
      return;
    }
    
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCategoryChange = (category: CourseCategory) => {
    setFormData(prev => ({ ...prev, courseCategory: category }));
  };

  const handleRefine = async () => {
    if (!formData.description.trim()) return;
    setIsRefining(true);
    const refined = await refineDescription(formData.description);
    setFormData(prev => ({ ...prev, description: refined }));
    setIsRefining(false);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isCreditsInvalid) {
      return; 
    }

    if (!formData.courseCredits || !formData.waiverCredits) {
      alert("請填寫正確的學分整數。");
      return;
    }

    setIsSubmitting(true);
    await new Promise(r => setTimeout(r, 800));
    onSubmit({ 
      username, 
      ...formData,
      attachments
    });
    setFormData({
      courseName: '',
      equivalentCourseName: '',
      courseCredits: '',
      waiverCredits: '',
      semesterTaken: '',
      waiverSemester: '',
      offeringUniversity: '',
      description: '',
      courseCategory: '專門',
    });
    setAttachments([]);
    setIsSubmitting(false);
  };

  // Handle multi-file attachment upload with explicit typing
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      // Fix: Explicitly cast to File[] to avoid 'unknown' type errors for size, name and reader.readAsDataURL
      const newFiles: File[] = Array.from(files);
      
      newFiles.forEach(file => {
        if (file.size > 5 * 1024 * 1024) {
          alert(`檔案「${file.name}」過大，請選擇 5MB 以下的檔案。`);
          return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            setAttachments(prev => [
              ...prev, 
              { name: file.name, data: event.target?.result as string }
            ]);
          }
        };
        reader.readAsDataURL(file);
      });
      e.target.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const openViewer = (fileName: string, fileData?: string) => {
    if (!fileData) return;
    setViewerState({ isOpen: true, fileName, fileData });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">課程抵免申請</h1>
        <p className="text-slate-500 mt-1 font-bold">請輸入欲抵免之課程資訊 (支援多檔案附件，單一檔案上限 5MB)</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
        {/* Form Section */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col lg:sticky lg:top-8">
          <h2 className="text-xl font-black mb-6 flex items-center">
            新增抵免申請
          </h2>
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">課程類別選擇</label>
                <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => handleCategoryChange('專門')}
                    className={`flex-1 py-3 rounded-xl text-sm font-black transition-all ${formData.courseCategory === '專門' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-500 hover:bg-slate-200'}`}
                  >
                    專門課程
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCategoryChange('專業')}
                    className={`flex-1 py-3 rounded-xl text-sm font-black transition-all ${formData.courseCategory === '專業' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-500 hover:bg-slate-200'}`}
                  >
                    專業課程
                  </button>
                </div>
              </div>

              <div className="col-span-2">
                <label className="block text-[10px] font-black text-slate-500 mb-1 uppercase tracking-widest">修課學校</label>
                <input
                  name="offeringUniversity"
                  type="text"
                  required
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-black"
                  value={formData.offeringUniversity}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 mb-1 uppercase tracking-widest">課程名稱</label>
                <input
                  name="courseName"
                  type="text"
                  required
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-black"
                  value={formData.courseName}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 mb-1 uppercase tracking-widest">抵免課程名稱</label>
                <input
                  name="equivalentCourseName"
                  type="text"
                  required
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-black"
                  value={formData.equivalentCourseName}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 mb-1 uppercase tracking-widest">修課學分</label>
                <input
                  name="courseCredits"
                  type="number"
                  min="0"
                  required
                  className={`w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-black ${isCreditsInvalid ? 'border-rose-500 bg-rose-50' : 'bg-slate-50 border-slate-200'}`}
                  value={formData.courseCredits}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 mb-1 uppercase tracking-widest">抵免學分</label>
                <input
                  name="waiverCredits"
                  type="number"
                  min="0"
                  required
                  className={`w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-black ${isCreditsInvalid ? 'border-rose-500 bg-rose-50' : 'bg-slate-50 border-slate-200'}`}
                  value={formData.waiverCredits}
                  onChange={handleInputChange}
                />
              </div>

              {isCreditsInvalid && (
                <div className="col-span-2 animate-in fade-in slide-in-from-top-1 duration-300">
                  <p className="text-[11px] font-black text-rose-600 bg-rose-50 px-3 py-2 rounded-lg border border-rose-100">
                    ⚠ 警告：修課學分應大於或等於抵免學分。
                  </p>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black text-slate-500 mb-1 uppercase tracking-widest">修課學期</label>
                <input
                  name="semesterTaken"
                  type="text"
                  required
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-black"
                  value={formData.semesterTaken}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 mb-1 uppercase tracking-widest">抵免學期</label>
                <input
                  name="waiverSemester"
                  type="text"
                  required
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-black"
                  value={formData.waiverSemester}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">備註說明</label>
                <button 
                  type="button"
                  onClick={handleRefine}
                  disabled={isRefining || !formData.description}
                  className="flex items-center text-[10px] font-black text-indigo-600 hover:text-indigo-800 disabled:opacity-50 transition-colors bg-indigo-50 px-2 py-1 rounded-lg"
                >
                  {isRefining ? 'AI 優化中...' : '✨ AI 潤飾'}
                </button>
              </div>
              <textarea
                name="description"
                rows={3}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none text-sm font-black"
                value={formData.description}
                onChange={handleInputChange}
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">相關證明附件 (上限 5MB)</label>
              <div className="relative border-2 border-dashed border-slate-200 rounded-2xl p-4 text-center hover:border-indigo-300 transition-colors cursor-pointer group mb-3">
                <input 
                  type="file" 
                  multiple 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                  accept="image/*,.pdf" 
                  onChange={handleFileChange} 
                />
                <div className="flex flex-col items-center">
                  <svg className="w-8 h-8 text-slate-300 mb-2 group-hover:text-indigo-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                  <p className="text-[11px] text-slate-400 font-black uppercase tracking-tight">點擊或拖曳上傳附件</p>
                </div>
              </div>

              {attachments.length > 0 && (
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1 scrollbar-thin">
                  {attachments.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 group animate-in slide-in-from-left-2 duration-200">
                      <div className="flex items-center space-x-2 truncate">
                        <svg className="w-3 h-3 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                        <span className="text-[10px] font-black text-slate-600 truncate">{file.name}</span>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => removeAttachment(idx)}
                        className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || isCreditsInvalid}
              className={`w-full text-white py-4 rounded-2xl font-black text-sm transition-all shadow-xl flex items-center justify-center tracking-[0.2em] uppercase active:scale-95 ${isCreditsInvalid ? 'bg-slate-300 cursor-not-allowed shadow-none' : 'bg-slate-900 hover:bg-black'}`}
            >
              {isSubmitting ? '提交中...' : '送出抵免申請'}
            </button>
          </form>
        </div>

        {/* List Section */}
        <div className="lg:col-span-3 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden lg:h-[750px]">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white z-10">
            <h2 className="text-xl font-black flex items-center">
              <span className="w-2 h-6 bg-indigo-600 rounded-full mr-3"></span>
              我的抵免歷史
            </h2>
            <div className="flex space-x-1.5 items-center">
              <div className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                <span className="text-[10px] font-black text-slate-400 uppercase">待審</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span className="text-[10px] font-black text-slate-400 uppercase">通過</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                <span className="text-[10px] font-black text-slate-400 uppercase">駁回</span>
              </div>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth">
            {applications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-24 text-slate-300">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                  <svg className="w-10 h-10 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <p className="font-black text-sm tracking-widest uppercase">尚無抵免申請紀錄</p>
                <p className="text-xs mt-1 font-bold">填寫左側表單後即可送出申請</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {applications.map((app) => (
                  <div key={app.id} className="p-6 hover:bg-slate-50/80 transition-all group animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className={`w-2 h-2 rounded-full ${
                            app.status === ApplicationStatus.PENDING ? 'bg-amber-400 animate-pulse' :
                            app.status === ApplicationStatus.APPROVED ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}></span>
                          {/* 課程類別標籤 */}
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase border ${app.courseCategory === '專業' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-purple-50 text-purple-700 border-purple-100'}`}>
                            {app.courseCategory || '專門'}
                          </span>
                        </div>
                        <h3 className="text-lg font-black text-slate-900 leading-tight">
                          {app.courseName} 
                          <span className="mx-2 text-slate-300 text-sm font-normal">➜</span> 
                          <span className="text-indigo-600">{app.equivalentCourseName}</span>
                        </h3>
                        
                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 text-[11px] text-slate-500 font-black bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                          <div className="flex flex-col">
                            <span className="text-[9px] text-slate-400 uppercase tracking-tighter mb-0.5">修課學校</span>
                            <span className="text-slate-700">{app.offeringUniversity}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[9px] text-slate-400 uppercase tracking-tighter mb-0.5">學分對照</span>
                            <span className="text-slate-700">{app.courseCredits} <span className="text-slate-300 mx-1">➜</span> {app.waiverCredits} 學分</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[9px] text-slate-400 uppercase tracking-tighter mb-0.5">學期對照</span>
                            <span className="text-slate-700">{app.semesterTaken} <span className="text-slate-300 mx-1">➜</span> {app.waiverSemester}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[9px] text-slate-400 uppercase tracking-tighter mb-0.5">申請日期</span>
                            <span className="text-slate-700">{app.createdAt.split(' ')[0]}</span>
                          </div>
                        </div>

                        {app.description && (
                          <div className="mt-3 p-3 bg-indigo-50/30 rounded-xl border border-indigo-50/50">
                            <p className="text-[11px] text-slate-600 leading-relaxed italic font-black">
                              <span className="text-indigo-400 mr-1">“</span>
                              {app.description}
                              <span className="text-indigo-400 ml-1">”</span>
                            </p>
                          </div>
                        )}

                        <div className="mt-4 flex flex-wrap gap-2">
                          {app.attachments.map((file, idx) => (
                            <button 
                              key={idx}
                              onClick={() => openViewer(file.name, file.data)}
                              className="flex items-center space-x-1 px-2 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-black text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                              </svg>
                              <span className="truncate max-w-[80px]">{file.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      <div className={`shrink-0 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm ${
                        app.status === ApplicationStatus.APPROVED ? 'bg-emerald-500 text-white' :
                        app.status === ApplicationStatus.REJECTED ? 'bg-rose-500 text-white' :
                        'bg-amber-100 text-amber-700 border border-amber-200'
                      }`}>
                        {app.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <AttachmentViewer 
        isOpen={viewerState.isOpen}
        onClose={() => setViewerState({ ...viewerState, isOpen: false })}
        fileName={viewerState.fileName}
        fileData={viewerState.fileData}
      />
    </div>
  );
};

export default UserDashboard;
