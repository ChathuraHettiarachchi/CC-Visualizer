import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const ibmPlexSans = IBM_Plex_Sans({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-ibm-plex-sans",
});

const ibmPlexMono = IBM_Plex_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-ibm-plex-mono",
});

export const metadata: Metadata = {
  title: "cc-visualizer",
  description: "Real-time visualization of Claude Code agent sessions",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${ibmPlexSans.variable} ${ibmPlexMono.variable}`}
      style={{ height: "100%", overflow: "hidden" }}>
      <body style={{ height: "100%", overflow: "hidden", margin: 0, position: "relative" }}>
        {/* Ambient glow A — top-left cyan */}
        <div aria-hidden style={{
          position: "fixed", top: "5%", left: "15%",
          width: 520, height: 520, borderRadius: "50%",
          background: "rgba(97,208,255,0.16)",
          filter: "blur(80px)", opacity: 0.55,
          pointerEvents: "none", zIndex: 0,
        }} />
        {/* Ambient glow B — bottom-right teal */}
        <div aria-hidden style={{
          position: "fixed", bottom: "8%", right: "10%",
          width: 460, height: 460, borderRadius: "50%",
          background: "rgba(124,243,200,0.12)",
          filter: "blur(80px)", opacity: 0.55,
          pointerEvents: "none", zIndex: 0,
        }} />
        {/* Background grid */}
        <div aria-hidden style={{
          position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
          backgroundImage: `
            linear-gradient(rgba(134,178,255,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(134,178,255,0.04) 1px, transparent 1px)
          `,
          backgroundSize: "44px 44px",
          WebkitMaskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)",
          maskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)",
        }} />
        {/* Content */}
        <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column" }}>
          {children}
        </div>
      </body>
    </html>
  );
}
