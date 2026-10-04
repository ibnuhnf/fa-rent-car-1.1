import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker, type RedisOptions } from 'bullmq';
import type { Environment } from '../config/environment';
import { PrismaService } from '../database/prisma.service';

export const HOLD_EXPIRY_JOB = 'booking-hold-expiry';
export const HOLD_SWEEP_SCHEDULER = 'booking-hold-sweep';

/** Expire one booking if its hold has genuinely passed; idempotent. */
export async function expireBookingHold(database: PrismaService, bookingId: string, now = new Date()) {
  const booking = await database.booking.findFirst({
    where: {
      id: bookingId,
      status: 'PENDING_VERIFICATION',
      holdExpiresAt: { lte: now },
      deletedAt: null,
    },
    select: { id: true, holdExpiresAt: true },
  });
  if (!booking) return 0;

  await database.$transaction(async (transaction) => {
    await transaction.booking.update({ where: { id: booking.id }, data: { status: 'EXPIRED' } });
    await transaction.auditLog.create({
      data: {
        actorId: null,
        action: 'BOOKING_EXPIRED',
        objectType: 'BOOKING',
        objectId: booking.id,
        before: { holdExpiresAt: booking.holdExpiresAt.toISOString() },
        after: { status: 'EXPIRED' },
      },
    });
  });
  return 1;
}

export function redisConnection(url: string): RedisOptions {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: Number(parsed.port || 6379),
    username: parsed.username ? decodeURIComponent(parsed.username) : undefined,
    password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
    db: parsed.pathname.length > 1 ? Number(parsed.pathname.slice(1)) : 0,
    ...(parsed.protocol === 'rediss:' ? { tls: {} } : {}),
    connectTimeout: 5000,
    maxRetriesPerRequest: 1,
  };
}

@Injectable()
export class JobsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JobsService.name);
  readonly queue: Queue;
  private readonly worker: Worker;

  constructor(
    config: ConfigService<Environment, true>,
    private readonly database: PrismaService,
  ) {
    const connection = redisConnection(config.get('REDIS_URL', { infer: true }));
    const name = config.get('JOB_QUEUE_NAME', { infer: true });
    this.queue = new Queue(name, {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 20,
        removeOnFail: 50,
      },
    });
    this.worker = new Worker(
      name,
      async (job) => {
        if (job.name === 'heartbeat') return { checkedAt: new Date().toISOString() };
        if (job.name === HOLD_EXPIRY_JOB) {
          const bookingId = (job.data as { bookingId?: string }).bookingId;
          if (!bookingId) throw new Error('booking-hold-expiry requires a bookingId');
          return { expired: await expireBookingHold(this.database, bookingId) };
        }
        if (job.name === 'booking-hold-sweep') {
          return { expired: await this.sweepHolds() };
        }
        throw new Error('Unsupported system job');
      },
      { connection: { ...connection, maxRetriesPerRequest: null }, concurrency: 1 },
    );
    this.queue.on('error', () => this.logger.warn('Queue connection unavailable.'));
    this.worker.on('error', () => this.logger.warn('Worker connection unavailable.'));
    this.worker.on('failed', () => this.logger.error('System job failed; retry policy applies.'));
  }

  async onModuleInit() {
    await this.queue.waitUntilReady();
    await this.queue.upsertJobScheduler(
      'foundation-heartbeat',
      { every: 60_000 },
      {
        name: 'heartbeat',
        data: { version: 1 },
        opts: { removeOnComplete: 20, removeOnFail: 50 },
      },
    );
    // Safety net for a lost delayed job: sweep due holds every 5 minutes.
    await this.queue.upsertJobScheduler(
      HOLD_SWEEP_SCHEDULER,
      { every: 5 * 60_000 },
      { name: 'booking-hold-sweep', opts: { removeOnComplete: 20, removeOnFail: 50 } },
    );
  }

  /** Enqueue the per-booking delayed expiry; re-registering the same jobId replaces it. */
  async scheduleHoldExpiry(bookingId: string, holdExpiresAt: Date): Promise<void> {
    const delay = Math.max(0, holdExpiresAt.getTime() - Date.now());
    await this.queue.add(
      HOLD_EXPIRY_JOB,
      { bookingId },
      { delay, jobId: `hold-expiry:${bookingId}`, removeOnComplete: true, removeOnFail: 50 },
    );
  }

  /** Fallback sweep for holds whose delayed job never ran. */
  async sweepHolds(now = new Date()): Promise<number> {
    const due = await this.database.booking.findMany({
      where: { status: 'PENDING_VERIFICATION', holdExpiresAt: { lte: now }, deletedAt: null },
      select: { id: true },
    });

    let expired = 0;
    for (const booking of due) {
      expired += await expireBookingHold(this.database, booking.id, now);
    }
    return expired;
  }

  async check() {
    const redis = await this.queue.client;
    if (!(await redis.info()).includes('redis_version:') || !this.worker.isRunning())
      throw new Error('Queue unavailable');
  }

  async onModuleDestroy() {
    await this.worker.close();
    await this.queue.close();
  }
}
