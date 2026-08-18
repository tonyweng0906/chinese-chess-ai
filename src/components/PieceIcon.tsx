import type { PieceType } from "../types";

export function PieceIcon({ type }: { type: PieceType }) {
  return (
    <svg className="piece-icon" viewBox="0 0 64 64" aria-hidden="true">
      {type === "general" && <>
        <circle cx="32" cy="9" r="4" fill="currentColor" />
        <path fill="currentColor" d="m9 23 10-12 13 13 13-13 10 12-7 26H16Zm7 30h32v5H16Z" />
        <path d="M19 35h26M22 43h20" fill="none" stroke="var(--piece-icon-cutout)" strokeWidth="3.5" strokeLinecap="round" />
      </>}
      {type === "advisor" && <>
        <path fill="currentColor" fillRule="evenodd" d="M32 5 52 13v16c0 14-8 24-20 30C20 53 12 43 12 29V13Zm0 13-8 9 8 13 8-13Z" />
        <circle cx="32" cy="27" r="3" fill="currentColor" />
      </>}
      {type === "elephant" && <>
        <path fill="currentColor" d="M7 51V31C7 16 18 8 34 8c14 0 23 8 23 21v17c0 8-4 13-11 13-6 0-10-4-10-10h7c0 3 1 4 3 4 3 0 4-2 4-7V31h-8v20h-8V37H23v14h-8V34H7Z" />
        <path d="M36 18c-7 1-10 6-9 13 7 1 12-3 13-10" fill="var(--piece-icon-cutout)" />
        <circle cx="47" cy="21" r="2.5" fill="var(--piece-icon-cutout)" />
        <path fill="currentColor" d="m49 31 10 4-10 6Z" />
      </>}
      {type === "horse" && <>
        <path fill="currentColor" d="M10 55h45v5H10Zm7-6h33c-1-12-6-22-17-29l7-14-19 9-10 25 15 6-5 3Z" />
        <path fill="var(--piece-icon-cutout)" d="m19 35 8-15c7 2 13 6 18 12-7-4-13-5-19-3l-3 8Z" />
        <circle cx="25" cy="22" r="2.7" fill="var(--piece-icon-cutout)" />
      </>}
      {type === "rook" && <>
        <path fill="currentColor" d="M10 54h44v6H10Zm5-6h34l-4-28H19Zm1-33V6h9v7h14V6h9v9l-4 5H20Z" />
        <path d="M22 31h20" stroke="var(--piece-icon-cutout)" strokeWidth="4" strokeLinecap="round" />
      </>}
      {type === "cannon" && <>
        <circle cx="17" cy="51" r="7" fill="currentColor" />
        <circle cx="47" cy="51" r="7" fill="currentColor" />
        <path fill="currentColor" d="m8 37 41-15 6 12-42 15Zm35-13-4-13 12-4 5 14Z" />
        <path d="M22 42h27" stroke="var(--piece-icon-cutout)" strokeWidth="3.5" strokeLinecap="round" />
      </>}
      {type === "soldier" && <>
        <path fill="currentColor" d="M32 6c9 0 16 7 16 16 0 5-2 9-6 12l9 22H13l9-22c-4-3-6-7-6-12 0-9 7-16 16-16Z" />
        <path fill="currentColor" d="M7 25h50v6H7Zm22 8h6v27h-6Z" />
        <path d="m23 44 9 6 9-6" fill="none" stroke="var(--piece-icon-cutout)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      </>}
    </svg>
  );
}
