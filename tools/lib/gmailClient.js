// Reusable Gmail API client for sending emails via Gmail API
// Requires environment variables:
// - GOOGLE_CLIENT_ID
// - GOOGLE_CLIENT_SECRET
// - GOOGLE_REDIRECT_URI (optional for desktop; can be omitted)
// - GOOGLE_TOKEN_PATH (e.g., ~/.bmad/gmail_token.json)
// - GMAIL_SENDER (the authorized Gmail address or verified alias)

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const readline = require('node:readline');
const http = require('node:http');
const { exec } = require('node:child_process');
const { google } = require('googleapis');

const GMAIL_SCOPES = ['https://www.googleapis.com/auth/gmail.send'];

function resolveTokenPath() {
  const p = process.env.GOOGLE_TOKEN_PATH || path.join(os.homedir(), '.bmad', 'gmail_token.json');
  const dir = path.dirname(p);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return p;
}

function readJsonIfExists(file) {
  try {
    if (fs.existsSync(file)) {
      const raw = fs.readFileSync(file, 'utf8');
      return JSON.parse(raw);
    }
    return null;
  } catch {
    return null;
  }
}

function saveJson(file, obj) {
  fs.writeFileSync(file, JSON.stringify(obj, null, 2));
}

async function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) =>
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    }),
  );
}

function createOAuth2Client(customRedirectUri) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri =
    customRedirectUri || process.env.GOOGLE_REDIRECT_URI || 'urn:ietf:wg:oauth:2.0:oob';
  if (!clientId || !clientSecret) {
    throw new Error(
      'Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET. Please create an OAuth Desktop Client in Google Cloud, then set env vars.',
    );
  }
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

function tryOpenBrowser(url) {
  if (process.platform === 'darwin') {
    exec(`open "${url}"`);
  } else if (process.platform === 'win32') {
    exec(`start "" "${url}"`);
  } else {
    exec(`xdg-open "${url}"`);
  }
}

async function getAuthorizedClient() {
  const tokenPath = resolveTokenPath();
  const cached = readJsonIfExists(tokenPath);
  if (cached && cached.access_token) {
    const oAuth2Client = createOAuth2Client();
    oAuth2Client.setCredentials(cached);
    return oAuth2Client;
  }

  // Prefer loopback auto-consent to avoid manual copy/paste
  const desiredPort = Number(process.env.GOOGLE_REDIRECT_PORT || 0);
  const server = http.createServer();
  const port = await new Promise((resolve) => {
    server.listen(desiredPort, '127.0.0.1', () => resolve(server.address().port));
  });
  const redirectUri = `http://localhost:${port}/`;
  const oAuth2Client = createOAuth2Client(redirectUri);
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: GMAIL_SCOPES,
    prompt: 'consent',
    redirect_uri: redirectUri,
  });

  console.log('Authorize this app by visiting this url:');
  console.log(authUrl);
  tryOpenBrowser(authUrl);

  const code = await new Promise((resolve) => {
    let resolved = false;
    server.on('request', (req, res) => {
      const url = new URL(req.url, `http://localhost:${port}`);
      const c = url.searchParams.get('code');
      if (c && !resolved) {
        resolved = true;
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end('<b>Authorization complete.</b> You can close this window.');
        resolve(c);
        server.close();
      } else {
        res.statusCode = 200;
        res.end('Waiting for authorization...');
      }
    });
  }).catch(() => null);

  let tokens;
  if (code) {
    const r = await oAuth2Client.getToken(code.trim());
    tokens = r.tokens;
  } else {
    // Fallback to console prompt
    const authUrl2 = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: GMAIL_SCOPES,
      prompt: 'consent',
    });
    console.log('If browser did not open, visit this url and paste the code:');
    console.log(authUrl2);
    const manual = await prompt('Enter the code from that page here: ');
    const r = await oAuth2Client.getToken(manual.trim());
    tokens = r.tokens;
  }

  oAuth2Client.setCredentials(tokens);
  saveJson(tokenPath, tokens);
  return oAuth2Client;
}

