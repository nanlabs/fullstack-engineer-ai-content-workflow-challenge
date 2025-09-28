import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { WebSocketProvider } from "@/components/websocket/WebSocketProvider";
import { ConnectionDebugger } from "@/components/websocket/ConnectionDebugger";
import { RealtimeStateProvider } from "@/contexts/RealtimeStateContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ACME AI Workflow",
  description: "AI-Powered Content Creation and Review Workflow",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable}  antialiased`}>
        <ToastProvider>
          <WebSocketProvider>
            <RealtimeStateProvider>
              {children}
              <ConnectionDebugger />
            </RealtimeStateProvider>
          </WebSocketProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
