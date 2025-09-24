#!/usr/bin/env node
// Minimal SMTP test sender. Reads config from environment variables.
// Required envs: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE(optional), FROM_EMAIL, TO_EMAIL

const nodemailer = require('nodemailer');

function readEnv(name, required = true) {
  const value = process.env[name];
  if (required && (!value || value.trim() === '')) {
    console.error(`Missing required env: ${name}`);
    process.exit(1);
  }
  return value;
}

async function main() {
  const host = readEnv('SMTP_HOST');
  const port = Number(readEnv('SMTP_PORT'));
  const user = readEnv('SMTP_USER');
  const pass = readEnv('SMTP_PASS');
  const secure = (process.env.SMTP_SECURE || 'false').toLowerCase() === 'true';
  const from = readEnv('FROM_EMAIL');
  const to = readEnv('TO_EMAIL');

  const subject = process.env.SUBJECT || 'BMAD test email';
  const text = process.env.TEXT || 'This is a test email sent via Nodemailer.';
  const html = process.env.HTML || `<p>${text}</p>`;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  try {
    const info = await transporter.sendMail({ from, to, subject, text, html });
    console.log('Email sent:', info.messageId);
  } catch (err) {
    console.error('Failed to send email:', err && err.message ? err.message : err);
    process.exit(1);
  }
}

main();


