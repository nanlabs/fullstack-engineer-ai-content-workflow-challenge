import { ReactNode } from "react";

function IconFrame({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      {children}
    </svg>
  );
}

export function DashboardIcon() {
  return (
    <IconFrame>
      <rect x="2" y="2" width="6" height="6" rx="1.2" fill="currentColor" />
      <rect x="12" y="2" width="6" height="6" rx="1.2" fill="currentColor" />
      <rect x="2" y="12" width="6" height="6" rx="1.2" fill="currentColor" />
      <rect x="12" y="12" width="6" height="6" rx="1.2" fill="currentColor" />
    </IconFrame>
  );
}

export function CampaignIcon() {
  return (
    <IconFrame>
      <path d="M4 9L16 4v9l-12 5V9Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M8 6.5v9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </IconFrame>
  );
}

export function SettingsIcon() {
  return (
    <IconFrame>
      <path d="M10 2.8l1.3 1.1 1.7-.3.7 1.6 1.7.5-.1 1.7 1.2 1.2-1.2 1.2.1 1.7-1.7.5-.7 1.6-1.7-.3-1.3 1.1-1.3-1.1-1.7.3-.7-1.6-1.7-.5.1-1.7L2.8 10l1.2-1.2-.1-1.7 1.7-.5.7-1.6 1.7.3L10 2.8Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <circle cx="10" cy="10" r="2.4" stroke="currentColor" strokeWidth="1.4" />
    </IconFrame>
  );
}

export function SearchIcon() {
  return (
    <IconFrame>
      <circle cx="9" cy="9" r="4.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12.5 12.5L17 17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </IconFrame>
  );
}

export function BellIcon() {
  return (
    <IconFrame>
      <path d="M10 3.5a3.4 3.4 0 0 1 3.4 3.4v2.3c0 .8.3 1.6.9 2.2l.8.8H4.9l.8-.8c.6-.6.9-1.4.9-2.2V6.9A3.4 3.4 0 0 1 10 3.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M8.3 15a1.9 1.9 0 0 0 3.4 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </IconFrame>
  );
}

export function UserIcon() {
  return (
    <IconFrame>
      <circle cx="10" cy="7.2" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4.8 16c.9-2.2 2.7-3.3 5.2-3.3s4.3 1.1 5.2 3.3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </IconFrame>
  );
}
