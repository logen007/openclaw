import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import nodemailer from 'nodemailer';
import { ImapFlow } from 'imapflow';

const creds = JSON.parse(readFileSync(join(homedir(), '.openclaw/credentials/gmail-creds.json'), 'utf8'));

export function getTransporter() {
  return nodemailer.createTransport({
    host: creds.smtp.host,
    port: creds.smtp.port,
    secure: creds.smtp.secure,
    auth: {
      user: creds.email,
      pass: creds.appPassword,
    },
  });
}

export function getImapClient() {
  return new ImapFlow({
    host: creds.imap.host,
    port: creds.imap.port,
    secure: creds.imap.secure,
    auth: {
      user: creds.email,
      pass: creds.appPassword,
    },
    logger: false,
  });
}

export { creds };
