# FRAMIX — Premium Korean Short Drama OTT Platform

Netflix/Disney+ 스타일의 다크 골드 테마 프리미엄 쇼츠 드라마 OTT 플랫폼 UI입니다.
React 19 + TypeScript + Vite + Tailwind CSS v4 + React Router 기반으로 제작되었으며,
모바일 퍼스트(Mobile First) 반응형으로 구현되었습니다.

## 기술 스택

- React 19 + TypeScript
- Vite 8
- Tailwind CSS v4 (`@theme` 기반 디자인 토큰)
- React Router v7
- lucide-react 아이콘

## 실행 방법

```bash
npm install
npm run dev       # 개발 서버
npm run build     # 프로덕션 빌드 (tsc + vite build)
npm run preview   # 빌드 결과 미리보기
npm run lint      # ESLint 검사
```

## 디자인 시스템

`src/index.css`의 `@theme` 블록에 모든 디자인 토큰이 정의되어 있습니다.

| 토큰 | 값 | 용도 |
| --- | --- | --- |
| `--color-base` | `#050505` | 전체 배경 (Dark Black) |
| `--color-gold` | `#D4AF37` | 강조 색상 (Dark Gold) |
| `--color-surface` / `surface-2` / `surface-3` | 회색 계열 | 카드, 패널 배경 |
| `--color-text` / `text-dim` / `text-muted` | 흰색 계열 | 텍스트 위계 |

## 페이지 구조

| 라우트 | 페이지 | 설명 |
| --- | --- | --- |
| `/` | 홈 | 히어로 배너, 이어보기, 트렌딩, 추천, 신작, 장르별 추천 등 |
| `/drama/:id` | 작품 상세 | 시놉시스, 에피소드 목록, 출연/연출, 비슷한 작품 |
| `/watch/:id/:episodeId` | 플레이어 | 쇼츠 스타일 풀스크린 플레이어, 에피소드 드로어, VIP 잠금 |
| `/search` | 검색 | 키워드/장르 필터, 트렌딩·신작 쿼리 파라미터 지원 |
| `/my-list` | 내 보관함 | 찜한 작품 관리 (편집/삭제) |
| `/history` | 시청 기록 | 날짜별 시청 기록, 진행률, 삭제 |
| `/subscription` | 구독 | 베이직/프리미엄/VIP 요금제 비교 |
| `/admin` | 관리자 대시보드 | 통계, 인기 콘텐츠, 빠른 링크 |
| `/admin/upload` | 콘텐츠 업로드 | 작품/에피소드 등록 폼 |

## 데이터

모든 콘텐츠는 `src/data/mockData.ts`의 목 데이터로 구성되어 있으며,
포스터/배경 이미지는 `picsum.photos` placeholder 이미지를 사용합니다.
실제 서비스 연동 시 이 파일을 API 응답으로 대체하면 됩니다.

## 인증 관련

요구사항에 따라 로그인/회원가입/Supabase Auth 등 인증 기능은 포함되어 있지 않습니다.
현재는 UI/UX와 OTT 구조 완성에 집중되어 있습니다.
