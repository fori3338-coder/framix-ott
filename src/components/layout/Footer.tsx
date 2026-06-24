/**
 * Footer — FRAMIX Luxury OTT Footer (new component)
 * 멀티 컬럼 링크 그리드 + 브랜드 마크 + 소셜 + 법적 고지.
 */
import { Link } from "react-router-dom";
import { useState } from "react";

const COLUMNS: { title: string; links: { label: string; to: string }[] }[] = [
  {
    title: "둘러보기",
    links: [
      { label: "홈", to: "/" },
      { label: "인기 작품", to: "/search?cat=trending" },
      { label: "신작", to: "/search?cat=new" },
      { label: "내 목록", to: "/my-list" },
    ],
  },
  {
    title: "FRAMIX",
    links: [
      { label: "구독 안내", to: "/subscription" },
      { label: "FRAMIX ORIGINAL", to: "/" },
      { label: "기기 지원", to: "/" },
      { label: "콘텐츠 파트너십", to: "/" },
    ],
  },
  {
    title: "고객지원",
    links: [
      { label: "고객센터", to: "/" },
      { label: "1:1 문의", to: "/" },
      { label: "공지사항", to: "/" },
      { label: "자주 묻는 질문", to: "/" },
    ],
  },
  {
    title: "약관",
    links: [
      { label: "이용약관", to: "/" },
      { label: "개인정보처리방침", to: "/" },
      { label: "청소년보호정책", to: "/" },
      { label: "쿠키 설정", to: "/" },
    ],
  },
];

export default function Footer() {
  const [openCol, setOpenCol] = useState<string | null>(null);

  const toggleCol = (title: string) => {
    setOpenCol((prev) => (prev === title ? null : title));
  };

  return (
    <footer className="fxf">
      <div className="fxf-glow" />
      <div className="fxf-inner">
        <div className="fxf-top">
          <div className="fxf-brand-col">
            <div className="fxf-logo">FRAMI<span>X</span></div>
            <p className="fxf-tagline">프리미엄 K-드라마 스트리밍.<br />당신의 다음 이야기를 FRAMIX에서.</p>
            <div className="fxf-socials">
              {["IG", "YT", "X", "FB"].map((s) => (
                <span key={s} className="fxf-social">{s}</span>
              ))}
            </div>
          </div>

          {/* Desktop: grid cols */}
          <div className="fxf-cols fxf-desktop-cols">
            {COLUMNS.map((col) => (
              <div key={col.title} className="fxf-col">
                <h4 className="fxf-col-title">{col.title}</h4>
                <ul className="fxf-col-list">
                  {col.links.map((l) => (
                    <li key={l.label}><Link to={l.to} className="fxf-link">{l.label}</Link></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Mobile: accordion cols */}
          <div className="fxf-accordion">
            {COLUMNS.map((col) => (
              <div key={col.title} className="fxf-acc-item">
                <button
                  className="fxf-acc-header"
                  onClick={() => toggleCol(col.title)}
                  aria-expanded={openCol === col.title}
                >
                  <span>{col.title}</span>
                  <span className={`fxf-acc-chevron ${openCol === col.title ? "open" : ""}`}>›</span>
                </button>
                {openCol === col.title && (
                  <ul className="fxf-col-list fxf-acc-body">
                    {col.links.map((l) => (
                      <li key={l.label}><Link to={l.to} className="fxf-link">{l.label}</Link></li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="fxf-divider" />

        <div className="fxf-bottom">
          <p className="fxf-copy">© 2025 FRAMIX. All rights reserved.</p>
          <p className="fxf-legal">본 서비스의 모든 콘텐츠는 저작권법에 의해 보호됩니다.</p>
        </div>
      </div>

      <style>{`
        .fxf{position:relative;margin-top:40px;padding:clamp(40px,5vw,72px) clamp(20px,6vw,118px) 40px;
          background:linear-gradient(to bottom,transparent,rgba(255,62,108,.04) 30%,#080a0e);
          border-top:1px solid rgba(255,255,255,.06);overflow:hidden}
        .fxf-glow{position:absolute;top:0;left:50%;transform:translateX(-50%);width:60%;height:1px;
          background:linear-gradient(to right,transparent,rgba(255,62,108,.6),transparent);
          box-shadow:0 0 24px 2px rgba(255,62,108,.35)}
        .fxf-inner{max-width:1280px;margin:0 auto}
        .fxf-top{display:flex;flex-wrap:wrap;gap:clamp(28px,5vw,64px);justify-content:space-between}
        .fxf-brand-col{max-width:300px;min-width:220px}
        .fxf-logo{font-size:30px;font-weight:900;letter-spacing:.06em;color:#fff}
        .fxf-logo span{color:#ff3e6c}
        .fxf-tagline{margin:14px 0 18px;font-size:13px;line-height:1.7;color:rgba(255,255,255,.5)}
        .fxf-socials{display:flex;gap:10px}
        .fxf-social{display:grid;place-items:center;width:38px;height:38px;border-radius:11px;
          font-size:11px;font-weight:800;color:rgba(255,255,255,.7);
          background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);cursor:pointer;transition:all .2s ease}
        .fxf-social:hover{background:rgba(255,62,108,.16);border-color:rgba(255,62,108,.4);color:#fff}
        .fxf-cols{display:grid;grid-template-columns:repeat(4,minmax(110px,1fr));gap:clamp(20px,4vw,56px)}
        .fxf-col-title{font-size:12px;font-weight:800;letter-spacing:.08em;color:rgba(255,255,255,.85);margin:0 0 14px;text-transform:uppercase}
        .fxf-col-list{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:11px}
        .fxf-link{font-size:13px;color:rgba(255,255,255,.5);text-decoration:none;transition:color .18s ease}
        .fxf-link:hover{color:#fff}
        .fxf-divider{height:1px;background:rgba(255,255,255,.07);margin:clamp(28px,4vw,48px) 0 22px}
        .fxf-bottom{display:flex;flex-wrap:wrap;gap:6px 18px;align-items:center;justify-content:space-between}
        .fxf-copy{font-size:12px;color:rgba(255,255,255,.55);margin:0;font-weight:600}
        .fxf-legal{font-size:12px;color:rgba(255,255,255,.32);margin:0}

        /* Accordion — mobile only */
        .fxf-accordion{display:none;width:100%}
        .fxf-desktop-cols{display:grid}
        .fxf-acc-item{border-bottom:1px solid rgba(255,255,255,.07)}
        .fxf-acc-header{display:flex;align-items:center;justify-content:space-between;width:100%;
          padding:14px 0;background:none;border:0;color:rgba(255,255,255,.85);
          font-size:13px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;cursor:pointer}
        .fxf-acc-chevron{font-size:18px;color:rgba(255,255,255,.4);transition:transform .25s ease;line-height:1;display:inline-block}
        .fxf-acc-chevron.open{transform:rotate(90deg)}
        .fxf-acc-body{padding:4px 0 14px;gap:13px}

        @media(max-width:680px){
          .fxf{padding:28px 18px 32px}
          .fxf-brand-col{min-width:unset;max-width:100%;width:100%}
          .fxf-top{gap:16px}
          .fxf-logo{font-size:24px}
          .fxf-tagline{font-size:12px;margin:10px 0 12px}
          .fxf-desktop-cols{display:none!important}
          .fxf-accordion{display:block}
          .fxf-bottom{flex-direction:column;align-items:flex-start;gap:4px}
        }
      `}</style>
    </footer>
  );
}
