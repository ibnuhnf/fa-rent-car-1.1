import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { Request } from 'express';
import { PrismaService } from '../database/prisma.service';

export interface AuthenticatedPortal {
  bookingId: string;
  tokenId: string;
}

export interface PortalRequest extends Request {
  portal: AuthenticatedPortal;
}

@Injectable()
export class PortalTokenGuard implements CanActivate {
  constructor(private readonly database: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<PortalRequest>();
    const rawHeader =
      request.headers['x-portal-token'] ?? request.headers['X-Portal-Token'];
    const token = typeof rawHeader === 'string' ? rawHeader.trim() : null;

    if (!token) {
      throw new UnauthorizedException({
        code: 'PORTAL_TOKEN_INVALID',
        message: 'Token portal wajib disertakan.',
      });
    }

    const tokenHash = createHash('sha256').update(token).digest('hex');
    const now = new Date();

    const accessToken = await this.database.bookingAccessToken.findFirst({
      where: {
        tokenHash,
        expiresAt: { gt: now },
        booking: { deletedAt: null },
      },
    });

    if (!accessToken) {
      throw new UnauthorizedException({
        code: 'PORTAL_TOKEN_INVALID',
        message: 'Token portal tidak valid atau telah kedaluwarsa.',
      });
    }

    // Fire and forget lastUsedAt update
    void this.database.bookingAccessToken
      .update({
        where: { id: accessToken.id },
        data: { lastUsedAt: now },
      })
      .catch(() => {});

    request.portal = {
      bookingId: accessToken.bookingId,
      tokenId: accessToken.id,
    };

    return true;
  }
}

export const CurrentPortal = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedPortal =>
    context.switchToHttp().getRequest<PortalRequest>().portal,
);
