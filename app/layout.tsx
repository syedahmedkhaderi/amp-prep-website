import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { CONTACT_EMAIL } from "@/lib/legal";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

const siteUrl = SITE_URL;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "AMP Prep: UDST Mathematics Placement Practice",
    template: "%s | AMP Prep",
  },
  description:
    "Prepare for the UDST Academic Mathematics Placement tests, AMP 1 and AMP 2, with original practice questions, worked solutions, and timed mock exams that mirror the real test interface.",
  applicationName: "AMP Prep",
  alternates: { canonical: "/" },
  openGraph: {
    title: "AMP Prep: UDST Mathematics Placement Practice",
    description:
      "Practice for the UDST AMP 1 and AMP 2 placement tests with original questions, full worked solutions, and timed mock exams.",
    type: "website",
    siteName: "AMP Prep",
    locale: "en_US",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "AMP Prep: UDST Mathematics Placement Practice",
    description:
      "Practice for the UDST AMP 1 and AMP 2 placement tests with original questions, full worked solutions, and timed mock exams.",
  },
  robots: { index: true, follow: true },
};

/**
 * Structured data. Search engines use this to render the site as a known
 * educational resource rather than an unidentified page, and it is where the
 * non-affiliation with UDST is stated in machine-readable form.
 */
const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "EducationalOrganization",
      "@id": `${siteUrl}/#organization`,
      name: "AMP Prep",
      url: siteUrl,
      description:
        "An independent study platform for the UDST Academic Mathematics Placement tests. Not affiliated with, endorsed by, or connected to the University of Doha for Science and Technology.",
      email: CONTACT_EMAIL,
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      url: siteUrl,
      name: "AMP Prep",
      publisher: { "@id": `${siteUrl}/#organization` },
      inLanguage: "en",
    },
    {
      "@type": "Course",
      name: "AMP 1: Academic Mathematics Placement practice",
      description:
        "Practice questions, worked solutions, and timed mock exams covering basic high school mathematics for the UDST AMP 1 placement test.",
      provider: { "@id": `${siteUrl}/#organization` },
      url: `${siteUrl}/about`,
      educationalLevel: "Secondary",
      inLanguage: "en",
      hasCourseInstance: {
        "@type": "CourseInstance",
        courseMode: "online",
        courseWorkload: "PT20H",
      },
    },
    {
      "@type": "Course",
      name: "AMP 2: Advanced Mathematics Placement practice",
      description:
        "Practice questions, worked solutions, and timed mock exams covering advanced algebra, functions, and precalculus for the UDST AMP 2 placement test.",
      provider: { "@id": `${siteUrl}/#organization` },
      url: `${siteUrl}/about`,
      educationalLevel: "Secondary",
      inLanguage: "en",
      hasCourseInstance: {
        "@type": "CourseInstance",
        courseMode: "online",
        courseWorkload: "PT15H",
      },
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className={inter.className}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-brand-deep focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
        >
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
