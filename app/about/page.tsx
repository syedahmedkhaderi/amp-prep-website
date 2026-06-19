import { SiteHeader, SiteFooter } from "@/components/ui/SiteChrome";

export const metadata = { title: "About" };

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 mx-auto max-w-3xl px-6 py-16 w-full">
        <h1 className="text-3xl font-bold text-brand-deep">About AMP Prep</h1>

        <div className="mt-8 space-y-6 text-ink-soft leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-ink">What is the AMP?</h2>
            <p className="mt-2">
              The Academic Mathematics Placement (AMP) is administered at the
              UDST Testing Centre. It has two parts. AMP 1 is a computer based
              test of basic high school mathematics with 60 multiple choice
              questions across 20 topic areas and a 2 hour time limit. Every
              applicant must take it. AMP 2 covers advanced algebra, functions,
              and precalculus. Only students with a high AMP 1 score are
              eligible, and it determines exemption from undergraduate math
              courses.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-ink">How AMP Prep helps</h2>
            <p className="mt-2">
              AMP Prep gives you original practice questions that match the
              topics, difficulty, and style of the real test. Every question
              comes with a full worked solution, not just an answer. You can
              practice any topic at your own pace, then sit a timed full length
              mock exam that reproduces the official quiz layout. The timed mock
              uses a 120 minute countdown with autosave, so you build the pacing
              and familiarity you need for exam day.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-ink">
              Original questions, not copies
            </h2>
            <p className="mt-2">
              Every question on this platform is an original item written to
              match the skills tested on the AMP. We do not republish questions
              from the UDST study guide or any other copyrighted source. The
              study guide informs our topic coverage and difficulty model. The
              questions themselves are new.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-ink">Independent tool</h2>
            <p className="mt-2">
              AMP Prep is an independent study tool. It is not affiliated with,
              endorsed by, or connected to the University of Doha for Science
              and Technology. UDST is a trademark of its respective owner. This
              platform helps students prepare for the UDST AMP tests but does
              not claim any official status.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-ink">Contact</h2>
            <p className="mt-2">
              Questions or feedback? Email support@ampprep.example and we will
              get back to you within one business day.
            </p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
