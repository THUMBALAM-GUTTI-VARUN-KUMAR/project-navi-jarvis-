import { google, gmail_v1 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import http from 'http';
import url from 'url';
import fs from 'fs/promises';
import path from 'path';
import { app, shell } from 'electron';

export interface EmailCredentials {
  clientId: string;
  clientSecret: string;
}

export interface EmailSummary {
  id: string;
  threadId: string;
  snippet: string;
  from: string;
  subject: string;
  date: string;
}

export class EmailManager {
  private oauth2Client: OAuth2Client | null = null;
  private gmail: gmail_v1.Gmail | null = null;
  private tokenPath: string;
  private credentialsPath: string;

  constructor() {
    this.tokenPath = path.join(app.getPath('userData'), 'gmail-token.json');
    this.credentialsPath = path.join(app.getPath('userData'), 'gmail-credentials.json');
  }

  public async getStatus() {
    const hasCredentials = await this.fileExists(this.credentialsPath);
    const hasToken = await this.fileExists(this.tokenPath);
    let isAuthenticated = false;

    if (hasCredentials && hasToken) {
      try {
        await this.initializeClient();
        isAuthenticated = true;
      } catch (e) {
        isAuthenticated = false;
      }
    }

    return {
      hasCredentials,
      isAuthenticated,
    };
  }

  public async saveCredentials(clientId: string, clientSecret: string) {
    await fs.writeFile(this.credentialsPath, JSON.stringify({ clientId, clientSecret }));
    return { success: true };
  }

  public async connect(): Promise<{ success: boolean; error?: string }> {
    try {
      const creds = await this.loadCredentials();
      if (!creds) throw new Error("No credentials found");

      this.oauth2Client = new google.auth.OAuth2(
        creds.clientId,
        creds.clientSecret,
        'http://localhost:3000/oauth2callback'
      );

      // Check if we have a token
      const token = await this.loadToken();
      if (token) {
        this.oauth2Client.setCredentials(token);
        this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
        return { success: true };
      }

      // No token, start OAuth flow
      return await this.startOAuthFlow();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async disconnect() {
    try {
      await fs.unlink(this.tokenPath);
      this.oauth2Client = null;
      this.gmail = null;
    } catch (e) {}
    return { success: true };
  }

  private async startOAuthFlow(): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      if (!this.oauth2Client) {
        return resolve({ success: false, error: "OAuth client not initialized" });
      }

      const authorizeUrl = this.oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: [
          'https://www.googleapis.com/auth/gmail.readonly',
          'https://www.googleapis.com/auth/gmail.send',
          'https://www.googleapis.com/auth/gmail.modify'
        ],
        prompt: 'consent' // Force to get refresh token
      });

      const server = http.createServer(async (req, res) => {
        try {
          if (req.url && req.url.indexOf('/oauth2callback') > -1) {
            const qs = new url.URL(req.url, 'http://localhost:3000').searchParams;
            const code = qs.get('code');
            
            res.end('Authentication successful! You can close this tab and return to Navi.');
            server.destroy();

            if (code && this.oauth2Client) {
              const { tokens } = await this.oauth2Client.getToken(code);
              this.oauth2Client.setCredentials(tokens);
              await fs.writeFile(this.tokenPath, JSON.stringify(tokens));
              this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
              resolve({ success: true });
            } else {
              resolve({ success: false, error: "Failed to get auth code" });
            }
          }
        } catch (e: any) {
          res.end('Authentication failed: ' + e.message);
          resolve({ success: false, error: e.message });
        }
      });

      // Handle server destroy
      import('server-destroy').then(({ default: enableDestroy }) => {
        enableDestroy(server);
      }).catch(() => {
        // Simple fallback if server-destroy is not available
        (server as any).destroy = () => server.close();
      });

      server.listen(3000, () => {
        // Open the browser to the authorize url to start the workflow
        shell.openExternal(authorizeUrl);
      });
    });
  }

  private async initializeClient() {
    const creds = await this.loadCredentials();
    const token = await this.loadToken();
    
    if (creds && token) {
      this.oauth2Client = new google.auth.OAuth2(
        creds.clientId,
        creds.clientSecret,
        'http://localhost:3000/oauth2callback'
      );
      this.oauth2Client.setCredentials(token);
      this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
      
      // Test connection
      await this.gmail.users.getProfile({ userId: 'me' });
    } else {
      throw new Error("Missing credentials or token");
    }
  }

  private async loadCredentials(): Promise<EmailCredentials | null> {
    try {
      const data = await fs.readFile(this.credentialsPath, 'utf8');
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  private async loadToken(): Promise<any | null> {
    try {
      const data = await fs.readFile(this.tokenPath, 'utf8');
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  private async fileExists(p: string): Promise<boolean> {
    try {
      await fs.access(p);
      return true;
    } catch {
      return false;
    }
  }

  // --- Gmail API Methods ---

  public async searchEmails(query: string, maxResults: number = 10): Promise<EmailSummary[]> {
    if (!this.gmail) throw new Error("Gmail not connected");
    
    const res = await this.gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults
    });

    if (!res.data.messages) return [];

    const emails: EmailSummary[] = [];
    for (const msg of res.data.messages) {
      if (!msg.id) continue;
      const detail = await this.gmail.users.messages.get({
        userId: 'me',
        id: msg.id,
        format: 'metadata',
        metadataHeaders: ['From', 'Subject', 'Date']
      });

      const headers = detail.data.payload?.headers;
      const from = headers?.find(h => h.name === 'From')?.value || 'Unknown';
      const subject = headers?.find(h => h.name === 'Subject')?.value || 'No Subject';
      const date = headers?.find(h => h.name === 'Date')?.value || '';

      emails.push({
        id: detail.data.id!,
        threadId: detail.data.threadId!,
        snippet: detail.data.snippet || '',
        from,
        subject,
        date
      });
    }

    return emails;
  }

  public async getThread(threadId: string): Promise<string> {
    if (!this.gmail) throw new Error("Gmail not connected");
    
    const res = await this.gmail.users.threads.get({
      userId: 'me',
      id: threadId,
      format: 'full'
    });

    // Extremely simple text extraction for the LLM
    let textContent = "";
    if (res.data.messages) {
      res.data.messages.forEach(msg => {
        const from = msg.payload?.headers?.find(h => h.name === 'From')?.value;
        const date = msg.payload?.headers?.find(h => h.name === 'Date')?.value;
        textContent += `\\n--- From: ${from} on ${date} ---\\n`;
        textContent += msg.snippet + "\\n"; 
        // Note: For a real app, we would recursively decode msg.payload.parts base64url data
        // For simplicity and token limit safety, we return the snippet which Google pre-generates.
      });
    }
    return textContent;
  }
}
