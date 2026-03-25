import Link from "next/link";
import { ReactNode } from "react";

import {
  BellIcon,
  CampaignIcon,
  DashboardIcon,
  SearchIcon,
  SettingsIcon,
  UserIcon,
} from "@/components/stitch-icons";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: DashboardIcon },
  { href: "/campaigns/new", label: "Campañas", icon: CampaignIcon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
] as const;

export function StitchShell({
  activeHref,
  pageTitle,
  children,
}: {
  activeHref: string;
  pageTitle: string;
  children: ReactNode;
}) {
  return (
    <div className="stitch-shell">
      <aside className="stitch-sidebar">
        <div className="stitch-brand">
          <h1>Editorial Workbench</h1>
          <p>The Precision Curator</p>
        </div>
        <nav className="stitch-nav">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`stitch-nav-item${activeHref === href ? " stitch-nav-item-active" : ""}`}
            >
              <Icon />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="stitch-profile">
          <div className="stitch-avatar">AR</div>
          <div>
            <strong>Alex Rivera</strong>
            <p>Senior Editor</p>
          </div>
        </div>
      </aside>
      <div className="stitch-main">
        <header className="stitch-topbar">
          <strong>{pageTitle}</strong>
          <div className="stitch-topbar-actions">
            <label className="stitch-search">
              <SearchIcon />
              <input readOnly value="" placeholder="Search campaigns..." />
            </label>
            <button type="button" className="stitch-icon-button" aria-label="Notifications">
              <BellIcon />
            </button>
            <button type="button" className="stitch-icon-button" aria-label="Profile">
              <UserIcon />
            </button>
          </div>
        </header>
        <div className="stitch-content">{children}</div>
      </div>
    </div>
  );
}
