import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuditService } from './audit/audit.service';
import { ACCESS_TTL_SECONDS } from './auth/auth-cookies';
import { AdminAuthGuard } from './auth/admin-auth.guard';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { CsrfGuard } from './auth/csrf.guard';
import { loginTracker } from './auth/login-throttle';
import { RolesGuard } from './auth/roles.guard';
import { validateEnvironment, type Environment } from './config/environment';
import { PrismaService } from './database/prisma.service';
import { FoundationController } from './foundation/foundation.controller';
import { FoundationService } from './foundation/foundation.service';
import { HealthController } from './health/health.controller';
import { JobsService } from './jobs/jobs.service';
import { StorageController } from './storage/storage.controller';
import { StorageService } from './storage/storage.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true, validate: validateEnvironment }),
    ThrottlerModule.forRoot([
      { name: 'default', ttl: 60_000, limit: 120 },
      {
        name: 'login',
        ttl: 60_000,
        limit: 10,
        skipIf: (context) => context.getHandler() !== AuthController.prototype.login,
        getTracker: loginTracker,
      },
    ]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Environment, true>) => ({
        secret: config.get('JWT_SECRET', { infer: true }),
        signOptions: {
          expiresIn: ACCESS_TTL_SECONDS,
          issuer: 'fa-rent-car',
          audience: 'fa-admin',
          algorithm: 'HS256',
        },
        verifyOptions: { issuer: 'fa-rent-car', audience: 'fa-admin', algorithms: ['HS256'] },
      }),
    }),
  ],
  controllers: [AuthController, FoundationController, HealthController, StorageController],
  providers: [
    PrismaService,
    AuditService,
    AuthService,
    AdminAuthGuard,
    CsrfGuard,
    RolesGuard,
    FoundationService,
    JobsService,
    StorageService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
