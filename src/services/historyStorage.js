/**
 * IndexedDB 기반 초등학생 글쓰기 첨삭 기록 영구 저장 서비스
 * - 브라우저를 닫거나 컴퓨터를 재부팅해도 영구 보관
 * - 용량 제한(5MB)이 있는 localStorage 대신 대용량 텍스트/첨삭/피드백 지원
 */

const DB_NAME = 'KidsWritingTutorDB';
const DB_VERSION = 1;
const STORE_NAME = 'essay_logs';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('studentName', 'studentName', { unique: false });
        store.createIndex('grade', 'grade', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * 모든 첨삭 기록 가져오기 (최신순 정렬)
 */
export async function getAllHistory() {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const items = request.result || [];
        // 최신 생성순으로 정렬
        items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        resolve(items);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('기록 로딩 오류:', err);
    return [];
  }
}

/**
 * 새로운 첨삭 기록 저장 또는 업데이트
 */
export async function saveHistoryItem(item) {
  try {
    const db = await openDB();
    const id = item.id || `log_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const record = {
      ...item,
      id,
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(record);

      request.onsuccess = () => resolve(record);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('기록 저장 오류:', err);
    throw err;
  }
}

/**
 * 특정 기록 삭제
 */
export async function deleteHistoryItem(id) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('기록 삭제 오류:', err);
    throw err;
  }
}

/**
 * 모든 기록 초기화
 */
export async function clearAllHistory() {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('기록 전체 비우기 오류:', err);
    throw err;
  }
}

/**
 * JSON 파일로 내보내기 (백업)
 */
export async function exportHistoryBackup() {
  const items = await getAllHistory();
  const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const dateStr = new Date().toISOString().slice(0, 10);
  a.download = `아이글쌤_첨삭기록_백업_${dateStr}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * JSON 백업 파일에서 복원하기
 */
export async function importHistoryBackup(jsonString) {
  try {
    const items = JSON.parse(jsonString);
    if (!Array.isArray(items)) throw new Error('유효하지 않은 백업 데이터 형식입니다.');

    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    for (const item of items) {
      if (item && item.id) {
        store.put(item);
      }
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(items.length);
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('백업 복원 오류:', err);
    throw err;
  }
}
