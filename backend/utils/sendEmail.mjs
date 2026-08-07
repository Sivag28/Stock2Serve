import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail(to, subject, html, attachments) {
  const { data, error } = await resend.emails.send({
    from: "onboarding@resend.dev",
    to,
    subject,
    html,
    attachments,
  });

  if (error) throw new Error(error.message || 'Unable to send email.');

  return data;
}
