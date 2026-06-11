"use client";

/**
 * Firestore 데이터 접근 계층 (클라이언트 SDK)
 *
 * 경로 (PROJECT_PLAN.md 5번):
 *   subjects/{subjectId}
 *   subjects/{subjectId}/assessments/{assessmentId}
 *   subjects/{subjectId}/assessments/{assessmentId}/rubric/main   (단일 문서)
 *
 * 정렬은 createdAt 복합색인을 피하려고 클라이언트에서 처리한다.
 */
import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase.client";
import type {
  Assessment,
  AssessmentWithId,
  Rubric,
  Subject,
  SubjectWithId,
  Submission,
  SubmissionWithId,
} from "./types";

const RUBRIC_DOC_ID = "main";

function tsToMillis(value: unknown): number | undefined {
  if (value instanceof Timestamp) return value.toMillis();
  if (typeof value === "number") return value;
  return undefined;
}

// ---------------------------------------------------------------------------
// Subjects
// ---------------------------------------------------------------------------
export async function listSubjects(ownerUid: string): Promise<SubjectWithId[]> {
  const q = query(collection(db, "subjects"), where("ownerUid", "==", ownerUid));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => {
      const data = d.data() as Subject;
      return { ...data, id: d.id, createdAt: tsToMillis((data as Subject).createdAt) };
    })
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
}

export async function createSubject(
  ownerUid: string,
  name: string,
): Promise<string> {
  const ref = await addDoc(collection(db, "subjects"), {
    name,
    ownerUid,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function deleteSubject(subjectId: string): Promise<void> {
  await deleteDoc(doc(db, "subjects", subjectId));
}

// ---------------------------------------------------------------------------
// Assessments
// ---------------------------------------------------------------------------
function assessmentsCol(subjectId: string) {
  return collection(db, "subjects", subjectId, "assessments");
}

export async function listAssessments(
  subjectId: string,
): Promise<AssessmentWithId[]> {
  const snap = await getDocs(assessmentsCol(subjectId));
  return snap.docs
    .map((d) => {
      const data = d.data() as Assessment;
      return {
        ...data,
        id: d.id,
        date: tsToMillis(data.date) ?? data.date,
        createdAt: tsToMillis(data.createdAt),
      };
    })
    .sort((a, b) => (b.date ?? 0) - (a.date ?? 0));
}

export async function getAssessment(
  subjectId: string,
  assessmentId: string,
): Promise<AssessmentWithId | null> {
  const ref = doc(db, "subjects", subjectId, "assessments", assessmentId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data() as Assessment;
  return {
    ...data,
    id: snap.id,
    date: tsToMillis(data.date) ?? data.date,
    createdAt: tsToMillis(data.createdAt),
  };
}

export async function createAssessment(
  subjectId: string,
  data: Assessment,
): Promise<string> {
  const ref = await addDoc(assessmentsCol(subjectId), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateAssessment(
  subjectId: string,
  assessmentId: string,
  data: Partial<Assessment>,
): Promise<void> {
  const ref = doc(db, "subjects", subjectId, "assessments", assessmentId);
  await updateDoc(ref, { ...data });
}

export async function deleteAssessment(
  subjectId: string,
  assessmentId: string,
): Promise<void> {
  await deleteDoc(doc(db, "subjects", subjectId, "assessments", assessmentId));
}

// ---------------------------------------------------------------------------
// Rubric  (subjects/{s}/assessments/{a}/rubric/main)
// ---------------------------------------------------------------------------
function rubricDoc(subjectId: string, assessmentId: string) {
  return doc(
    db,
    "subjects",
    subjectId,
    "assessments",
    assessmentId,
    "rubric",
    RUBRIC_DOC_ID,
  );
}

export async function getRubric(
  subjectId: string,
  assessmentId: string,
): Promise<Rubric | null> {
  const snap = await getDoc(rubricDoc(subjectId, assessmentId));
  if (!snap.exists()) return null;
  return snap.data() as Rubric;
}

export async function saveRubric(
  subjectId: string,
  assessmentId: string,
  rubric: Rubric,
): Promise<void> {
  await setDoc(rubricDoc(subjectId, assessmentId), rubric);
}

// ---------------------------------------------------------------------------
// Submissions  (subjects/{s}/assessments/{a}/submissions/{submissionId})
// ---------------------------------------------------------------------------
function submissionsCol(subjectId: string, assessmentId: string) {
  return collection(
    db,
    "subjects",
    subjectId,
    "assessments",
    assessmentId,
    "submissions",
  );
}

export async function createSubmission(
  subjectId: string,
  assessmentId: string,
  data: Submission,
): Promise<string> {
  const ref = await addDoc(submissionsCol(subjectId, assessmentId), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function listSubmissions(
  subjectId: string,
  assessmentId: string,
): Promise<SubmissionWithId[]> {
  const snap = await getDocs(submissionsCol(subjectId, assessmentId));
  return snap.docs
    .map((d) => {
      const data = d.data() as Submission;
      return { ...data, id: d.id, createdAt: tsToMillis(data.createdAt) };
    })
    .sort((a, b) => {
      // 학년 → 반 → 번호 순
      if (a.grade !== b.grade) return a.grade - b.grade;
      if (a.classNo !== b.classNo) return a.classNo - b.classNo;
      return a.studentNo - b.studentNo;
    });
}

export async function getSubmission(
  subjectId: string,
  assessmentId: string,
  submissionId: string,
): Promise<SubmissionWithId | null> {
  const ref = doc(
    db,
    "subjects",
    subjectId,
    "assessments",
    assessmentId,
    "submissions",
    submissionId,
  );
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { ...(snap.data() as Submission), id: snap.id };
}

export async function updateSubmission(
  subjectId: string,
  assessmentId: string,
  submissionId: string,
  data: Partial<Submission>,
): Promise<void> {
  const ref = doc(
    db,
    "subjects",
    subjectId,
    "assessments",
    assessmentId,
    "submissions",
    submissionId,
  );
  await updateDoc(ref, { ...data });
}

// ---------------------------------------------------------------------------
// 복사해서 만들기 — 회차 + 루브릭을 함께 복제 (clipo 패턴)
// ---------------------------------------------------------------------------
export async function copyAssessment(
  subjectId: string,
  sourceId: string,
): Promise<string> {
  const source = await getAssessment(subjectId, sourceId);
  if (!source) throw new Error("복사할 회차를 찾을 수 없습니다.");

  const { id: _omitId, createdAt: _omitCreated, ...rest } = source;
  const newId = await createAssessment(subjectId, {
    ...rest,
    title: `${source.title} (복사)`,
    date: Date.now(),
  });

  const rubric = await getRubric(subjectId, sourceId);
  if (rubric) await saveRubric(subjectId, newId, rubric);

  return newId;
}
