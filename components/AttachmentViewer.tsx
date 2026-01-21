
import React, { useEffect, useState } from 'react';

interface AttachmentViewerProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  fileData?: string;
}

const AttachmentViewer: React.FC<AttachmentViewerProps> = ({ isOpen, onClose, fileName, fileData }) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && fileData && fileData.startsWith('data:application/pdf')) {
      try {
        // 解析 Base64
        const base64Parts = fileData.split(',');
        const contentType = base64Parts[0].split(':')[1].split(';')[0];
        const base64Data = base64Parts[1];

        // 轉換為二進位數據
        const byteCharacters = atob(base64Data);
        const byteArrays = [];

        for (let offset = 0; offset < byteCharacters.length; offset += 512) {
          const slice = byteCharacters.slice(offset, offset + 512);
          const byteNumbers = new Array(slice.length);
          for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          byteArrays.push(byteArray);
        }

        // 建立 Blob 並生成 URL
        const blob = new Blob(byteArrays, { type: contentType });
        const url = URL.createObjectURL(blob);
        setBlobUrl(url);

        // 清理函數：當組件關閉或數據變化時撤銷 URL
        return () => {
          URL.revokeObjectURL(url);
          setBlobUrl(null);
        };
      } catch (error) {
        console.error("PDF 轉換錯誤:", error);
      }
    } else {
      setBlobUrl(null);
    }
  }, [isOpen, fileData]);

  if (!isOpen) return null;

  const isImage = fileData?.startsWith('data:image/');
  const isPdf = fileData?.startsWith('data:application/pdf');

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-5xl h-[90vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
        <div className="px-8 py-4 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 truncate max-w-md">{fileName}</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">檔案內容預覽</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 bg-slate-100 overflow-hidden flex items-center justify-center">
          {!fileData ? (
            <div className="text-center space-y-4 bg-white p-12 rounded-3xl shadow-sm">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 17c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <p className="text-slate-500 font-bold">無法讀取附件內容</p>
            </div>
          ) : isImage ? (
            <div className="w-full h-full p-8 flex items-center justify-center overflow-auto">
              <img src={fileData} alt={fileName} className="max-w-full shadow-2xl rounded-lg border border-slate-200 bg-white" />
            </div>
          ) : isPdf ? (
            /* 使用 Blob URL 而非 Base64 data URI 以解決 Chrome 安全封鎖問題 */
            blobUrl ? (
              <iframe 
                src={`${blobUrl}#toolbar=1`} 
                title={fileName} 
                className="w-full h-full border-none bg-slate-100"
              />
            ) : (
              <div className="flex flex-col items-center justify-center space-y-3">
                <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                <p className="text-slate-500 font-bold text-sm">正在安全載入 PDF 文件...</p>
              </div>
            )
          ) : (
            <div className="text-center p-12 bg-white rounded-3xl border border-slate-200 shadow-sm">
              <p className="text-slate-600 font-bold mb-4">此檔案類型 ({fileName.split('.').pop()?.toUpperCase()}) 不支援直接預覽</p>
              <a 
                href={fileData} 
                download={fileName}
                className="inline-flex items-center space-x-2 bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>下載原始檔案</span>
              </a>
            </div>
          )}
        </div>
        
        <div className="px-8 py-5 bg-white border-t border-slate-100 flex justify-between items-center shrink-0">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">附件類型: {isPdf ? 'PDF 文件' : isImage ? '圖片格式' : '其他檔案'}</p>
          <button 
            onClick={onClose}
            className="px-12 py-3 bg-slate-900 text-white rounded-2xl font-black hover:bg-black transition-all active:scale-95 shadow-xl"
          >
            關閉檢視
          </button>
        </div>
      </div>
    </div>
  );
};

export default AttachmentViewer;
