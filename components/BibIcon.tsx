"use client";

import { BIB } from "@/lib/tokens";

export type IconName =
  | "send"
  | "book"
  | "check"
  | "plus"
  | "arrow"
  | "chat"
  | "paper"
  | "user"
  | "close"
  | "key"
  | "mail"
  | "person"
  | "pin"
  | "target"
  | "bolt"
  | "path"
  | "tag";

type Props = {
  name: IconName;
  size?: number;
  color?: string;
  stroke?: number;
};

export function BibIcon({
  name,
  size = 20,
  color = BIB.antraciet,
  stroke = 1.7,
}: Props) {
  const paths: Record<IconName, React.ReactNode> = {
    send: <path d="M4 12l16-8-6 16-2-7-8-1z" />,
    book: <path d="M4 5a2 2 0 012-2h14v16H6a2 2 0 00-2 2V5zM20 3v16" />,
    check: <path d="M5 12l4 4 10-10" />,
    plus: <path d="M12 5v14M5 12h14" />,
    arrow: <path d="M5 12h14m-6-6l6 6-6 6" />,
    chat: <path d="M4 6a2 2 0 012-2h12a2 2 0 012 2v9a2 2 0 01-2 2H9l-5 4V6z" />,
    paper: <path d="M6 3h9l4 4v14H6V3zm9 0v4h4" />,
    user: (
      <g>
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 20c1-3.5 4-5.5 7-5.5s6 2 7 5.5" />
      </g>
    ),
    close: <path d="M6 6l12 12M18 6l-12 12" />,
    key: (
      <g>
        <circle cx="8" cy="14" r="4" />
        <path d="M11 12l9-9m-4 0l4 0 0 4M15 7l3 3" />
      </g>
    ),
    mail: (
      <g>
        <rect x="3" y="6" width="18" height="12" rx="1.5" />
        <path d="M3 8l9 6 9-6" />
      </g>
    ),
    person: (
      <g>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
      </g>
    ),
    pin: (
      <g>
        <path d="M12 2a7 7 0 00-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 00-7-7z" />
        <circle cx="12" cy="9" r="2.5" />
      </g>
    ),
    target: (
      <g>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="12" cy="12" r="1.5" fill={color} stroke="none" />
      </g>
    ),
    bolt: <path d="M13 2L4 14h7l-1 8 9-12h-7z" />,
    path: <path d="M5 19l4-8 5 4 5-10" />,
    tag: (
      <g>
        <path d="M3 11V3h8l10 10-8 8L3 11z" />
        <circle cx="7.5" cy="7.5" r="1.2" fill={color} stroke="none" />
      </g>
    ),
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}
