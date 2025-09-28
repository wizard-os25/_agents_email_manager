// Send email using HTML template and SMTP from bmad-core/core-config.yaml

import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import gmail from '../tools/lib/gmailClient.js';

function parseArgs() {
  const args = process.argv.slice(2);
  const result = { vars: {} };
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
      case '--template': {
        result.template = args[++i];
        break;
      }
      case '--vars': {
        // JSON string of variables
        const json = args[++i];
        try {
          Object.assign(result.vars, JSON.parse(json));
        } catch {
          console.error('Invalid JSON for --vars');
          throw new Error('Invalid JSON for --vars');
        }

        break;
      }
      case '--vars-file': {
        const file = args[++i];
        try {
          const raw = fs.readFileSync(path.resolve(file), 'utf8');
          const obj = JSON.parse(raw);
          Object.assign(result.vars, obj);
        } catch {
          console.error('Invalid --vars-file (must be JSON file)');
          throw new Error('Invalid --vars-file (must be JSON file)');
        }

        break;
      }
      case '--var': {
        const kv = args[++i];
        const eq = kv.indexOf('=');
        if (eq === -1) {
          console.error('Use --var key=value');
          throw new Error('Use --var key=value');
        }
        const key = kv.slice(0, eq);
        const value = kv.slice(eq + 1);
        result.vars[key] = value;

        break;
      }
      // No default
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

function renderTemplate(html, vars) {
  // Support Unicode keys and keys with spaces: e.g., {{Tên nhân viên mới}}
  let out = html.replaceAll(/\{\{\s*([^}]+?)\s*\}\}/g, (_m, key) => {
    const k = String(key);
    return Object.prototype.hasOwnProperty.call(vars, k) ? String(vars[k]) : '';
  });
  // Also support angle-bracket placeholders like <Tên PO>
  out = out.replaceAll(/<([^<>]+?)>/g, (_m, key) => {
    const k = `<${String(key)}>`;
    return Object.prototype.hasOwnProperty.call(vars, k) ? String(vars[k]) : _m;
  });
  // And HTML-escaped angle brackets: &lt;Tên PO&gt;
  out = out.replaceAll(/&lt;([^<>]+?)&gt;/g, (_m, key) => {
    const k = `<${String(key)}>`;
    return Object.prototype.hasOwnProperty.call(vars, k) ? String(vars[k]) : _m;
  });
  return out;
}

async function main() {
  const args = parseArgs();
  const cfg = loadCoreConfig();
  const templatePath =
    args.template || path.join(process.cwd(), 'docs', 'templates', 'welcome-email.html');
  const to = args.to || process.env.TO_EMAIL;
  const gmailSenderFromConfig =
    cfg.gmailApi && cfg.gmailApi.sender ? String(cfg.gmailApi.sender).trim() : '';
  const from = args.from || process.env.GMAIL_SENDER || gmailSenderFromConfig;
  const subject = args.subject || 'Welcome';

  requireValue('template', templatePath);
  requireValue('to', to);

  const htmlRaw = fs.readFileSync(templatePath, 'utf8');
  const html = renderTemplate(htmlRaw, args.vars);
  const text = html
    .replaceAll(/<[^>]+>/g, ' ')
    .replaceAll(/\s+/g, ' ')
    .trim();

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
