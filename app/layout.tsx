import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "AMP Prep: UDST Mathematics Placement Practice",
    template: "%s | AMP Prep",
  },
  description:
    "Prepare for the UDST Academic Mathematics Placement tests, AMP 1 and AMP 2, with original practice questions, worked solutions, and timed mock exams that mirror the real test interface.",
  openGraph: {
    title: "AMP Prep: UDST Mathematics Placement Practice",
    description:
      "Practice for the UDST AMP 1 and AMP 2 placement tests with original questions, full worked solutions, and timed mock exams.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
