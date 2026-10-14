export type IconName =
  | "bread"
  | "calculator"
  | "jar"
  | "book"
  | "chef"
  | "timer"
  | "sun"
  | "moon"
  | "arrow"
  | "check"
  | "leaf"
  | "lock"
  | "unlock"
  | "reset"
  | "close"
  | "info"
  | "download"
  | "plus"
  | "pause"
  | "play";
const paths: Record<IconName, React.ReactNode> = {
  bread: (
    <>
      <path d="M4 19c-2-4-2-9 2-12s9-4 12-1 4 8 1 12c-3 3-10 4-15 1Z" />
      <path d="m8 7 3 4m2-6 3 4M6 12l3 4" />
    </>
  ),
  calculator: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="3" />
      <path d="M8 7h8M8 11h1m6 0h1m-8 4h1m6 0h1m-8 3h1m6 0h1" />
    </>
  ),
  jar: (
    <>
      <path d="M7 3h10v3H7zM7 6c0 3-2 3-2 6v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7c0-3-2-3-2-6M5 13c5-3 9 3 14 0" />
      <path d="M9 17h.01M14 10h.01M14 18h.01" />
    </>
  ),
  book: (
    <>
      <path d="M12 5v16M12 5C8 2 4 3 2 4v15c4-1 7-1 10 2 3-3 6-3 10-2V4c-2-1-6-2-10 1Z" />
      <path d="M5 8h4m6 0h4M5 12h4m6 0h4" />
    </>
  ),
  chef: (
    <>
      <path d="M7 15a5 5 0 0 1-2-9 5 5 0 0 1 7-3 5 5 0 0 1 7 3 5 5 0 0 1-2 9v6H7zM7 17h10" />
    </>
  ),
  timer: (
    <>
      <circle cx="12" cy="14" r="8" />
      <path d="M12 10v4l3 2M9 2h6m-3 0v4m6-1 2 2" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1" />
    </>
  ),
  moon: <path d="M21 13A9 9 0 0 1 11 3a9 9 0 1 0 10 10Z" />,
  arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
  check: <path d="m5 12 4 4L19 6" />,
  leaf: (
    <>
      <path d="M20 3C6 2 2 7 5 15s17 7 15-12ZM4 21 16 8" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10" width="14" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3" />
    </>
  ),
  unlock: (
    <>
      <rect x="5" y="10" width="14" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0m-4 7v3" />
    </>
  ),
  reset: (
    <>
      <path d="M3 10a9 9 0 1 1 1 8M3 4v6h6" />
    </>
  ),
  close: <path d="m6 6 12 12M6 18 18 6" />,
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6m0-10v.01" />
    </>
  ),
  download: (
    <>
      <path d="M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  pause: <path d="M9 5v14M15 5v14" />,
  play: <path d="m8 4 12 8-12 8z" />,
};
export function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
export function BreadArt() {
  return (
    <svg
      className="bread-art"
      viewBox="0 0 430 300"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id="crust"
          x1="130"
          y1="80"
          x2="300"
          y2="240"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#dbaa6b" />
          <stop offset="1" stopColor="#98603b" />
        </linearGradient>
        <pattern
          id="speckle"
          width="17"
          height="19"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="4" cy="6" r="1" fill="#fff3d9" opacity=".3" />
          <circle cx="12" cy="14" r=".7" fill="#5e371f" opacity=".22" />
        </pattern>
      </defs>
      <ellipse
        cx="226"
        cy="247"
        rx="153"
        ry="20"
        fill="#78563b"
        opacity=".10"
      />
      <path d="M66 203 128 123l237 64-70 82Z" fill="#e3d7be" />
      <path
        d="m78 201 218 56 55-61M90 195l213 54M99 186l213 54"
        stroke="#c8b996"
        strokeWidth="2"
        opacity=".6"
      />
      <path
        d="M99 198c-22-45 2-103 55-126 55-25 122-22 166 13 43 34 54 91 21 128-30 36-213 28-242-15Z"
        fill="url(#crust)"
      />
      <path
        d="M99 198c-22-45 2-103 55-126 55-25 122-22 166 13 43 34 54 91 21 128-30 36-213 28-242-15Z"
        fill="url(#speckle)"
      />
      <path d="M142 160c11-37 26-51 56-68-17 25-27 48-31 78Z" fill="#f2dab1" />
      <path d="M193 180c10-46 31-79 68-99-26 36-37 66-40 105Z" fill="#f2dab1" />
      <path d="M250 189c9-34 25-60 50-77-13 28-21 49-23 79Z" fill="#f2dab1" />
      <path
        d="M141 160c11-37 26-51 56-68m-4 88c10-46 31-79 68-99m-11 108c9-34 25-60 50-77"
        stroke="#764729"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M117 180c-10-43 26-86 64-97M288 211c18-3 34-9 42-23"
        stroke="#f7dfb7"
        opacity=".4"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <g stroke="#7c896b" strokeWidth="2" strokeLinecap="round">
        <path d="M54 240C62 190 42 129 30 104M49 199c-14-7-17-16-16-25 13 5 18 13 16 25Zm0-20c11-12 13-21 9-30-11 7-13 18-9 30Zm-7-20c-14-4-18-11-18-22 13 3 19 11 18 22Zm-5-21c9-11 8-20 4-28-9 9-10 17-4 28Z" />
      </g>
      <g fill="#b08551">
        <ellipse cx="116" cy="249" rx="3" ry="2" />
        <ellipse cx="327" cy="250" rx="2" ry="1.5" />
        <ellipse cx="345" cy="241" rx="3" ry="1.5" />
      </g>
    </svg>
  );
}
