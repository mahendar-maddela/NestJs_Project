import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { initializeApp, getApp, cert, App } from 'firebase-admin/app';
import { getMessaging, Message } from 'firebase-admin/messaging';

export interface ClientPushPayload {
  title?: string;
  body?: Record<string, unknown> & { message?: string };
  type?: string;
}

/**
 * Mirrors `utils/pushNotification.js`. Each client (tenant) has its own Firebase project — the
 * service account JSON is uploaded and stored as a `Media` row
 * (`entityType='Client', mediable_type='pushNotification'`), not a single shared project.
 */
@Injectable()
export class FirebaseService {
  private readonly logger = new Logger(FirebaseService.name);
  private readonly appCache = new Map<number, App>();

  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) { }

  /** `Media.url` is stored as a path relative to the `uploads/` static root (e.g.
   *  `uploads/pushNotification/xyz.json`), matching legacy's `saveMedia` — never a full URL.
   *  `BASE_URL` (e.g. `http://localhost:8080/uploads`) already includes that root, so resolving
   *  naively would double it up; strip it back to the server origin before joining. */
  private resolveMediaUrl(url: string): string {
    if (/^https?:\/\//i.test(url)) return url;
    const baseUrl = this.configService.get<string>('BASE_URL') || '';
    const origin = baseUrl.replace(/\/uploads\/?$/i, '');
    return `${origin}/${url.replace(/^\/+/, '')}`;
  }

  private async getClientApp(clientId: number): Promise<App | null> {
    const cached = this.appCache.get(clientId);
    if (cached) return cached;

    const appName = `client-${clientId}`;
    try {
      const existing = getApp(appName);
      this.appCache.set(clientId, existing);
      return existing;
    } catch {
      // Not yet initialized in this process — fall through to fetch + init.
    }

    const media = await this.dataSource
      .createQueryBuilder()
      .select('m.url', 'url')
      .from('Media', 'm')
      .where('m.mediable_id = :clientId AND m.entityType = :entityType AND m.mediable_type = :mediableType', {
        clientId,
        entityType: 'Client',
        mediableType: 'pushNotification',
      })
      .getRawOne();

    if (!media?.url) {
      this.logger.warn(`No Firebase service account configured for client ${clientId}`);
      return null;
    }

    try {
      // const response = await fetch(this.resolveMediaUrl(media.url));
      const response = await fetch(media.url);
      const serviceAccount = await response.json();
      const app = initializeApp({ credential: cert(serviceAccount) }, appName);
      this.appCache.set(clientId, app);
      return app;
    } catch (error: any) {
      this.logger.error(`Failed to initialize Firebase app for client ${clientId}: ${error.message}`);
      return null;
    }
  }

  private buildMessage(token: string, payload: ClientPushPayload): Message {
    const dataPayload: Record<string, string> = {};
    if (payload.body) {
      for (const [key, value] of Object.entries(payload.body)) {
        if (value !== undefined && value !== null) dataPayload[key] = String(value);
      }
    }

    return {
      token,
      notification: {
        title: payload.title || '',
        body: payload.body?.message ? String(payload.body.message) : '',
      },
      data: { type: payload.type || '', ...dataPayload },
      android: { priority: 'high' },
      apns: { payload: { aps: { sound: 'default' } } },
    };
  }

  /** Mirrors `globalSinglePushNotification`. */
  async sendToClient(clientId: number, token: string, payload: ClientPushPayload): Promise<void> {
    if (!token || typeof token !== 'string' || !token.trim()) {
      this.logger.warn('Invalid FCM token');
      return;
    }
    const app = await this.getClientApp(clientId);
    if (!app) return;

    try {
      await getMessaging(app).send(this.buildMessage(token, payload));
    } catch (error: any) {
      this.logger.error(`Error sending push notification: ${error.message}`);
    }
  }

  /** Mirrors `globalMultiplePushNotification`. */
  async sendToClientTokens(clientId: number, tokens: string[], payload: ClientPushPayload): Promise<void> {
    const validTokens = tokens.filter((t): t is string => Boolean(t && t.trim()));
    if (!validTokens.length) return;

    const app = await this.getClientApp(clientId);
    if (!app) return;

    try {
      const dataPayload: Record<string, string> = {};
      if (payload.body) {
        for (const [key, value] of Object.entries(payload.body)) {
          if (value !== undefined && value !== null) dataPayload[key] = String(value);
        }
      }

      const res = await getMessaging(app).sendEachForMulticast({
        tokens: validTokens,
        data: { type: payload.type || '', ...dataPayload },
        apns: { payload: { aps: { alert: { title: payload.title, ...dataPayload }, sound: 'default' } } },
        android: { priority: 'high' },
      });
      this.logger.log(`Push multicast for client ${clientId}: ${res.successCount} success, ${res.failureCount} failed`);
    } catch (error: any) {
      this.logger.error(`Error sending multicast push notification: ${error.message}`);
    }
  }
}
