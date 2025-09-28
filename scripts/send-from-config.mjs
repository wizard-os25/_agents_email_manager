// Send test email using settings from bmad-core/core-config.yaml (smtp block)

import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import gmail from '../tools/lib/gmailClient.js';

function parseArgs() {
  const args = process.argv.slice(2);
  const result = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    switch (a) {
      case '--to': {
        result.to = args[++i];
        break;
      }
      case '--from': {
        result.from = args[++i];
        break;
      }
      case '--subject': {
        result.subject = args[++i];
        break;
      }
      case '--text': {
        result.text = args[++i];
        break;
      }
      case '--html': {
        {
          result.html = args[++i];
          // No default
        }
        break;
      }
    }
  }
  return result;
}

function requireValue(name, value) {
  if (!value || String(value).trim() === '') {
    console.error(`Missing required value: ${name}`);
    throw new Error(`Missing required value: ${name}`);
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
  const gmailSenderFromConfig =
    cfg.gmailApi && cfg.gmailApi.sender ? String(cfg.gmailApi.sender).trim() : '';
  const from = args.from || process.env.GMAIL_SENDER || gmailSenderFromConfig;
  const to = args.to || process.env.TO_EMAIL;
  const subject = args.subject || 'BMAD config test email';
  const text = args.text || 'This is a test email sent using core-config.yaml SMTP settings.';
  const html = args.html || `<p>${text}</p>`;

  if (!cfg.gmailApi) {
    console.warn(
      'No gmailApi block found in bmad-core/core-config.yaml (optional). Using env variables.',
    );
  }
  requireValue('to', to);

  try {
    const res = await gmail.sendMessage({ to, subject, text, html, from });
    console.log('Email sent:', res && res.id ? res.id : 'ok');
  } catch (error) {
    const useSmtp = String(process.env.USE_SMTP_FALLBACK || '').toLowerCase() === 'true';
    if (useSmtp && cfg.smtp) {
      console.warn('Gmail API failed. Attempting SMTP fallback because USE_SMTP_FALLBACK=true');
      const { default: nodemailer } = await import('nodemailer');
      const host = cfg.smtp.host;
      const port = Number(cfg.smtp.port);
      const user = cfg.smtp.user;
      const pass = cfg.smtp.password;
      const security = (cfg.smtp.security || '').toUpperCase();
      const secure = security === 'SSL';
      const transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
      if (security === 'STARTTLS') transporter.transporter.options.requireTLS = true;
      try {
        const info = await transporter.sendMail({ from: from || user, to, subject, text, html });
        console.log('Email sent via SMTP fallback:', info.messageId);
        return;
      } catch (error_) {
        console.error(
          'SMTP fallback also failed:',
          error_ && error_.message ? error_.message : error_,
        );
        throw new Error('SMTP fallback also failed');
      }
    } else {
      console.error('Failed to send email:', error && error.message ? error.message : error);
      throw new Error('Failed to send email');
    }
  }
}

try {
  await main();
} catch (error) {
  console.error(error && error.message ? error.message : error);
  process.exit(1);
}
