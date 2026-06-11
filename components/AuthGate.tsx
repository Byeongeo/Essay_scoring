"use client";

/**
 * 로그인 가드. 미로그인 시 /login 으로 보내고, 인증된 교사에게만 children 을 보여준다.
 * 교사 전용 화면(과목/회차/채점/리포트)을 감싼다.
 */
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading, configured } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && configured && !user) {
      router.replace("/login");
    }
  }, [loading, configured, user, router]);

  if (!configured) {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center text-sm text-slate-500">
        Firebase 환경변수가 설정되지 않았습니다. README의 배포 가이드 3단계를 참고해
        <code className="mx-1 rounded bg-slate-100 px-1">NEXT_PUBLIC_FIREBASE_*</code>
        값을 입력하세요.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="px-6 py-20 text-center text-sm text-slate-400">
        불러오는 중…
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}
