import nodemailer from "nodemailer";
import { CONTACT_EMAIL } from "@/lib/legal";
import { SITE_URL } from "@/lib/site";

/**
 * Outbound email, used only for password resets.
 *
 * SMTP is configured through one variable, SMTP_URL, in nodemailer's connection
 * form — `smtps://user:pass@smtp.example.com:465`. One variable rather than
 * five because a half-configured mailer fails at send time, which for a
 * password reset means the user waits for a message that never arrives.
 *
 * With nothing configured the transport writes the message to the server log
 * instead of sending it. That is genuinely useful in development, where it puts
 * a working reset link in the terminal, and it is why isMailerConfigured()
 * exists: the sign-in page must not offer a reset that cannot be delivered, so
 * the UI asks first rather than discovering it after the user has waited.
 */

const SMTP_URL = process.env.SMTP_URL ?? "";
const MAIL_FROM = process.env.MAIL_FROM || `AMP Prep <${CONTACT_EMAIL}>`;

export function isMailerConfigured(): boolean {
  return SMTP_URL.length > 0;
}

export type Mail = {
  to: string;
  subject: string;
  text: string;
};

export async function sendMail(mail: Mail): Promise<void> {
  if (!isMailerConfigured()) {
    // Deliberately loud and complete: in development this IS the delivery
    // mechanism, and the link has to be usable from the terminal.
    console.log(
      [
        "",
        "─".repeat(72),
        "[mailer] SMTP_URL is not set, so this message was not sent.",
        `[mailer] To:      ${mail.to}`,
        `[mailer] Subject: ${mail.subject}`,
        "",
        mail.text,
        "─".repeat(72),
        "",
      ].join("\n")
    );
    return;
  }

  const transport = nodemailer.createTransport(SMTP_URL);
  await transport.sendMail({
    from: MAIL_FROM,
    to: mail.to,
    subject: mail.subject,
    text: mail.text,
  });
}

export function passwordResetEmail(token: string): Omit<Mail, "to"> {
  const url = `${SITE_URL}/reset-password?token=${encodeURIComponent(token)}`;
  return {
    subject: "Reset your AMP Prep password",
    text: [
      "Someone asked to reset the password for your AMP Prep account.",
      "",
      "Open this link to choose a new one:",
      url,
      "",
      "The link works once and expires in 60 minutes.",
      "",
      "If this wasn't you, ignore this message: nothing has changed, and your",
      "current password still works.",
      "",
      `Questions: ${CONTACT_EMAIL}`,
    ].join("\n"),
  };
}
