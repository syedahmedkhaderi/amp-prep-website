import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection } from "@/components/ui/LegalPage";
import {
  CONTACT_EMAIL,
  DATA_PROTECTION_LAW,
  JURISDICTION,
  LAST_UPDATED,
  OPERATOR_DESCRIPTION,
  OPERATOR_NAME,
} from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "What data AMP Prep collects, why, how long it is kept, and how to get it deleted.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      lastUpdated={LAST_UPDATED}
      intro={`${OPERATOR_NAME} is ${OPERATOR_DESCRIPTION}. This policy describes exactly what the site stores about you and what is done with it. It lists the actual fields in the database rather than describing them in general terms.`}
    >
      <LegalSection heading="What is collected">
        <p>When you create an account, the site stores:</p>
        <ul>
          <li>
            <strong>Your email address.</strong> It identifies your account and
            is how you sign in.
          </li>
          <li>
            <strong>Your name,</strong> as you enter it. Used only to address you
            in the interface. You can put anything here.
          </li>
          <li>
            <strong>A hash of your password,</strong> produced with bcrypt. Your
            actual password is never stored and cannot be recovered from the
            hash, by the operator or by anyone who obtained the database.
          </li>
          <li>
            <strong>Your plan and role</strong> (free or pro; student or admin),
            and the date the account was created.
          </li>
        </ul>
        <p>As you practise, the site stores your work:</p>
        <ul>
          <li>
            each attempt you start, which exam or topic it was for, when it
            started and was submitted, your score, and the time limit;
          </li>
          <li>
            each answer you give, whether it was correct, and the points awarded;
          </li>
          <li>any question you report as having a problem.</li>
        </ul>
        <p>
          If you ask to reset your password, a single-use token is stored
          against your account, as a hash, until it is used or expires after 60
          minutes. The email address you enter is used to send that one message
          and is not kept for anything else.
        </p>
        <p>
          That is the complete list. There is no tracking of what pages you
          browse, no device fingerprinting, no advertising profile, and no data
          bought from or sold to anyone.
        </p>
      </LegalSection>

      <LegalSection heading="Why it is collected">
        <p>
          Your email and password hash exist so you can sign in and so nobody
          else can. Your attempt and answer history exists so the site can show
          your progress, mark your work, and tell you which topics need
          attention. That is the product; without it the site cannot function.
        </p>
        <p>
          Under {DATA_PROTECTION_LAW}, the basis for processing is your consent,
          given when you create an account, together with the necessity of
          processing to provide the service you asked for.
        </p>
      </LegalSection>

      <LegalSection heading="Cookies">
        <p>
          The site sets <strong>one</strong> cookie, named{" "}
          <code>amp_session</code>. It holds a signed token proving you are
          signed in. It is marked HttpOnly, so page scripts cannot read it, and
          over HTTPS it is marked Secure. It expires after seven days.
        </p>
        <p>
          It is strictly necessary: without it you could not stay signed in.
          There are no analytics cookies, no advertising cookies, and no
          third-party cookies, which is why the site does not show a cookie
          consent banner. If non-essential cookies are ever added, consent will
          be asked for first and this section will change.
        </p>
      </LegalSection>

      <LegalSection heading="Who else sees your data">
        <ul>
          <li>
            <strong>The hosting provider,</strong> which necessarily processes
            requests to the site and keeps standard server logs, including IP
            addresses, for security and troubleshooting.
          </li>
          <li>
            <strong>No analytics provider.</strong> There is no Google Analytics
            or equivalent on this site.
          </li>
          <li>
            <strong>No advertising network.</strong> The site carries no ads.
          </li>
          <li>
            <strong>No payment processor yet.</strong> Paid plans are not
            active, no payment has ever been taken, and no card data has been
            handled. When paid plans open, a payment provider will handle the
            transaction and receive the details needed to process it. Card
            numbers would go to that provider and never to this site. This
            policy will be updated to name the provider, and to say what it
            receives and where it processes it, before any payment is taken.
          </li>
        </ul>
        <p>
          Your data is not sold, rented, or shared for marketing. It would only
          be disclosed otherwise if legally required, and only to the extent
          required.
        </p>
      </LegalSection>

      <LegalSection heading="How long it is kept">
        <p>
          Your account and practice history are kept while your account exists.
          Delete your account and they are deleted with it. Server logs held by
          the hosting provider are kept on that provider&apos;s own schedule,
          typically a short rolling window.
        </p>
      </LegalSection>

      <LegalSection heading="Security">
        <p>
          Passwords are hashed with bcrypt and never stored in readable form. The
          site is served over HTTPS and sets a Content Security Policy and
          related protections. Session cookies are HttpOnly. Access to your
          attempts is checked against your own account on every request.
        </p>
        <p>
          No system is perfectly secure, and this one is run by an individual
          rather than a company with a security team. Please use a password you
          do not use anywhere else.
        </p>
      </LegalSection>

      <LegalSection heading="Your rights">
        <p>
          Under {DATA_PROTECTION_LAW} and as a matter of ordinary good practice,
          you can:
        </p>
        <ul>
          <li>
            <strong>See what is held about you.</strong> Your account page shows
            your profile and your dashboard shows your history. For a full copy,
            email the address below.
          </li>
          <li>
            <strong>Correct it.</strong> Ask and it will be corrected.
          </li>
          <li>
            <strong>Delete it.</strong> Delete your account yourself from your{" "}
            <Link href="/account">account page</Link>. This removes your account
            row and, with it, every attempt and answer you recorded. It takes
            effect immediately and cannot be undone.
          </li>
          <li>
            <strong>Withdraw consent</strong> by deleting your account and no
            longer using the site.
          </li>
          <li>
            <strong>Complain</strong> to the competent data protection authority
            in {JURISDICTION} if you think your data has been mishandled.
          </li>
        </ul>
        <p>
          If you are outside Qatar, you may have additional rights under your own
          country&apos;s law. Requests under those laws are honoured on the same
          terms; email the address below.
        </p>
      </LegalSection>

      <LegalSection heading="Children">
        <p>
          The site is intended for students preparing for university placement
          tests. It is not directed at children under 13, and accounts are not
          knowingly created for them. If you believe a child has created an
          account, email the address below and it will be removed.
        </p>
      </LegalSection>

      <LegalSection heading="Changes to this policy">
        <p>
          This policy may change. The date at the top shows the last update. If a
          change materially affects how your data is handled, notice will be
          given before it takes effect.
        </p>
      </LegalSection>

      <LegalSection heading="Contact">
        <p>
          For any question about your data, or to make a request under this
          policy, email{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
