import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection } from "@/components/ui/LegalPage";
import {
  CONTACT_EMAIL,
  NON_AFFILIATION,
  OPERATOR_DESCRIPTION,
  OPERATOR_NAME,
} from "@/lib/legal";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "How to reach AMP Prep about a wrong answer, an account problem, a security issue, or anything else.",
};

export default function ContactPage() {
  return (
    <LegalPage
      title="Contact"
      intro={`${OPERATOR_NAME} is ${OPERATOR_DESCRIPTION}, so email goes to a person rather than a support queue. Expect a reply within a few days.`}
    >
      <LegalSection heading="Email">
        <p>
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-lg font-medium">
            {CONTACT_EMAIL}
          </a>
        </p>
      </LegalSection>

      <LegalSection heading="A question looks wrong">
        <p>
          This is the most useful thing you can report. The question bank is
          large and mistakes are possible. Send the topic and the question text,
          or a screenshot, and say what you think the right answer is. Errors get
          fixed and the correction reaches everyone.
        </p>
      </LegalSection>

      <LegalSection heading="Something is broken">
        <p>
          Tell us what you were doing, what you expected, and what happened
          instead. If a page showed an error, the exact wording helps.
        </p>
      </LegalSection>

      <LegalSection heading="Account, billing, or your data">
        <p>
          For access problems, or to request a copy or deletion of your data,
          email from the address on the account where possible. You can also
          delete your account yourself from your{" "}
          <Link href="/account">account page</Link>. See the{" "}
          <Link href="/privacy">Privacy Policy</Link> for what that removes.
        </p>
      </LegalSection>

      <LegalSection heading="Security issues">
        <p>
          If you find a vulnerability, please report it to the address above
          before disclosing it publicly, and do not access data that is not
          yours. Good faith reports are welcome and will not be met with legal
          threats.
        </p>
      </LegalSection>

      <LegalSection heading="Not affiliated with UDST">
        <p>{NON_AFFILIATION}</p>
        <p>
          Questions about the actual AMP tests, your results, or placement should
          go to the UDST Testing Centre, not here.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
