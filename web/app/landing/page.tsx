import type { Metadata } from "next";
import Link from "next/link";
import {
  Calendar,
  HardDrive,
  CloudSun,
  CalendarCheck,
  Users,
  MessageCircle,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Lock,
} from "lucide-react";

export const metadata: Metadata = {
  title: "캘박 — 흘러가지 않는 우리만의 기록",
  description:
    "추억과 일정을 날짜에 박제하는 프라이빗 공간. 사진은 멤버별 구글 드라이브에, 그날의 날씨까지 불변 스냅샷으로 박제합니다.",
};

const features = [
  {
    icon: Calendar,
    title: "날짜에 박제하는 캘린더",
    body: "그날의 모임을 캘린더 셀에 고정합니다. 흘려보내는 일정이 아니라, 박물관처럼 남는 기록.",
  },
  {
    icon: HardDrive,
    title: "사진은 각자의 드라이브에",
    body: "올린 사진은 멤버별 구글 드라이브로 복제됩니다. 누가 지워도 내 드라이브에 남은 추억은 사라지지 않아요.",
  },
  {
    icon: CloudSun,
    title: "그날의 날씨까지",
    body: "지난 날의 실제 날씨를 불변 스냅샷으로 박제합니다. “그날 22도, 맑음” 까지 영원히.",
  },
  {
    icon: CalendarCheck,
    title: "구글 캘린더 자동 푸시",
    body: "캘박에 박제한 모임이 내 구글 캘린더에도 종일 일정으로 들어옵니다. 따로 옮길 필요 없이.",
  },
  {
    icon: Users,
    title: "모임 단위 초대",
    body: "일정마다 부르는 사람이 다르니까. 그 모임에만 친구를 초대하고, 카톡으로 링크를 공유하세요.",
  },
  {
    icon: MessageCircle,
    title: "느긋한 댓글",
    body: "실시간 채팅의 압박 없이, 그날의 추억 위에 천천히 한마디씩 남기는 비동기 댓글.",
  },
];

const steps = [
  {
    n: "01",
    title: "구글로 시작",
    body: "로그인 한 번으로 사진 보관(드라이브)과 일정 동기화(캘린더) 준비 완료.",
  },
  {
    n: "02",
    title: "날짜에 박제",
    body: "캘린더에서 날짜를 탭하고 모임을 만들면, 그날이 우리만의 셀이 됩니다.",
  },
  {
    n: "03",
    title: "사진·날씨·댓글로 채우기",
    body: "사진을 올리고 한마디 남기면, 그날의 날씨와 함께 추억이 박제됩니다.",
  },
];

