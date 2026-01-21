
import React, { useState, useMemo } from 'react';
import { Application, ApplicationStatus, Statistics, CourseCategory } from '../types';
import AttachmentViewer from './AttachmentViewer';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';

interface AdminDashboardProps {
  applications: Application[];
  onUpdateStatus: (id: string, status: ApplicationStatus) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ applications, onUpdateStatus }) => {
  const [filterUser, setFilterUser] = useState<string>('All');
  const [activeTab, setActiveTab] = useState<ApplicationStatus | 'Total'>('Total');
  const [categoryFilter, setCategoryFilter] = useState<CourseCategory | 'All'>('All');
  const [isExporting, setIsExporting] = useState(false);
  const [viewerState, setViewerState] = useState<{ isOpen: boolean; fileName: string; fileData?: string }>({
    isOpen: false,
    fileName: '',
  });

  const userFilteredApps = useMemo(() => {
    let apps = filterUser === 'All' ? applications : applications.filter(a => a.username === filterUser);
    if (categoryFilter !== 'All') {
      apps = apps.filter(a => (a.courseCategory || '專門') === categoryFilter);
    }
    return apps;
  }, [applications, filterUser, categoryFilter]);

  const stats: Statistics = useMemo(() => {
    return {
      total: userFilteredApps.length,
      approved: userFilteredApps.filter(a => a.status === ApplicationStatus.APPROVED).length,
      rejected: userFilteredApps.filter(a => a.status === ApplicationStatus.REJECTED).length,
      pending: userFilteredApps.filter(a => a.status === ApplicationStatus.PENDING).length,
    };
  }, [userFilteredApps]);

  const specializedCount = useMemo(() => {
    const baseApps = filterUser === 'All' ? applications : applications.filter(a => a.username === filterUser);
    return baseApps.filter(a => !a.courseCategory || a.courseCategory === '專門').length;
  }, [applications, filterUser]);

  const professionalCount = useMemo(() => {
    const baseApps = filterUser === 'All' ? applications : applications.filter(a => a.username === filterUser);
    return baseApps.filter(a => a.courseCategory === '專業').length;
  }, [applications, filterUser]);

  const finalDisplayApps = useMemo(() => {
    if (activeTab === 'Total') return userFilteredApps;
    return userFilteredApps.filter(a => a.status === activeTab);
  }, [userFilteredApps, activeTab]);

  const usernames = Array.from(new Set(applications.map(a => a.username)));

  const handleTabClick = (tab: ApplicationStatus | 'Total') => {
    setActiveTab(tab);
  };

  const handleViewAttachment = (fileName: string, fileData?: string) => {
    if (!fileData) return;
    setViewerState({ isOpen: true, fileName, fileData });
  };

  const handleExportExcelWithAttachments = async () => {
    if (finalDisplayApps.length === 0) return;
    setIsExporting(true);

    try {
      const zip = new JSZip();
      const dateStr = new Date().toISOString().split('T')[0];
      const folderName = `抵免申請資料包_${dateStr}`;
      const attachmentsFolder = zip.folder("附件清單");

      const excelData = finalDisplayApps.map(app => {
        const attachmentNames = app.attachments.map(at => at.name).join('; ');
        return {
          '申請編號': app.id,
          '申請人': app.username,
          '類別': app.courseCategory || '專門',
          '修課學校': app.offeringUniversity,
          '原修課程名稱': app.courseName,
          '抵免本校課程': app.equivalentCourseName,
          '修課學分': app.courseCredits,
          '抵免學分': app.waiverCredits,
          '修課學期': app.semesterTaken,
          '抵免學期': app.waiverSemester,
          '審核狀態': app.status,
          '附件檔名': attachmentNames || '無',
          '申請日期': app.createdAt,
          '備註說明': app.description || '無'
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "申請清單索引");
      
      worksheet['!cols'] = [
        { wch: 15 }, { wch: 12 }, { wch: 10 }, { wch: 20 }, { wch: 25 }, { wch: 25 }, 
        { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, 
        { wch: 12 }, { wch: 30 }, { wch: 20 }, { wch: 30 }
      ];

      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      zip.file("申請清單索引表.xlsx", excelBuffer);

      finalDisplayApps.forEach(app => {
        app.attachments.forEach(file => {
          if (file.data) {
            const base64Data = file.data.split(',')[1];
            const safeName = `${app.username}_${app.courseName.replace(/[/\\?%*:|"<>]/g, '-')}_${file.name}`;
            attachmentsFolder?.file(safeName, base64Data, { base64: true });
          }
        });
      });

      const content = await zip.generateAsync({ type: "blob" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(content);
      link.download = `${folderName}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);

    } catch (error) {
      console.error("匯出失敗:", error);
      alert("匯出完整資料包失敗，請重試。");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">課程抵免審核系統</h1>
          <p className="text-slate-500 mt-1">管理員面板 - 掌握全校抵免進度</p>
        </div>
        <div className="flex items-center space-x-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
          <label className="text-sm font-bold text-slate-600">篩選申請者:</label>
          <select 
            value={filterUser} 
            onChange={(e) => { setFilterUser(e.target.value); setActiveTab('Total'); }}
            className="bg-slate-50 border-none rounded-lg px-3 py-1 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
          >
            <option value="All">顯示所有用戶</option>
            {usernames.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      </header>

      {/* 指標區塊 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { key: 'Total', label: '上傳申請總數', value: stats.total, color: 'indigo' },
          { key: ApplicationStatus.PENDING, label: '待審核件數', value: stats.pending, color: 'amber' },
          { key: ApplicationStatus.APPROVED, label: '已通過件數', value: stats.approved, color: 'emerald' },
          { key: ApplicationStatus.REJECTED, label: '已駁回件數', value: stats.rejected, color: 'rose' },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => handleTabClick(item.key as any)}
            className={`text-left p-6 rounded-2xl border-2 transition-all duration-300 transform hover:-translate-y-1 ${
              activeTab === item.key 
              ? `bg-${item.color}-50 border-${item.color}-500 shadow-lg shadow-${item.color}-100` 
              : 'bg-white border-slate-100 shadow-sm hover:border-slate-300'
            }`}
          >
            <span className={`text-xs font-bold uppercase tracking-wider ${activeTab === item.key ? `text-${item.color}-600` : 'text-slate-400'}`}>
              {item.label}
            </span>
            <div className="flex items-end justify-between mt-2">
              <span className={`text-4xl font-black ${activeTab === item.key ? `text-${item.color}-700` : `text-${item.color}-600`}`}>
                {item.value}
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* 類別篩選與匯出按鈕：類別按鈕組合縮小並字體加粗，匯出按鈕獨立分離 */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 animate-in slide-in-from-top-4 duration-500">
        <div className="inline-flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
          <button
            onClick={() => setCategoryFilter('All')}
            className={`px-6 py-3 rounded-xl transition-all flex flex-col items-center min-w-[100px] ${categoryFilter === 'All' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <span className="text-[11px] font-black uppercase tracking-widest mb-0.5">全部類別</span>
            <span className="text-xl font-black leading-none">{specializedCount + professionalCount}</span>
          </button>
          
          <div className="w-px bg-slate-100 my-2 mx-1"></div>
          
          <button
            onClick={() => setCategoryFilter('專門')}
            className={`px-6 py-3 rounded-xl transition-all flex flex-col items-center min-w-[100px] ${categoryFilter === '專門' ? 'bg-purple-600 text-white shadow-lg shadow-purple-100' : 'text-slate-500 hover:bg-purple-50 hover:text-purple-600'}`}
          >
            <span className="text-[11px] font-black uppercase tracking-widest mb-0.5">專門課程</span>
            <span className="text-xl font-black leading-none">{specializedCount}</span>
          </button>
          
          <div className="w-px bg-slate-100 my-2 mx-1"></div>
          
          <button
            onClick={() => setCategoryFilter('專業')}
            className={`px-6 py-3 rounded-xl transition-all flex flex-col items-center min-w-[100px] ${categoryFilter === '專業' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-500 hover:bg-indigo-50 hover:text-indigo-600'}`}
          >
            <span className="text-[11px] font-black uppercase tracking-widest mb-0.5">專業課程</span>
            <span className="text-xl font-black leading-none">{professionalCount}</span>
          </button>
        </div>

        <button
          onClick={handleExportExcelWithAttachments}
          disabled={isExporting || finalDisplayApps.length === 0}
          className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-[0.1em] transition-all shadow-xl shadow-emerald-100 active:scale-95 disabled:active:scale-100 flex items-center space-x-2"
        >
          {isExporting ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span>處理中...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>匯出當前清單資料</span>
            </>
          )}
        </button>
      </div>

      {/* 明細清單 */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {finalDisplayApps.length === 0 ? (
            <div className="py-20 text-center text-slate-400">
              <p className="font-bold text-sm">目前沒有任何符合條件的申請資料</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/80 text-[10px] font-black uppercase tracking-widest">
                  <th className="px-6 py-4 text-xs text-slate-950 font-black">類別 / 申請人</th>
                  <th className="px-6 py-4 text-xs text-slate-950 font-black">課程對照 (原 ➜ 本)</th>
                  <th className="px-6 py-4 text-xs text-slate-950 font-black">學分 / 學期對照</th>
                  <th className="px-6 py-4 text-xs text-slate-950 font-black">附件檔案</th>
                  <th className="px-6 py-4 text-xs text-slate-950 font-black text-right">審核操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {finalDisplayApps.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-5">
                      <div className="flex items-center space-x-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-[10px] uppercase shadow-sm border ${app.courseCategory === '專業' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-purple-50 text-purple-700 border-purple-100'}`}>
                          {app.courseCategory?.charAt(0) || '專'}
                        </div>
                        <div>
                          <p className="font-black text-black text-base leading-tight">{app.username}</p>
                          <p className="text-[10px] text-slate-500 font-bold mt-0.5">{app.offeringUniversity}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="text-sm">
                        <span className="font-black text-black">{app.courseName}</span>
                        <span className="mx-2 text-slate-400">➜</span>
                        <span className="font-black text-indigo-700">{app.equivalentCourseName}</span>
                      </div>
                      {app.description && <p className="text-[10px] text-slate-500 mt-1 italic line-clamp-1">{app.description}</p>}
                    </td>
                    <td className="px-6 py-5">
                      <div className="text-[11px] font-black text-slate-950">{app.courseCredits}➜{app.waiverCredits} 學分</div>
                      <div className="text-[10px] text-slate-900 font-black mt-1.5 flex items-center">
                        <span className="bg-slate-100 px-1.5 py-0.5 rounded">{app.semesterTaken}</span>
                        <span className="mx-1.5 text-slate-400 text-xs">➜</span>
                        <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded">{app.waiverSemester}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-wrap gap-1.5 max-w-[250px]">
                        {app.attachments && app.attachments.length > 0 ? (
                          app.attachments.map((file, idx) => (
                            <button 
                              key={idx}
                              onClick={() => handleViewAttachment(file.name, file.data)}
                              className="flex items-center space-x-1.5 px-2.5 py-1 bg-slate-100 text-slate-900 rounded-lg hover:bg-indigo-600 hover:text-white transition-all border border-slate-200 group shadow-sm max-w-full"
                              title={file.name}
                            >
                              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                              </svg>
                              <span className="text-[10px] font-black truncate max-w-[100px]">{file.name}</span>
                            </button>
                          ))
                        ) : (
                          <span className="text-[10px] text-slate-400 font-bold italic">無附件</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex justify-end items-center space-x-2">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase shadow-sm border ${
                          app.status === ApplicationStatus.APPROVED ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                          app.status === ApplicationStatus.REJECTED ? 'bg-rose-100 text-rose-800 border-rose-200' :
                          'bg-amber-100 text-amber-800 border-amber-200'
                        }`}>
                          {app.status}
                        </span>
                        <div className="flex space-x-1">
                          <button 
                            onClick={() => onUpdateStatus(app.id, ApplicationStatus.APPROVED)}
                            disabled={app.status === ApplicationStatus.APPROVED}
                            className={`p-1.5 rounded-lg transition-all shadow-sm active:scale-90 ${app.status === ApplicationStatus.APPROVED ? 'bg-slate-100 text-slate-300' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                          </button>
                          <button 
                            onClick={() => onUpdateStatus(app.id, ApplicationStatus.REJECTED)}
                            disabled={app.status === ApplicationStatus.REJECTED}
                            className={`p-1.5 rounded-lg transition-all shadow-sm active:scale-90 ${app.status === ApplicationStatus.REJECTED ? 'bg-slate-100 text-slate-300' : 'bg-rose-600 text-white hover:bg-rose-700'}`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
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

export default AdminDashboard;
