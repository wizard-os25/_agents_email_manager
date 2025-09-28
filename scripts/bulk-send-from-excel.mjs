// Read Excel files, pick a random new hire, render template, send via Gmail API

import fs from 'node:fs';
import path from 'node:path';
import XLSX from 'xlsx';
import gmail from '../tools/lib/gmailClient.js';

function readSheetRows(filePath) {
  const wb = XLSX.readFile(filePath);
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(ws, { defval: '' });
}

function renderTemplate(html, vars) {
  return html.replaceAll(/\{\{\s*([^}]+?)\s*\}\}/g, (_m, key) => {
    const k = String(key);
    return Object.prototype.hasOwnProperty.call(vars, k) ? String(vars[k]) : '';
  });
}

async function main() {
  const orgDir = path.join(process.cwd(), 'organization');
  const newFile = path.join(orgDir, 'nhan_su_moi.xlsx');
  const curFile = path.join(orgDir, 'nhan_su_hien_tai.xlsx');
  if (!fs.existsSync(newFile) || !fs.existsSync(curFile)) {
    console.error(
      'Missing organization Excel files. Expected organization/nhan_su_moi.xlsx and nhan_su_hien_tai.xlsx',
    );
    throw new Error('Missing organization Excel files');
  }

  const newRows = readSheetRows(newFile);
  if (newRows.length === 0) {
    console.error('No rows in nhan_su_moi.xlsx');
    throw new Error('No rows in nhan_su_moi.xlsx');
  }
  const row = newRows[Math.floor(Math.random() * newRows.length)];

  // Map columns to template placeholders
  const vars = {
    'Tên nhân viên mới':
      row['Tên nhân viên mới'] || row['Ho va ten'] || row['Họ tên'] || row['Name'] || '',
    'Link kích hoạt email':
      row['Link kích hoạt email'] || row['Activation Link'] || row['Link'] || '',
  };

  const templatePath = path.join(process.cwd(), 'docs', 'templates', 'biplus-noti-email.html');
  const htmlRaw = fs.readFileSync(templatePath, 'utf8');
  let html = renderTemplate(htmlRaw, vars);
  const text = html
    .replaceAll(/<[^>]+>/g, ' ')
    .replaceAll(/\s+/g, ' ')
    .trim();

  const to = process.env.TO_EMAIL || 'wizard.os25@proton.me';
  const subject = `Tài khoản email BiPlus - ${vars['Tên nhân viên mới'] || ''}`;

  // Minimal formatting hardening: ensure base font and size
  html = html.replace(
    '<body',
    '<body style="font-family:Arial, sans-serif; font-size:14px; line-height:1.5; color:#0b1320;"',
  );

  const res = await gmail.sendMessage({ to, subject, html, text });
  console.log('Sent from Excel:', res && res.id ? res.id : 'ok');
}

try {
  await main();
} catch (error) {
  console.error(error && error.message ? error.message : error);
  process.exit(1);
}
