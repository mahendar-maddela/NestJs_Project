import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

type ChannelHandler = (channel: string, message: string) => void;

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;
  private publisher: Redis;
  private subscriber: Redis;
  private isConnected = false;

  /** Registered pub/sub channels and their handlers (survive disconnects). */
  private readonly subscriptions = new Map<string, ChannelHandler>();
  /** Channels the live subscriber client has actually subscribed to. */
  private readonly subscribedChannels = new Set<string>();
  private messageListenerBound = false;

  // Clients are created here, not in onModuleInit: Nest doesn't guarantee this module's
  // onModuleInit runs before other services' onModuleInit that inject RedisService and
  // immediately call getSubscriber()/getPublisher() (e.g. anything wiring up pub/sub on
  // startup) — constructing them eagerly means they're always ready the moment DI resolves
  // this service. ioredis itself connects lazily and queues commands, so this is non-blocking.
  constructor(private readonly configService: ConfigService) {
    this.connect();
  }

  private connect(): void {
    const host = this.configService.get<string>('REDIS_HOST', 'localhost');
    const port = this.configService.get<number>('REDIS_PORT', 6379);
    const password = this.configService.get<string>('REDIS_PASSWORD');

    const redisOptions = {
      host,
      port,
      password: password || undefined,
      maxRetriesPerRequest: 3,
      // Never give up: keep retrying with capped backoff so the app self-heals when Redis
      // comes back. Returning null here (the previous behaviour after 3 tries) permanently
      // kills the client — pub/sub listeners would stay dead until the process restarted.
      retryStrategy: (times: number) => Math.min(times * 200, 5000),
    };

    this.client = new Redis(redisOptions);
    this.publisher = new Redis(redisOptions);
    this.subscriber = new Redis(redisOptions);

    const markConnected = () => {
      if (!this.isConnected) {
        this.isConnected = true;
        this.logger.log(`✅ Redis connected at ${host}:${port}`);
      }
    };
    const markDisconnected = () => {
      this.isConnected = false;
    };

    for (const connection of [this.client, this.publisher, this.subscriber]) {
      connection.on('connect', markConnected);
      connection.on('ready', markConnected);
      connection.on('close', markDisconnected);
      connection.on('end', markDisconnected);
      // Swallow errors: ioredis keeps retrying in the background, and commands are already
      // guarded by `isConnected`, so a Redis outage must not crash or spam the API.
      connection.on('error', markDisconnected);
    }

    // (Re)establish every registered subscription whenever the subscriber becomes ready —
    // covers the initial connect as well as reconnects after an outage.
    this.subscriber.on('ready', () => {
      this.flushSubscriptions();
    });
  }

  /** Subscribes to every registered channel the live subscriber client isn't already on. */
  private flushSubscriptions(): void {
    if (this.subscriber.status !== 'ready') return;
    for (const channel of this.subscriptions.keys()) {
      if (this.subscribedChannels.has(channel)) continue;
      this.subscriber.subscribe(channel, (err) => {
        if (err) {
          // Not fatal — the next 'ready' event retries it.
          this.logger.warn(`Failed to subscribe to ${channel}: ${err.message}`);
        } else {
          this.subscribedChannels.add(channel);
          this.logger.log(`📡 Subscribed to ${channel}`);
        }
      });
    }
  }

  /**
   * Register a pub/sub listener that survives Redis outages. If Redis isn't ready yet the
   * subscription is queued and established automatically the moment it (re)connects — callers
   * never see the raw "Connection is closed" errors of subscribing on a dead client.
   */
  subscribe(channel: string, handler: ChannelHandler): void {
    this.subscriptions.set(channel, handler);

    if (!this.messageListenerBound) {
      this.messageListenerBound = true;
      this.subscriber.on('message', (receivedChannel, message) => {
        const registeredHandler = this.subscriptions.get(receivedChannel);
        if (registeredHandler) registeredHandler(receivedChannel, message);
      });
    }

    if (this.subscriber.status === 'ready') {
      this.flushSubscriptions();
    } else if (!this.subscribedChannels.has(channel)) {
      this.logger.warn(`Redis not ready — subscription to ${channel} queued, will activate on reconnect`);
    }
  }

  unsubscribe(channel: string): void {
    this.subscriptions.delete(channel);
    if (this.subscribedChannels.has(channel)) {
      this.subscribedChannels.delete(channel);
      this.subscriber.unsubscribe(channel);
    }
  }

  getClient(): Redis {
    return this.client;
  }

  getPublisher(): Redis {
    return this.publisher;
  }

  getSubscriber(): Redis {
    return this.subscriber;
  }

  async get(key: string): Promise<string | null> {
    try {
      if (!this.isConnected) return null;
      return await this.client.get(key);
    } catch {
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<'OK' | null> {
    try {
      if (!this.isConnected) return null;
      if (ttlSeconds) {
        return await this.client.set(key, value, 'EX', ttlSeconds);
      }
      return await this.client.set(key, value);
    } catch {
      return null;
    }
  }

  async del(key: string): Promise<number> {
    try {
      if (!this.isConnected) return 0;
      return await this.client.del(key);
    } catch {
      return 0;
    }
  }

  async publish(channel: string, message: string): Promise<number> {
    try {
      if (!this.isConnected) return 0;
      return await this.publisher.publish(channel, message);
    } catch {
      return 0;
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.client.quit();
      await this.publisher.quit();
      await this.subscriber.quit();
      this.logger.log('✅ Redis connections closed cleanly');
    } catch {
      // Ignore disconnect errors
    }
  }
}
