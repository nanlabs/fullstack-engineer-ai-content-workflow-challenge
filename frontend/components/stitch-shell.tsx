import Link from "next/link";
import { ReactNode } from "react";

import {
  ArchiveIcon,
  BellIcon,
  CampaignIcon,
  HelpIcon,
  SearchIcon,
  SettingsIcon,
  UserIcon,
} from "@/components/stitch-icons";

const NAV_ITEMS = [
  { href: "/", label: "Campaigns", icon: CampaignIcon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
] as const;

const FOOTER_ITEMS = [
  { href: "#", label: "Help", icon: HelpIcon },
  { href: "#", label: "Archive", icon: ArchiveIcon },
] as const;

export function StitchShell({
  activeHref,
  pageTitle,
  pageSubtitle,
  children,
}: {
  activeHref: string;
  pageTitle: string;
  pageSubtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="stitch-shell">
      <aside className="stitch-sidebar">
        <div className="stitch-brand">
          <h1>Workbench</h1>
          <p>Marketing HQ</p>
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
        <nav className="stitch-nav stitch-nav-footer">
          {FOOTER_ITEMS.map(({ href, label, icon: Icon }) => (
            <Link key={label} href={href} className="stitch-nav-item">
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
          <div className="stitch-topbar-copy">
            <strong>{pageTitle}</strong>
            {pageSubtitle ? (
              <>
                <span className="stitch-topbar-separator" />
                <span className="stitch-topbar-subtitle">{pageSubtitle}</span>
              </>
            ) : null}
          </div>
          <div className="stitch-topbar-actions">
            <label className="stitch-search">
              <SearchIcon />
              <input readOnly value="" placeholder="Search components..." />
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
