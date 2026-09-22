import React, { useState, useEffect } from 'react';
import { X, UserPlus, User, Trash2, Edit2, Check, UserMinus, Upload, Download } from 'lucide-react';
import { getStudents, saveStudent, deleteStudent } from '../services/studentStorage';

export default function StudentManagementModal({ isOpen, onClose, onStudentsChange }) {
  const [students, setStudents] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editGrade, setEditGrade] = useState('초등 3~4학년');
  
  const [newName, setNewName] = useState('');
  const [newGrade, setNewGrade] = useState('초등 3~4학년');
  
  useEffect(() => {
    if (isOpen) {
      loadStudents();
    }
  }, [isOpen]);

  const loadStudents = () => {
    const data = getStudents();
    setStudents(data);
  };

  const handleAddStudent = (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    
    saveStudent({ name: newName.trim(), grade: newGrade });
    setNewName('');
    setNewGrade('초등 3~4학년');
    loadStudents();
    if (onStudentsChange) onStudentsChange();
  };

  const handleStartEdit = (student) => {
    setEditingId(student.id);
    setEditName(student.name);
    setEditGrade(student.grade);
  };

  const handleSaveEdit = () => {
    if (!editName.trim()) return;
    saveStudent({ id: editingId, name: editName.trim(), grade: editGrade });
    setEditingId(null);
    loadStudents();
    if (onStudentsChange) onStudentsChange();
  };

  const handleDelete = (id) => {
    if (confirm('이 학생을 명단에서 삭제하시겠습니까? (기존 첨삭 기록은 삭제되지 않습니다)')) {
      deleteStudent(id);
      loadStudents();
      if (onStudentsChange) onStudentsChange();
    }
  };

  const handleDownloadSample = () => {
    const csvContent = "이름,학년\n홍길동,초등 3~4학년\n이순신,초등 5~6학년\n유관순,중등 1~3학년";
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "학생명단_업로드_샘플.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCsvUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const lines = text.split('\n');
        let addedCount = 0;
        
        // 헤더 제외하고 1번 줄부터 시작
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          const parts = line.split(',');
          if (parts.length >= 2) {
            const name = parts[0].trim();
            const grade = parts[1].trim();
            if (name && grade) {
              saveStudent({ name, grade });
              addedCount++;
            }
          }
        }
        
        if (addedCount > 0) {
          alert(`${addedCount}명의 학생이 성공적으로 등록되었습니다.`);
          loadStudents();
          if (onStudentsChange) onStudentsChange();
        } else {
          alert('등록할 학생 정보가 없습니다. 양식을 확인해주세요.');
        }
      } catch (err) {
        alert('파일을 읽는 중 오류가 발생했습니다.');
        console.error(err);
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // 초기화
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden border-4 border-indigo-200">
        
        {/* 헤더 */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 p-2.5 rounded-2xl shadow-inner backdrop-blur-xs">
              <User className="w-6 h-6 text-indigo-100" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">학생 명단 관리</h2>
              <p className="text-indigo-100 text-xs sm:text-sm mt-0.5">첨삭할 학생들을 미리 등록해두고 편하게 선택하세요.</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 bg-slate-50 space-y-6">
          
          {/* 새 학생 추가 폼 */}
          <form onSubmit={handleAddStudent} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 w-full space-y-1.5">
              <label className="text-xs font-bold text-slate-500 ml-1">이름</label>
              <input 
                type="text" 
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="학생 이름 (예: 홍길동)" 
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-slate-700"
              />
            </div>
            <div className="flex-1 w-full space-y-1.5">
              <label className="text-xs font-bold text-slate-500 ml-1">학년</label>
              <select
                value={newGrade}
                onChange={(e) => setNewGrade(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-slate-700"
              >
                <option value="초등 1~2학년">초등 1~2학년</option>
                <option value="초등 3~4학년">초등 3~4학년</option>
                <option value="초등 5~6학년">초등 5~6학년</option>
                <option value="중등 1~3학년">중등 1~3학년</option>
              </select>
            </div>
            <button 
              type="submit"
              disabled={!newName.trim()}
              className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>추가</span>
            </button>
          </form>

          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
              <h3 className="text-sm font-bold text-slate-700">
                <span>등록된 학생 ({students.length}명)</span>
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadSample}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-semibold transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>엑셀/CSV 샘플 양식</span>
                </button>
                <label className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-colors cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>명단 일괄 업로드</span>
                  <input 
                    type="file" 
                    accept=".csv" 
                    className="hidden" 
                    onChange={handleCsvUpload}
                  />
                </label>
              </div>
            </div>
            
            {students.length === 0 ? (
              <div className="text-center py-10 bg-white rounded-2xl border border-slate-200 border-dashed">
                <UserMinus className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">등록된 학생이 없습니다.</p>
                <p className="text-slate-400 text-sm mt-1">위 폼에서 새 학생을 추가해주세요.</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {students.map((student) => (
                  <div key={student.id} className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between group hover:border-indigo-300 transition-colors">
                    {editingId === student.id ? (
                      <div className="flex-1 flex flex-col sm:flex-row gap-3">
                        <input 
                          type="text" 
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1 px-3 py-1.5 bg-slate-50 border border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <select
                          value={editGrade}
                          onChange={(e) => setEditGrade(e.target.value)}
                          className="flex-1 px-3 py-1.5 bg-slate-50 border border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="초등 1~2학년">초등 1~2학년</option>
                          <option value="초등 3~4학년">초등 3~4학년</option>
                          <option value="초등 5~6학년">초등 5~6학년</option>
                          <option value="중등 1~3학년">중등 1~3학년</option>
                        </select>
                        <div className="flex gap-2">
                          <button onClick={handleSaveEdit} className="p-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg"><Check className="w-4 h-4" /></button>
                          <button onClick={() => setEditingId(null)} className="p-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg"><X className="w-4 h-4" /></button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold text-lg">
                            {student.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 text-base">{student.name}</p>
                            <p className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full inline-block mt-0.5">{student.grade}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleStartEdit(student)}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="수정"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(student.id)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="삭제"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
