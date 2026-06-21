import type { ReactNode } from "react";
import { createPortal } from "react-dom";

interface PortalProps {
  children: ReactNode;
}

/**
 * document.body 최상위로 children을 렌더링.
 *
 * 목적: 모바일에서 로그인/회원가입 모달이 화면 하단에 고정되어 비밀번호 입력이
 * 불가능했던 근본 원인 수정.
 *
 * 원인: BottomNav, (스크롤 시) Header에 backdrop-blur(backdrop-filter)가
 * 적용되어 있는데, backdrop-filter / filter / transform / perspective /
 * will-change 속성이 걸린 조상 요소는 그 자손에 대해 새로운 containing block을
 * 생성한다(CSS 스펙). 이 때문에 AuthModal이 `position: fixed`를 사용해도
 * 뷰포트 기준이 아니라 BottomNav(화면 하단의 좁은 nav bar 박스) 기준으로
 * 배치되어, 모달 전체가 하단 nav bar 높이 안으로 짓눌려 렌더링되었다.
 *
 * 해결: AuthModal을 Header/BottomNav 트리 밖, document.body 직계 자식으로
 * portal 처리하여 fixed 포지셔닝의 containing block을 항상 뷰포트로 고정한다.
 *
 * 이 프로젝트는 CSR 전용 Vite SPA(createRoot, hydrateRoot 아님)이므로
 * document는 컴포넌트 렌더 시점에 항상 사용 가능 → mounted state/effect 불필요.
 */
export default function Portal({ children }: PortalProps) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}