function toBase64Url(bufferOrString) {
  const buff = Buffer.isBuffer(bufferOrString)
    ? bufferOrString
    : Buffer.from(String(bufferOrString), 'utf8');
  return buff.toString('base64').replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function encodeHeaderUtf8(value) {
  if (!value) return '';
  // RFC 2047 encoded-word with UTF-8 and Base64
  const b64 = Buffer.from(String(value), 'utf8').toString('base64');
  return `=?UTF-8?B?${b64}?=`;
}

function buildMime({ from, to, subject, text, html, attachments = [] }) {
  const boundaryMixed = 'mixed_' + Math.random().toString(36).slice(2);
  const boundaryAlt = 'alt_' + Math.random().toString(36).slice(2);

  const headers = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${encodeHeaderUtf8(subject)}`,
    'MIME-Version: 1.0',
  ];

  const hasAttachments = Array.isArray(attachments) && attachments.length > 0;
  let mime = '';
  if (hasAttachments) {
    headers.push(`Content-Type: multipart/mixed; boundary="${boundaryMixed}"`);
    mime += headers.join('\r\n') + '\r\n\r\n';
    mime += `--${boundaryMixed}\r\n`;
    mime += `Content-Type: multipart/alternative; boundary="${boundaryAlt}"\r\n\r\n`;
    mime += `--${boundaryAlt}\r\nContent-Type: text/plain; charset="UTF-8"\r\n\r\n${text || ''}\r\n`;
    mime += `--${boundaryAlt}\r\nContent-Type: text/html; charset="UTF-8"\r\n\r\n${html || ''}\r\n`;
    mime += `--${boundaryAlt}--\r\n`;
    for (const att of attachments) {
      const filename = att.filename || 'attachment';
      const contentType = att.contentType || 'application/octet-stream';
      const content = Buffer.isBuffer(att.content) ? att.content : fs.readFileSync(att.path);
      mime += `--${boundaryMixed}\r\n`;
      mime += `Content-Type: ${contentType}; name="${filename}"\r\n`;
      mime += 'Content-Transfer-Encoding: base64\r\n';
      mime += `Content-Disposition: attachment; filename="${filename}"\r\n\r\n`;
      mime += content.toString('base64').replaceAll(/.{76}(?=.)/g, '$&\r\n') + '\r\n';
    }
    mime += `--${boundaryMixed}--`;
  } else {
    headers.push(`Content-Type: multipart/alternative; boundary="${boundaryAlt}"`);
    mime += headers.join('\r\n') + '\r\n\r\n';
    mime += `--${boundaryAlt}\r\nContent-Type: text/plain; charset="UTF-8"\r\n\r\n${text || ''}\r\n`;
    mime += `--${boundaryAlt}\r\nContent-Type: text/html; charset="UTF-8"\r\n\r\n${html || ''}\r\n`;
    mime += `--${boundaryAlt}--`;
  }
  return mime;
}

async function sendMessage({ to, subject, html, text, attachments, from }) {
  const sender = from || process.env.GMAIL_SENDER;
  if (!sender)
    throw new Error(
      'Missing GMAIL_SENDER (or pass from). Set env GMAIL_SENDER or core-config gmailApi.sender.',
    );
  if (!to) throw new Error('Missing to');
  const auth = await getAuthorizedClient();
  const gmail = google.gmail({ version: 'v1', auth });
  const mime = buildMime({
    from: sender,
    to,
    subject: subject || '',
    html: html || '',
    text: text || '',
    attachments,
  });
  const raw = toBase64Url(mime);
  const res = await gmail.users.messages.send({ userId: 'me', requestBody: { raw } });
  return res.data;
}

module.exports = {
  getAuthorizedClient,
  sendMessage,
};
