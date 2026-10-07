import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PortalTokenGuard } from './portal-token.guard';

describe('PortalTokenGuard', () => {
  let guard: PortalTokenGuard;
  let database: {
    bookingAccessToken: {
      findFirst: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
  };

  const createMockContext = (headers: Record<string, string | undefined>): ExecutionContext => {
    const request = { headers, portal: undefined };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    database = {
      bookingAccessToken: {
        findFirst: vi.fn(),
        update: vi.fn().mockResolvedValue({}),
      },
    };
    guard = new PortalTokenGuard(database as never);
  });

  it('mengizinkan akses bila token valid dan belum kedaluwarsa', async () => {
    const rawToken = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');

    database.bookingAccessToken.findFirst.mockResolvedValue({
      id: 'token-1',
      bookingId: 'booking-1',
      tokenHash,
      expiresAt: new Date(Date.now() + 86400000),
    });

    const context = createMockContext({ 'x-portal-token': rawToken });
    const allowed = await guard.canActivate(context);

    expect(allowed).toBe(true);
    const req = context.switchToHttp().getRequest() as { portal?: { bookingId: string } };
    expect(req.portal?.bookingId).toBe('booking-1');
  });

  it('melempar UnauthorizedException bila header token tidak ada', async () => {
    const context = createMockContext({});
    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('melempar UnauthorizedException bila token tidak cocok atau sudah expired', async () => {
    database.bookingAccessToken.findFirst.mockResolvedValue(null);
    const context = createMockContext({ 'x-portal-token': 'invalid-token-123' });

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });
});
