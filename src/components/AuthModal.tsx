import { useState, useEffect, useRef } from "react";
import { X, Mail, Lock, User, Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuthContext } from "../contexts/AuthContext";

interface AuthModalProps {
  onClose: () => void;
  defaultMode?: "login" | "signup";
}

export default function AuthModal({ onClose, defaultMode = "login" }: AuthModalProps) {
  const { signIn, signUp } = useAuthContext();
  const [mode, setMode] = useState<"login" | "signup">(defaultMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // body 스크롤 잠금 + iOS/Android 키보드 대응 (모달 오픈 동안 배경 고정)
  useEffect(() => {
    const scrollY = window.scrollY;
    const { body } = document;
    const prevPosition = body.style.position;
    const prevTop = body.style.top;
    const prevWidth = body.style.width;
    const prevOverflow = body.style.overflow;

    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
    body.style.overflow = "hidden";

    return () => {
      body.style.position = prevPosition;
      body.style.top = prevTop;
      body.style.width = prevWidth;
      body.style.overflow = prevOverflow;
      window.scrollTo(0, scrollY);
    };
  }, []);

  // 모바일 가상 키보드 대응: visualViewport 기준으로 실제 보이는 높이를 CSS 변수로 갱신
  useEffect(() => {
    const setVh = () => {
      const vv = window.visualViewport;
      const h = vv ? vv.height : window.innerHeight;
      if (overlayRef.current) {
        overlayRef.current.style.setProperty("--auth-modal-vh", `${h}px`);
      }
    };
    setVh();
    window.visualViewport?.addEventListener("resize", setVh);
    window.addEventListener("resize", setVh);
    window.addEventListener("orientationchange", setVh);
    return () => {
      window.visualViewport?.removeEventListener("resize", setVh);
      window.removeEventListener("resize", setVh);
      window.removeEventListener("orientationchange", setVh);
    };
  }, []);

  const handleSubmit = async () => {
    setError(null);
    if (!email.trim() || !password.trim()) {
      setError("이메일과 비밀번호를 입력해주세요.");
      return;
    }
    setLoading(true);
    if (mode === "login") {
      const { error: err } = await signIn(email, password);
      if (err) setError(err);
      else onClose();
    } else {
      const { error: err } = await signUp(email, password, displayName);
      if (err) setError(err);
      else setSuccess("인증 이메일을 발송했습니다. 이메일을 확인해주세요.");
    }
    setLoading(false);
  };



  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{
        height: "var(--auth-modal-vh, 100dvh)",
        minHeight: "var(--auth-modal-vh, 100dvh)",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* 배경 */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* 모달 패널 */}
      <div
        className="relative w-full max-w-sm rounded-2xl border border-white/10 shadow-2xl flex flex-col"
        style={{
          background: "var(--color-surface)",
          maxHeight: "calc(var(--auth-modal-vh, 100dvh) - 32px)",
        }}
      >
        {/* 스크롤 가능 영역 (헤더 + 폼 전체) */}
        <div className="overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: "touch" }}>
        {/* 상단 헤더 */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div>
            <span className="text-xl font-black tracking-tight" style={{ color: "#D4AF37" }}>
              FRAMIX
            </span>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
              {mode === "login" ? "로그인하고 계속 시청하세요" : "지금 가입하고 무료로 시작하세요"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-white/10"
            style={{ color: "var(--color-text-muted)" }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 pb-6 space-y-3">
          {/* 탭 */}
          <div className="flex rounded-lg overflow-hidden border border-white/10 mb-4">
            {(["login", "signup"] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(null); setSuccess(null); }}
                className="flex-1 py-2 text-sm font-semibold transition-all duration-200"
                style={{
                  background: mode === m ? "#D4AF37" : "transparent",
                  color: mode === m ? "#000" : "var(--color-text-muted)",
                }}
              >
                {m === "login" ? "로그인" : "회원가입"}
              </button>
            ))}
          </div>

          {/* 성공 메시지 */}
          {success && (
            <div className="rounded-lg px-4 py-3 text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
              {success}
            </div>
          )}

          {/* 에러 메시지 */}
          {error && (
            <div className="rounded-lg px-4 py-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20">
              {error}
            </div>
          )}

          {!success && (
            <>
              {/* 닉네임 (회원가입만) */}
              {mode === "signup" && (
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--color-text-muted)" }} />
                  <input
                    type="text"
                    placeholder="닉네임 (선택)"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full pl-9 pr-4 py-3 rounded-lg text-sm outline-none border transition-colors"
                    style={{
                      background: "var(--color-surface-2)",
                      color: "var(--color-text)",
                      borderColor: "var(--color-border)",
                      fontSize: "16px",
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "#D4AF37"; setTimeout(() => e.currentTarget.scrollIntoView({ block: "center", behavior: "smooth" }), 150); }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "var(--color-border)"; }}
                  />
                </div>
              )}

              {/* 이메일 */}
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--color-text-muted)" }} />
                <input
                  type="email"
                  placeholder="이메일"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
                  className="w-full pl-9 pr-4 py-3 rounded-lg text-sm outline-none border transition-colors"
                  style={{
                    background: "var(--color-surface-2)",
                    color: "var(--color-text)",
                    borderColor: "var(--color-border)",
                    fontSize: "16px",
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "#D4AF37"; setTimeout(() => e.currentTarget.scrollIntoView({ block: "center", behavior: "smooth" }), 150); }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "var(--color-border)"; }}
                />
              </div>

              {/* 비밀번호 */}
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--color-text-muted)" }} />
                <input
                  type={showPw ? "text" : "password"}
                  placeholder="비밀번호 (6자 이상)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
                  className="w-full pl-9 pr-10 py-3 rounded-lg text-sm outline-none border transition-colors"
                  style={{
                    background: "var(--color-surface-2)",
                    color: "var(--color-text)",
                    borderColor: "var(--color-border)",
                    fontSize: "16px",
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "#D4AF37"; setTimeout(() => e.currentTarget.scrollIntoView({ block: "center", behavior: "smooth" }), 150); }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "var(--color-border)"; }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* 이메일 로그인/회원가입 버튼 */}
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all duration-200 active:scale-95 disabled:opacity-60"
                style={{ background: "#D4AF37", color: "#000" }}
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                {mode === "login" ? "로그인" : "회원가입"}
              </button>

            </>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
