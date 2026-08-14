import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection } from "@/components/ui/LegalPage";
import {
  CONTACT_EMAIL,
  EDUCATIONAL_DISCLAIMER,
  JURISDICTION,
  LAST_UPDATED,
  NON_AFFILIATION,
  OPERATOR_DESCRIPTION,
  OPERATOR_NAME,
} from "@/lib/legal";

export const metadata: Metadata = {
  title: "Terms and Conditions",
  description:
    "The terms that govern use of AMP Prep, including acceptable use, intellectual property, disclaimers, and limitation of liability.",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms and Conditions"
      lastUpdated={LAST_UPDATED}
      intro={`These terms govern your use of ${OPERATOR_NAME}. By creating an account or using the site, you agree to them. If you do not agree, please do not use the site.`}
    >
      <LegalSection heading="Who runs this site">
        <p>
          {OPERATOR_NAME} is {OPERATOR_DESCRIPTION}. It is not a registered
          company. You can reach the operator at{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
        <p>{NON_AFFILIATION}</p>
      </LegalSection>

      <LegalSection heading="Your account">
        <p>
          You need an account to practise. You are responsible for keeping your
          password secure and for everything done through your account. Give an
          email address you actually control.
        </p>
        <p>
          If you think someone else has access to your account, email{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. You can also
          delete the account yourself at any time from your{" "}
          <Link href="/account">account page</Link>, which removes it and all of
          its data immediately.
        </p>
        <p>
          One account is for one person. Sharing an account, or sharing paid
          access with people who have not paid, is not permitted.
        </p>
      </LegalSection>

      <LegalSection heading="Acceptable use">
        <p>You agree not to:</p>
        <ul>
          <li>
            copy, scrape, bulk download, republish, or resell the questions,
            solutions, or any other content on this site;
          </li>
          <li>
            use automated tools to extract content or to create accounts;
          </li>
          <li>
            attempt to gain access to accounts, data, or systems that are not
            yours, or probe the site for vulnerabilities without permission;
          </li>
          <li>
            interfere with the site&apos;s operation, including by overloading it
            or circumventing rate limits or access controls;
          </li>
          <li>
            reverse engineer the site except where that right cannot lawfully be
            excluded;
          </li>
          <li>use the site to break the law or infringe anyone&apos;s rights.</li>
        </ul>
        <p>
          If you find a security problem, please report it to{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> rather than
          exploiting it. Good faith reports are welcome.
        </p>
      </LegalSection>

      <LegalSection heading="Content and intellectual property">
        <p>
          The practice questions, worked solutions, explanations, and site design
          are original work created for this platform, and remain the property of
          the operator. You may use them for your own personal study. You may not
          redistribute them.
        </p>
        <p>
          The UDST study guide informed which topics and skills the platform
          covers and how difficulty is modelled. The questions themselves were
          written independently and are not reproductions of it or of any other
          copyrighted source.
        </p>
        <p>
          If you believe something on this site infringes your copyright, email{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> with enough
          detail to identify the material, and it will be reviewed and removed if
          the claim is well founded.
        </p>
      </LegalSection>

      <LegalSection heading="No guarantee of results">
        <p>{EDUCATIONAL_DISCLAIMER}</p>
        <p>
          Practising here is not a substitute for the official UDST materials or
          for your own preparation, and nothing on this site is an official
          statement of what the AMP tests contain.
        </p>
      </LegalSection>

      <LegalSection heading="Paid plans">
        <p>
          Paid subscriptions are not currently active, and no payment can be
          taken. When they open, checkout will run through a third-party payment
          provider, prices and billing terms will be shown before you pay, and
          this section and the{" "}
          <Link href="/privacy">Privacy Policy</Link> will be updated to name
          the provider and to describe billing, renewal, and refunds before any
          payment is taken.
        </p>
        <p>
          Free accounts may have limits on how much content is available. Those
          limits can change.
        </p>
      </LegalSection>

      <LegalSection heading="Suspension and termination">
        <p>
          Accounts that breach these terms, particularly the acceptable use
          section, may be suspended or removed. Where it is reasonable to do so,
          you will be told why and given a chance to respond.
        </p>
        <p>
          You can delete your own account at any time from your{" "}
          <Link href="/account">account page</Link>.
        </p>
      </LegalSection>

      <LegalSection heading="Availability">
        <p>
          The site is provided as it is, without any promise that it will always
          be available, uninterrupted, or free of errors. It may change or be
          withdrawn at any time.
        </p>
      </LegalSection>

      <LegalSection heading="Limitation of liability">
        <p>
          To the fullest extent permitted by law, the operator is not liable for
          any indirect or consequential loss, or for any loss of data, profit,
          opportunity, or examination outcome arising from your use of the site.
        </p>
        <p>
          Nothing here limits liability that cannot lawfully be limited,
          including liability for fraud or for death or personal injury caused by
          negligence.
        </p>
      </LegalSection>

      <LegalSection heading="Changes to these terms">
        <p>
          These terms may change. The date at the top shows the last update. If a
          change materially affects your rights, reasonable notice will be given
          before it takes effect. Continuing to use the site after that means you
          accept the new terms.
        </p>
      </LegalSection>

      <LegalSection heading="Governing law">
        <p>
          These terms are governed by the laws of {JURISDICTION}, and the courts
          of {JURISDICTION} have jurisdiction over any dispute. If you are a
          consumer elsewhere, this does not remove protections you have under the
          law of the country you live in.
        </p>
      </LegalSection>

      <LegalSection heading="Contact">
        <p>
          Questions about these terms:{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. See also the{" "}
          <Link href="/contact">contact page</Link>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
