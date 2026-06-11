/**
 * Firebase Admin SDK 초기화 (서버 전용)
 *
 * Route Handler(서버)에서만 import 한다. 클라이언트 컴포넌트에서 import 금지.
 * - Firestore 관리자 쓰기 (채점 결과 저장 등)
 * - Auth 토큰 검증 (교사 권한 확인)
 * - Storage 관리자 접근
 *
 * 서비스 계정 키는 FIREBASE_ADMIN_* 환경변수로 주입한다.
 */
import "server-only";
import {
  cert,
  getApp,
  getApps,
  initializeApp,
  type App,
} from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage, type Storage } from "firebase-admin/storage";

function buildCredential() {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  // Vercel 환경변수에서는 줄바꿈이 \n 문자열로 들어오므로 실제 개행으로 복원
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase Admin 환경변수가 설정되지 않았습니다. " +
        "FIREBASE_ADMIN_PROJECT_ID / FIREBASE_ADMIN_CLIENT_EMAIL / FIREBASE_ADMIN_PRIVATE_KEY 를 확인하세요.",
    );
  }

  return {
    projectId,
    clientEmail,
    privateKey,
  };
}

// 중복 초기화 방지 (서버리스 콜드스타트/HMR 대비)
const adminApp: App = getApps().length
  ? getApp()
  : initializeApp({
      credential: cert(buildCredential()),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });

export const adminAuth: Auth = getAuth(adminApp);
export const adminDb: Firestore = getFirestore(adminApp);
export const adminStorage: Storage = getStorage(adminApp);

export { adminApp };

/**
 * 요청 Authorization 헤더의 Bearer ID 토큰을 검증해 교사 UID를 반환.
 * Route Handler에서 권한 확인용으로 사용한다.
 */
export async function verifyTeacher(authorizationHeader?: string | null) {
  if (!authorizationHeader?.startsWith("Bearer ")) {
    throw new Error("인증 토큰이 없습니다.");
  }
  const idToken = authorizationHeader.slice("Bearer ".length);
  return adminAuth.verifyIdToken(idToken);
}
