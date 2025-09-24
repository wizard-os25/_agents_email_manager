#!/usr/bin/env node
// Send email using HTML template and SMTP from bmad-core/core-config.yaml

const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');
const nodemailer = require('nodemailer');

function parseArgs() {
  const args = process.argv.slice(2);
  const result = { vars: {} };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--to') result.to = args[++i];
    else if (a === '--from') result.from = args[++i];
    else if (a === '--subject') result.subject = args[++i];
    else if (a === '--template') result.template = args[++i];
    else if (a === '--vars') {
      // JSON string of variables
      const json = args[++i];
      try { Object.assign(result.vars, JSON.parse(json)); } catch (e) {
        console.error('Invalid JSON for --vars');
        process.exit(1);
      }
    } else if (a === '--var') {
      const kv = args[++i];
      const eq = kv.indexOf('=');
      if (eq === -1) { console.error('Use --var key=value'); process.exit(1); }
      const key = kv.slice(0, eq);
      const value = kv.slice(eq + 1);
      result.vars[key] = value;
    }
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

function renderTemplate(html, vars) {
  return html.replace(/\{\{\s*([A-Za-z0-9_\.\-]+)\s*\}\}/g, (_m, key) => {
    return Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : '';
  });
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
  const security = (cfg.smtp.security || '').toUpperCase();
  const secure = security === 'SSL';

  const templatePath = args.template || path.join(process.cwd(), 'docs', 'templates', 'welcome-email.html');
  const to = args.to || process.env.TO_EMAIL;
  const from = args.from || process.env.FROM_EMAIL || user;
  const subject = args.subject || 'Welcome';

  requireValue('template', templatePath);
  requireValue('to', to);

  const htmlRaw = fs.readFileSync(templatePath, 'utf8');
  const html = renderTemplate(htmlRaw, args.vars);
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

  const transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
  if (security === 'STARTTLS') transporter.transporter.options.requireTLS = true;

  try {
    const info = await transporter.sendMail({ from, to, subject, text, html });
    console.log('Email sent:', info.messageId);
  } catch (err) {
    console.error('Failed to send email:', err && err.message ? err.message : err);
    process.exit(1);
  }
}

main();


