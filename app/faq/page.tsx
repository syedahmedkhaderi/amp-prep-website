import { SiteHeader, SiteFooter } from "@/components/ui/SiteChrome";

export const metadata = { title: "FAQ" };

const FAQS = [
  {
    q: "What is the AMP 1 test format?",
    a: "AMP 1 is a computer based test with 60 multiple choice questions covering 20 mathematics topic areas. You have 2 hours. A basic scientific calculator (Casio fx-85ES class) is provided at the testing centre. The score determines your mathematics placement outcome.",
  },
  {
    q: "What is AMP 2?",
    a: "AMP 2 is an advanced test covering precalculus topics including quadratic functions, polynomial and rational functions, exponential and logarithmic functions, analytic trigonometry, sequences and series, and introductory matrices. Only students with a high AMP 1 score take AMP 2. It determines exemption from undergraduate math courses.",
  },
  {
    q: "Do the practice questions match the real test?",
    a: "Our questions are original items written to match the topics, difficulty, and calculator level of the AMP tests. They cover the same skills but are not copies of any real test questions. Every question includes a full worked solution so you learn the method, not just the answer.",
  },
  {
    q: "What does the timed mock exam look like?",
    a: "The timed mock reproduces the official quiz interface. You get a question navigation rail on the left, Previous and Next buttons, a live countdown timer, and a Submit Quiz button. Answers autosave as you go, so refreshing the page restores your exact state. The timer auto submits when it reaches zero.",
  },
  {
    q: "Is the free tier actually useful?",
    a: "Yes. Free users get 20 practice questions per day with full worked solutions, and one timed AMP 1 mock per week. That is enough to work through every topic and get a real sense of your readiness before deciding whether to upgrade.",
  },
  {
    q: "What does Pro add?",
    a: "Pro removes the daily practice cap and weekly mock limit, gives access to the full AMP 2 precalculus content (800+ questions), adds topic analytics with weak area targeting, lets you retry only the questions you got wrong, and gives access to 40+ full length practice papers.",
  },
  {
    q: "How much does Pro cost?",
    a: "Pro is $10 per month, or $24 for a 3 month exam season pass (a 20% saving). Paid plans are not active yet, so nothing can be purchased today and no card details are collected. When they open you will be able to cancel anytime.",
  },
  {
    q: "Is AMP Prep affiliated with UDST?",
    a: "No. AMP Prep is an independent study tool. It is not affiliated with, endorsed by, or connected to the University of Doha for Science and Technology. It helps students prepare for the UDST AMP tests but claims no official status.",
  },
];

export default function FAQPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main id="main-content" className="flex-1 mx-auto max-w-3xl px-6 py-16 w-full">
        <h1 className="text-3xl font-bold text-brand-deep">
          Frequently asked questions
        </h1>
        <div className="mt-8 space-y-6">
          {FAQS.map((item) => (
            <div key={item.q} className="border-b border-surface-border pb-6">
              <h2 className="font-semibold text-ink">{item.q}</h2>
              <p className="mt-2 text-sm text-ink-soft leading-relaxed">
                {item.a}
              </p>
            </div>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
