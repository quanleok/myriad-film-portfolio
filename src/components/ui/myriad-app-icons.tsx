import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

export function TavernIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      {...props}
    >
      <path d="M3 10.2 12 3l9 7.2v9.8a1 1 0 0 1-1 1h-5v-6.5H9V21H4a1 1 0 0 1-1-1v-9.8Zm3.9-.6h2.4V6.9h1.8v2.7h2V5.8h1.8v3.8h2.1V7.4h1.8v2.2h1.1l-8-6.4-8 6.4Z" />
    </svg>
  );
}

export function IronForgeIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      {...props}
    >
      <path d="M14.92 3.08a1 1 0 0 1 1.42 0l4.58 4.58a1 1 0 0 1 0 1.42l-1.38 1.38-1.42-1.42.67-.67-3.16-3.17-.67.67-1.42-1.41 1.38-1.38Zm-2.06 3.48 4.58 4.58-1.63 1.63-2.17-2.17-3.73 3.73h5.76a1 1 0 0 1 .89.55l2.11 4.22A1 1 0 0 1 17.78 20H4.22a1 1 0 0 1-.89-1.45l2.11-4.22a1 1 0 0 1 .89-.55h.76l5.77-5.77-2.12-2.11 1.12-1.12Zm-5.92 9.22-1.11 2.22h10.35l-1.11-2.22H6.94Z" />
    </svg>
  );
}

export function LettersIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      {...props}
    >
      <path d="M3.5 7.25 12 3l8.5 4.25v9.5L12 21l-8.5-4.25v-9.5Zm2 .86V15.6L12 18.85l6.5-3.25V8.11L12.7 11.7a1.5 1.5 0 0 1-1.4 0L5.5 8.11Zm1.94-.86L12 9.74l4.56-2.49L12 4.97 7.44 7.25Z" />
      <circle cx="12" cy="12.1" r="1.55" fill="var(--color-page, #050807)" />
    </svg>
  );
}

export function WatchExploreIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="m14.5 9.5-1.8 5.2-5.2 1.8 1.8-5.2 5.2-1.8Z" />
    </svg>
  );
}
