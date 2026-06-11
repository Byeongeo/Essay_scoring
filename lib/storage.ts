"use client";

/**
 * Firebase Storage 업로드 헬퍼 (클라이언트)
 *
 * 페이지 이미지(data URL)를 Storage에 올리고, Firestore submission 에 저장할
 * "경로(path)"를 반환한다. 다운로드 URL은 뷰어에서 필요할 때 따로 받는다.
 */
import {
  getDownloadURL,
  ref,
  uploadString,
} from "firebase/storage";
import { storage } from "./firebase.client";

/** data URL 이미지를 주어진 경로에 업로드하고 그 경로를 반환 */
export async function uploadPageImage(
  path: string,
  dataUrl: string,
): Promise<string> {
  const r = ref(storage, path);
  await uploadString(r, dataUrl, "data_url");
  return path;
}

/** 저장된 Storage 경로 → 다운로드 가능한 URL (답안 뷰어용) */
export async function getImageUrl(path: string): Promise<string> {
  return getDownloadURL(ref(storage, path));
}
