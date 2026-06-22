import type { Metadata } from "next";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "AI Resume Copilot",
  description: "ATS-optimized resumes, locally.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body style={{ margin: 0, padding: 0, background: '#050811', color: '#e2e8f0', fontFamily: 'Inter, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
