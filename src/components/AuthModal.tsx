import { useEffect, useState } from "react";
import { X, Mail, Lock, User, Eye, EyeOff, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuthContext } from "../contexts/AuthContext";
import Portal from "./Portal";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: "login" | "signup";
}

export default function AuthModal({ isOpen, onClose, defaultMode = "login" }: AuthModalProps) {
  const { signIn, signUp } = useAuthContext();
  const [mode, setMode] = useState<"login" | "signup">(defaultMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showPwConfirm, setShowPwConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 모달이 열릴 때마다 탭/메시지 상태를 항상 호출 시점 모드로 동기화
  // (컴포넌트가 isOpen 토글 동안 계속 mount되어 있으므로 필요).
  // useEffect 대신 React 공식 권장 패턴인 "렌더링 중 상태 조정"을 사용
  // (https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes)
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setMode(defaultMode);
      setError(null);
      setSuccess(null);
    }
  }

  // 닫힌 뒤(퇴장 애니메이션 종료 후) 입력값 초기화
  useEffect(() => {
    if (isOpen) return;
    const t = setTimeout(() => {
      setEmail("");
      setPassword("");
      setPasswordConfirm("");
      setDisplayName("");
      setShowPw(false);
      setShowPwConfirm(false);
      setLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, [isOpen]);

  // body 스크롤 완전 차단 (모달 오픈 동안만)
  useEffect(() => {
    if (!isOpen) return;
    const scrollY = window.scrollY;
    const { body, documentElement } = document;
    const prev = {
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyLeft: body.style.left,
      bodyRight: body.style.right,
      bodyWidth: body.style.width,
      bodyOverflow: body.style.overflow,
      htmlOverflow: documentElement.style.overflow,
    };

    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.overflow = "hidden";
    documentElement.style.overflow = "hidden";

    return () => {
      body.style.position = prev.bodyPosition;
      body.style.top = prev.bodyTop;
      body.style.left = prev.bodyLeft;
      body.style.right = prev.bodyRight;
      body.style.width = prev.bodyWidth;
      body.style.overflow = prev.bodyOverflow;
      documentElement.style.overflow = prev.htmlOverflow;
      window.scrollTo(0, scrollY);
    };
  }, [isOpen]);

  // 가상 키보드 대응: visualViewport 실측 높이를 CSS 변수로 반영 (dvh 미지원 브라우저 폴백)
  // 모달이 열려있는 동안만 리스너 등록 → 키보드 열림 시 모달 자동 재배치
  useEffect(() => {
    if (!isOpen) return;
    const root = document.documentElement;
    const applyViewportHeight = () => {
      const vv = window.visualViewport;
      const h = vv ? vv.height : window.innerHeight;
      root.style.setProperty("--auth-vvh", `${h}px`);
    };
    applyViewportHeight();
    window.visualViewport?.addEventListener("resize", applyViewportHeight);
    window.addEventListener("resize", applyViewportHeight);
    window.addEventListener("orientationchange", applyViewportHeight);
    return () => {
      window.visualViewport?.removeEventListener("resize", applyViewportHeight);
      window.removeEventListener("resize", applyViewportHeight);
      window.removeEventListener("orientationchange", applyViewportHeight);
      root.style.removeProperty("--auth-vvh");
    };
  }, [isOpen]);

  const handleSubmit = async () => {
    setError(null);
    if (!email.trim() || !password.trim()) {
      setError("이메일과 비밀번호를 입력해주세요.");
      return;
    }
    if (mode === "signup" && password !== passwordConfirm) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }
    if (mode === "signup" && password.length < 6) {
      setError("비밀번호는 6자 이상이어야 합니다.");
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

  const switchMode = (m: "login" | "signup") => {
    setMode(m);
    setError(null);
    setSuccess(null);
  };

  const inputStyle: React.CSSProperties = {
    background: "var(--color-surface-2)",
    color: "var(--color-text)",
    borderColor: "var(--color-border)",
    fontSize: "16px", // iOS Safari 자동 확대 방지
  };

  return (
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <div
            className="auth-modal-overlay"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
          >
            {/* 배경 (Netflix 스타일 페이드) */}
            <motion.div
              className="auth-modal-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              onClick={onClose}
            />

            {/* 모달 패널: position fixed + top/left 50% + translate(-50%,-50%) (CSS) +
                scale/translateY 등장 모션 (framer-motion) */}
            <motion.div
              className="auth-modal-panel auth-modal-glass"
              initial={{ opacity: 0, scale: 0.92, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="auth-modal-scroll">
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
                    className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-white/10 flex-shrink-0"
                    style={{ color: "var(--color-text-muted)" }}
                    aria-label="닫기"
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
                        onClick={() => switchMode(m)}
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
                            placeholder="닉네임"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            autoComplete="nickname"
                            className="w-full pl-9 pr-4 py-3 rounded-lg outline-none border transition-colors"
                            style={inputStyle}
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
                          autoComplete="email"
                          inputMode="email"
                          className="w-full pl-9 pr-4 py-3 rounded-lg outline-none border transition-colors"
                          style={inputStyle}
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
                          onKeyDown={(e) => { if (e.key === "Enter" && mode === "login") handleSubmit(); }}
                          autoComplete={mode === "login" ? "current-password" : "new-password"}
                          className="w-full pl-9 pr-10 py-3 rounded-lg outline-none border transition-colors"
                          style={inputStyle}
                          onFocus={(e) => { e.currentTarget.style.borderColor = "#D4AF37"; }}
                          onBlur={(e) => { e.currentTarget.style.borderColor = "var(--color-border)"; }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPw((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2"
                          style={{ color: "var(--color-text-muted)" }}
                          aria-label={showPw ? "비밀번호 숨기기" : "비밀번호 보기"}
                        >
                          {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>

                      {/* 비밀번호 확인 (회원가입만) */}
                      {mode === "signup" && (
                        <div className="relative">
                          <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--color-text-muted)" }} />
                          <input
                            type={showPwConfirm ? "text" : "password"}
                            placeholder="비밀번호 확인"
                            value={passwordConfirm}
                            onChange={(e) => setPasswordConfirm(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
                            autoComplete="new-password"
                            className="w-full pl-9 pr-10 py-3 rounded-lg outline-none border transition-colors"
                            style={inputStyle}
                            onFocus={(e) => { e.currentTarget.style.borderColor = "#D4AF37"; }}
                            onBlur={(e) => { e.currentTarget.style.borderColor = "var(--color-border)"; }}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPwConfirm((v) => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2"
                            style={{ color: "var(--color-text-muted)" }}
                            aria-label={showPwConfirm ? "비밀번호 숨기기" : "비밀번호 보기"}
                          >
                            {showPwConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      )}

                      {/* 이메일 로그인/회원가입 버튼 */}
                      <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="btn-press w-full py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all duration-200 active:scale-95 disabled:opacity-60"
                        style={{ background: "#D4AF37", color: "#000" }}
                      >
                        {loading && <Loader2 size={16} className="animate-spin" />}
                        {mode === "login" ? "로그인" : "회원가입"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
