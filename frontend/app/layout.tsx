import type { ReactNode } from "react";
import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "AI Content Workflow",
  description: "Challenge implementation for AI-assisted campaign content review.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <header className="site-header">
            <div>
              <p className="eyebrow">ACME Global Media</p>
              <h1>AI Content Workflow</h1>
            </div>
            <p className="header-copy">
              Minimal V1 foundation for campaign content, AI suggestions, review states, and realtime updates.
            </p>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