export default function LandingPage() {
  return (
    <div className="calbak-landing">
      {/* ── 플로팅 글래스 네비 ───────────────────────────── */}
      <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4 sm:pt-5">
        <nav className="ld-glassbar mx-auto flex max-w-5xl items-center justify-between rounded-full px-5 py-3 sm:px-6">
          <span className="flex items-center gap-2 text-base font-bold tracking-tight">
            <span className="ld-chip grid h-7 w-7 place-items-center rounded-lg">
              <Calendar size={15} className="text-[var(--ld-sage)]" />
            </span>
            캘박
          </span>
          <Link
            href="/login"
            className="ld-cta inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold"
          >
            시작하기
            <ArrowRight size={15} />
          </Link>
        </nav>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-5 sm:px-6">
        {/* ── 히어로 ─────────────────────────────────────── */}
        <section className="flex flex-col items-center pt-32 pb-20 text-center sm:pt-40 sm:pb-28">
          <span
            className="ld-reveal ld-glassbar inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium text-[var(--ld-ink-soft)]"
            style={{ animationDelay: "0.05s" }}
          >
            <Sparkles size={13} className="text-[var(--ld-gold)]" />
            흘러가지 않는 우리만의 기록
          </span>

          <h1
            className="ld-reveal mt-7 text-4xl font-bold leading-[1.18] tracking-tight sm:text-6xl"
            style={{ animationDelay: "0.12s" }}
          >
            추억과 일정을,
            <br />
            <span className="ld-grad-text">날짜에 박제하다</span>
          </h1>

          <p
            className="ld-reveal mt-6 max-w-xl text-base leading-relaxed text-[var(--ld-ink-soft)] sm:text-lg"
            style={{ animationDelay: "0.2s" }}
          >
            캘박은 친한 친구들끼리 추억과 일정을 날짜 단위로 박제하는 프라이빗
            공간입니다. 강처럼 흘려보내지 않고, 박물관처럼 고정합니다.
          </p>

          <div
            className="ld-reveal mt-9 flex flex-col items-center gap-3 sm:flex-row"
            style={{ animationDelay: "0.28s" }}
          >
            <Link
              href="/login"
              className="ld-cta inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold"
            >
              Google로 시작하기
              <ArrowRight size={16} />
            </Link>
            <a
              href="#features"
              className="ld-ghost inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-[var(--ld-ink)]"
            >
              어떤 앱인지 보기
            </a>
          </div>

          {/* 히어로 비주얼 — 박제된 셀 미니 카드 */}
          <div
            className="ld-reveal mt-16 w-full max-w-md"
            style={{ animationDelay: "0.36s" }}
          >
            <div className="ld-float">
              <div className="ld-card p-5 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[var(--ld-ink-soft)]">
                    2026년 5월 17일 · 토요일
                  </span>
                  <span className="ld-chip inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs text-[var(--ld-sage)]">
                    <CloudSun size={12} />
                    22° 맑음
                  </span>
                </div>
                <h3 className="mt-3 text-lg font-bold">한강 피크닉</h3>
                <p className="mt-1 flex items-center gap-1 text-sm text-[var(--ld-ink-soft)]">
                  여의도 한강공원
                </p>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="aspect-square rounded-xl bg-[linear-gradient(135deg,#2a3324,#1c2417)]" />
                  <div className="aspect-square rounded-xl bg-[linear-gradient(135deg,#33302a,#241f17)]" />
                  <div className="aspect-square rounded-xl bg-[linear-gradient(135deg,#26322c,#172419)]" />
                </div>
                <div className="mt-4 flex items-center gap-2 text-xs text-[var(--ld-ink-soft)]">
                  <MessageCircle size={13} />
                  <span>&ldquo;이날 진짜 좋았다&rdquo; · 댓글 4</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 컨셉 스트립 ─────────────────────────────────── */}
        <section className="border-y border-[var(--ld-line)] py-14 text-center">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--ld-sage)]">
            Concept
          </p>
          <p className="mx-auto mt-4 max-w-2xl text-2xl font-bold leading-snug sm:text-3xl">
            강이 아니라, <span className="ld-grad-text">박물관.</span>
          </p>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-[var(--ld-ink-soft)]">
            메신저의 대화는 흘러가 버립니다. 캘박의 모든 것은 그날 그 자리에 고정돼,
            언제 다시 와도 그대로 있습니다.
          </p>
        </section>

        {/* ── 기능 카드 (더블 베젤 글래스) ─────────────────── */}
        <section id="features" className="scroll-mt-24 py-20 sm:py-28">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              박제에 필요한 모든 것
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-[var(--ld-ink-soft)]">
              사진·날씨·일정·초대까지, 추억을 영원히 남기는 데 필요한 기능을
              갖췄습니다.
            </p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <article
                  key={f.title}
                  className="ld-card ld-reveal p-6"
                  style={{ animationDelay: `${0.05 * i}s` }}
                >
                  <span className="ld-chip grid h-11 w-11 place-items-center rounded-xl">
                    <Icon size={20} className="text-[var(--ld-sage)]" />
                  </span>
                  <h3 className="mt-5 text-lg font-bold">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--ld-ink-soft)]">
                    {f.body}
                  </p>
                </article>
              );
            })}
          </div>
        </section>

        {/* ── 동작 방식 ───────────────────────────────────── */}
        <section className="py-20 sm:py-24">
          <div className="text-center">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--ld-sage)]">
              How it works
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
              세 번이면 박제 완료
            </h2>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-3">
            {steps.map((s, i) => (
              <div
                key={s.n}
                className="ld-card ld-reveal p-7"
                style={{ animationDelay: `${0.08 * i}s` }}
              >
                <span className="ld-grad-text text-4xl font-black tracking-tight">
                  {s.n}
                </span>
                <h3 className="mt-4 text-lg font-bold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--ld-ink-soft)]">
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── 프라이버시 안심 ─────────────────────────────── */}
        <section className="pb-20">
          <div className="ld-card flex flex-col items-start gap-5 p-7 sm:flex-row sm:items-center sm:gap-7">
            <span className="ld-chip grid h-12 w-12 shrink-0 place-items-center rounded-xl">
              <ShieldCheck size={22} className="text-[var(--ld-sage)]" />
            </span>
            <div>
              <h3 className="flex items-center gap-2 text-lg font-bold">
                <Lock size={15} className="text-[var(--ld-gold)]" />
                딱 우리만, 안전하게
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--ld-ink-soft)]">
                앱은 자신이 만든 파일·일정에만 접근합니다. 기존 드라이브 파일이나
                개인 캘린더는 절대 들여다보지 않아요. 초대받은 친구만 그 모임을 볼
                수 있습니다.
              </p>
            </div>
          </div>
        </section>

        {/* ── 마지막 CTA ──────────────────────────────────── */}
        <section className="pb-24 text-center sm:pb-32">
          <div className="ld-card mx-auto max-w-2xl px-6 py-14 sm:px-10">
            <h2 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
              오늘의 하루도,
              <br />
              <span className="ld-grad-text">박제할 가치가 있어요</span>
            </h2>
            <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-[var(--ld-ink-soft)]">
              친한 친구들과 우리만의 캘박을 시작해보세요.
            </p>
            <Link
              href="/login"
              className="ld-cta mt-8 inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold"
            >
              Google로 시작하기
              <ArrowRight size={16} />
            </Link>
          </div>
        </section>
      </main>

      {/* ── 푸터 ───────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-[var(--ld-line)]">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 px-5 py-8 text-sm text-[var(--ld-ink-soft)] sm:flex-row sm:px-6">
          <span className="flex items-center gap-2 font-semibold text-[var(--ld-ink)]">
            <Calendar size={15} className="text-[var(--ld-sage)]" />
            캘박
          </span>
          <span>추억과 일정을 날짜에 박제하는 프라이빗 공간</span>
        </div>
      </footer>
    </div>
  );
}
