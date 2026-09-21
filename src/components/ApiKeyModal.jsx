import React, { useState } from 'react';
import { X, Key, Check, Zap, ExternalLink, ShieldCheck } from 'lucide-react';

export default function ApiKeyModal({ isOpen, onClose, apiKey, onSaveKey, modelName, onChangeModel }) {
  const [tempKey, setTempKey] = useState(apiKey || '');
  const [showSavedMsg, setShowSavedMsg] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveKey(tempKey.trim());
    setShowSavedMsg(true);
    setTimeout(() => {
      setShowSavedMsg(false);
      onClose();
    }, 800);
  };

  const AVAILABLE_MODELS = [
    { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash Lite (권장: 초고속, 안정적 & 손글씨 최적화)' },
    { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash Lite (고성능 경량 모델)' },
    { id: 'gemini-3.7-flash', name: 'Gemini 3.7 Flash (최신 차세대 플래시)' },
    { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash (고성능 모델)' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border-2 border-slate-200">
        
        {/* 헤더 */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="bg-indigo-500/20 p-2 rounded-xl text-indigo-400 border border-indigo-500/30">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Gemini API 키 및 AI 모델 설정</h3>
              <p className="text-xs text-slate-400">Google AI Studio 키로 손글씨 판독 및 실시간 첨삭 실행</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 바디 */}
        <div className="p-6 space-y-5">
          
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
              <span>Google Gemini API Key</span>
              <a 
                href="https://aistudio.google.com/app/apikey" 
                target="_blank" 
                rel="noreferrer"
                className="text-indigo-600 hover:underline flex items-center gap-1 font-normal text-[11px]"
              >
                무료 키 발급받기 <ExternalLink className="w-3 h-3" />
              </a>
            </label>
            <div className="relative">
              <input
                type="password"
                placeholder="AIzaSy... 또는 AQ.Ab... 키 입력"
                value={tempKey}
                onChange={(e) => setTempKey(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono text-slate-800"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              입력하신 키는 사용자의 브라우저 로컬 저장소에만 안전하게 보관됩니다.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              AI 분석 엔진 모델
            </label>
            <select
              value={modelName}
              onChange={(e) => onChangeModel(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              {AVAILABLE_MODELS.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

        </div>

        {/* 풋터 */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            {apiKey ? '🟢 키 설정 완료됨' : '⚪ 키 미설정'}
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5"
            >
              {showSavedMsg ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  저장 완료!
                </>
              ) : (
                '설정 저장'
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
