import { GoogleSignInButton } from "@/components/google-sign-in-button";

export default function LoginPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-surface px-8 py-12 text-center shadow-[0_8px_30px_rgba(42,38,34,0.06)]">
        <p className="text-sm font-medium tracking-wide text-accent">CalBak</p>
        <h1 className="mt-3 text-2xl font-bold tracking-tight">캘박 시작하기</h1>
        <p className="mt-3 leading-relaxed text-muted">
          추억과 일정을 날짜에 박제하는
          <br />
          프라이빗 공간
        </p>

        <div className="mt-8">
          <GoogleSignInButton />
        </div>

        <p className="mt-5 text-xs leading-relaxed text-muted">
          로그인 시 사진 보관을 위한 <b>구글 드라이브</b>와 일정 동기화를 위한{" "}
          <b>구글 캘린더</b> 접근을 함께 요청합니다. (앱이 만든 파일·일정에만
          접근)
        </p>
      </div>
    </main>
  );
}
