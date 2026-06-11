/**
 * Firebase 클라이언트 SDK 초기화 (브라우저 측)
 *
 * NEXT_PUBLIC_ 접두사 환경변수만 사용한다. (브라우저 노출 OK)
 * - Auth: 교사 Google 로그인
 * - Firestore: 회차/루브릭/제출물 읽기·쓰기
 * - Storage: 스캔 PDF/페이지 이미지 업로드
 *
 * 주의: Gemini·Admin 키는 절대 여기서 사용하지 않는다. (서버 전용)
 */
import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const realConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/** 환경변수가 채워져 있는지 (배포 위저드/안내용) */
export const isFirebaseConfigured = Boolean(
  realConfig.apiKey && realConfig.projectId && realConfig.appId,
);

// 환경변수 미설정 상태(빌드/프리렌더 등)에서도 SDK 초기화가 throw 하지 않도록
// 플레이스홀더 설정으로 폴백한다. 실제 호출은 isFirebaseConfigured 가 true 일 때만 일어난다.
const firebaseConfig = isFirebaseConfigured
  ? realConfig
  : {
      apiKey: "demo-placeholder-key",
      authDomain: "demo.firebaseapp.com",
      projectId: "demo",
      storageBucket: "demo.appspot.com",
      messagingSenderId: "0",
      appId: "demo",
    };

// HMR/중복 초기화 방지
const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);

/** 교사 Google 로그인 프로바이더 */
export const googleProvider = new GoogleAuthProvider();

export { app };
