import { Resend } from 'resend';

export type ContactEmailInput = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

const DEFAULT_SENDER = 'Lunidex <onboarding@resend.dev>';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function getEmailConfig(): { apiKey: string; recipient: string; sender: string } | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const recipient = process.env.CONTACT_TO_EMAIL?.trim();
  if (!apiKey || !recipient) return null;

  return {
    apiKey,
    recipient,
    sender: process.env.CONTACT_FROM_EMAIL?.trim() || DEFAULT_SENDER,
  };
}

/** Sends a single transactional contact message without logging its content. */
export async function sendContactEmail(input: ContactEmailInput): Promise<boolean> {
  const config = getEmailConfig();
  if (!config) return false;

  const safeName = escapeHtml(input.name);
  const safeEmail = escapeHtml(input.email);
  const safeSubject = escapeHtml(input.subject);
  const safeMessage = escapeHtml(input.message).replaceAll('\n', '<br />');

  const resend = new Resend(config.apiKey);
  const { error } = await resend.emails.send({
    from: config.sender,
    to: config.recipient,
    replyTo: input.email,
    subject: `[Lunidex] ${input.subject}`,
    text: `Nom : ${input.name}\nE-mail : ${input.email}\nSujet : ${input.subject}\n\n${input.message}`,
    html: `<p><strong>Nom :</strong> ${safeName}</p><p><strong>E-mail :</strong> ${safeEmail}</p><p><strong>Sujet :</strong> ${safeSubject}</p><p>${safeMessage}</p>`,
  });

  return !error;
}
