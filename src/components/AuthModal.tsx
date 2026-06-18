import { useState } from "react";
import { X, Mail, Lock, User, Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuthContext } from "../contexts/AuthContext";

interface AuthModalProps {
  onClose: () => void;
  defaultMode?: "login" | "signup";
}

export default function AuthModal({ onClose, defaultMode = "login" }: AuthModalProps) {
  const { signIn, signUp, signInWithGoogle } = useAuthContext();
  const [mode, setMode] = useState<"login" | "signup">(defaultMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

  const handleGoogle = async () => {
    setGoogleLoading(true);
    setError(null);
    const { error: err } = await signInWithGoogle();
    if (err) { setError(err); setGoogleLoading(false); }
    // 성공 시 OAuth redirect 발생 — 페이지 이동
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* 배경 */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* 모달 패널 */}
      <div
        className="relative w-full max-w-sm rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
        style={{ background: "var(--color-surface)" }}
      >
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
              {/* 이름 (회원가입만) */}
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
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "#D4AF37"; }}
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
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "#D4AF37"; }}
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
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "#D4AF37"; }}
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

              {/* 구분선 */}
              <div className="flex items-center gap-3 py-1">
                <div className="flex-1 h-px" style={{ background: "var(--color-border)" }} />
                <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>또는</span>
                <div className="flex-1 h-px" style={{ background: "var(--color-border)" }} />
              </div>

              {/* 구글 로그인 */}
              <button
                onClick={handleGoogle}
                disabled={googleLoading}
                className="w-full py-3 rounded-lg font-semibold text-sm flex items-center justify-center gap-2.5 transition-all duration-200 active:scale-95 disabled:opacity-60 border"
                style={{
                  background: "var(--color-surface-2)",
                  color: "var(--color-text)",
                  borderColor: "var(--color-border)",
                }}
              >
                {googleLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <svg width="16" height="16" viewBox="0 0 48 48" fill="none">
                    <path d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" fill="#FFC107"/>
                    <path d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" fill="#FF3D00"/>
                    <path d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0124 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" fill="#4CAF50"/>
                    <path d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" fill="#1976D2"/>
                  </svg>
                )}
                Google로 계속하기
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
