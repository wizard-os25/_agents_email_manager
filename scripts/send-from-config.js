#!/usr/bin/env node
// Send test email using settings from bmad-core/core-config.yaml (smtp block)

const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');
const nodemailer = require('nodemailer');

function parseArgs() {
  const args = process.argv.slice(2);
  const result = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--to') result.to = args[++i];
    else if (a === '--from') result.from = args[++i];
    else if (a === '--subject') result.subject = args[++i];
    else if (a === '--text') result.text = args[++i];
    else if (a === '--html') result.html = args[++i];
  }
  return result;
}

function requireValue(name, value) {
  if (!value || String(value).trim() === '') {
    console.error(`Missing required value: ${name}`);
    process.exit(1);
  }
}

function loadCoreConfig() {
  const configPath = path.join(process.cwd(), 'bmad-core', 'core-config.yaml');
  const raw = fs.readFileSync(configPath, 'utf8');
  return yaml.load(raw);
}

async function main() {
  const args = parseArgs();
  const cfg = loadCoreConfig();
  if (!cfg.smtp) {
    console.error('No smtp block found in bmad-core/core-config.yaml');
    process.exit(1);
  }

  const host = cfg.smtp.host;
  const port = Number(cfg.smtp.port);
  const user = cfg.smtp.user;
  const pass = cfg.smtp.password;
  const security = (cfg.smtp.security || '').toUpperCase(); // 'SSL' | 'STARTTLS' | ''

  const secure = security === 'SSL'; // port 465 typical

  const from = args.from || process.env.FROM_EMAIL || user;
  const to = args.to || process.env.TO_EMAIL;
  const subject = args.subject || 'BMAD config test email';
  const text = args.text || 'This is a test email sent using core-config.yaml SMTP settings.';
  const html = args.html || `<p>${text}</p>`;

  requireValue('smtp.host', host);
  requireValue('smtp.port', port);
  requireValue('smtp.user', user);
  requireValue('smtp.password', pass);
  requireValue('to', to);

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  if (security === 'STARTTLS') {
    transporter.transporter.options.requireTLS = true;
  }

  try {
    const info = await transporter.sendMail({ from, to, subject, text, html });
    console.log('Email sent:', info.messageId);
  } catch (err) {
    console.error('Failed to send email:', err && err.message ? err.message : err);
    process.exit(1);
  }
}

main();


