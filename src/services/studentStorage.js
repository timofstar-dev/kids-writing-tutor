/**
 * 학생 명단을 localStorage에 저장 및 관리하는 서비스
 */

const STORAGE_KEY = 'kids_writing_students';

/**
 * 모든 학생 목록 가져오기
 * @returns {Array} 학생 객체 배열 [{ id, name, grade, createdAt }]
 */
export function getStudents() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.error('학생 명단 로딩 오류:', err);
    return [];
  }
}

/**
 * 학생 정보 저장 또는 업데이트
 * @param {Object} studentData - { id, name, grade } (id가 없으면 새로 생성)
 * @returns {Object} 저장된 학생 객체
 */
export function saveStudent(studentData) {
  try {
    const students = getStudents();
    
    if (studentData.id) {
      // 기존 학생 수정
      const index = students.findIndex(s => s.id === studentData.id);
      if (index !== -1) {
        students[index] = { ...students[index], ...studentData, updatedAt: new Date().toISOString() };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(students));
        return students[index];
      }
    }
    
    // 새 학생 추가
    const newStudent = {
      ...studentData,
      id: `student_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    students.push(newStudent);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(students));
    return newStudent;
  } catch (err) {
    console.error('학생 저장 오류:', err);
    throw err;
  }
}

/**
 * 특정 학생 삭제
 * @param {string} id - 삭제할 학생의 ID
 */
export function deleteStudent(id) {
  try {
    let students = getStudents();
    students = students.filter(s => s.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(students));
    return true;
  } catch (err) {
    console.error('학생 삭제 오류:', err);
    throw err;
  }
}
