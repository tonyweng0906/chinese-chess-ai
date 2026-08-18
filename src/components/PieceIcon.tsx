import type { PieceType } from "../types";

export function PieceIcon({ type }: { type: PieceType }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 2.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg className="piece-icon" viewBox="0 0 48 48" aria-hidden="true">
      {type === "general" && <g {...common}>
        <path d="M10 19 16.5 9 24 17l7.5-8L38 19l-4 17H14Z" />
        <path d="M13 25h22M16 32h16" />
        <circle cx="24" cy="8" r="2" fill="currentColor" stroke="none" />
      </g>}
      {type === "advisor" && <g {...common}>
        <path d="M24 6 37 11v11c0 9-5.8 15.5-13 19-7.2-3.5-13-10-13-19V11Z" />
        <path d="m17 23 5 5 9-11" />
      </g>}
      {type === "elephant" && <g {...common}>
        <path d="M12 35c-2-5-2.5-12-.5-17 2.2-5.5 7.5-8.5 13.5-8.5 8 0 13 5 13 12 0 4.5-2.5 8-6.5 8-3 0-5-2-5-5" />
        <path d="M27 23v13h6M18 25v11h-5M13 16l-4-5M31 12l3-5" />
        <circle cx="29.5" cy="17.5" r="1.5" fill="currentColor" stroke="none" />
      </g>}
      {type === "horse" && <g {...common}>
        <path d="M13 38h25M16 33h18c-1-8-4-13-10-16l3-7-9 4-5 11 7 3" />
        <path d="M20 15c4 1 8 3 11 7" />
        <circle cx="19" cy="19" r="1.4" fill="currentColor" stroke="none" />
      </g>}
      {type === "rook" && <g {...common}>
        <path d="M11 39h26M14 34h20l-2-17H16ZM14 17V9h6v5h8V9h6v8" />
        <path d="M17 24h14" />
      </g>}
      {type === "cannon" && <g {...common}>
        <circle cx="17" cy="35" r="5" />
        <circle cx="33" cy="35" r="5" />
        <path d="m12 28 23-8 3 7-24 6M32 21l-2-7 6-2 2 8" />
        <path d="M20 29h13" />
      </g>}
      {type === "soldier" && <g {...common}>
        <path d="M13 20c1-7 5-11 11-11s10 4 11 11ZM10 20h28" />
        <path d="M24 21v19M17 40h14M16 28l8 5 8-5" />
        <path d="M33 8v31M29 12h8" />
      </g>}
    </svg>
  );
}
