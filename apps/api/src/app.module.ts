import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuditService } from './audit/audit.service';
import { AuditLogsController } from './audit/audit-logs.controller';
import { ACCESS_TTL_SECONDS } from './auth/auth-cookies';
import { AdminAuthGuard } from './auth/admin-auth.guard';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { CsrfGuard } from './auth/csrf.guard';
import { loginTracker } from './auth/login-throttle';
import { RolesGuard } from './auth/roles.guard';
import { BookingsController } from './bookings/bookings.controller';
import { BookingsService } from './bookings/bookings.service';
import { validateEnvironment, type Environment } from './config/environment';
import { PrismaService } from './database/prisma.service';
import { DashboardController } from './dashboard/dashboard.controller';
import { DashboardService } from './dashboard/dashboard.service';
import { DriversController } from './drivers/drivers.controller';
import { DriversService } from './drivers/drivers.service';
import { FinancesController } from './finances/finances.controller';
import { FinancesService } from './finances/finances.service';
import { HandoversController } from './handovers/handovers.controller';
import { HandoversService } from './handovers/handovers.service';
import { FoundationController } from './foundation/foundation.controller';
import { FoundationService } from './foundation/foundation.service';
import { HealthController } from './health/health.controller';
import { JobsService } from './jobs/jobs.service';
import { PortalController } from './portal/portal.controller';
import { PortalTokenGuard } from './portal/portal-token.guard';
import { PortalService } from './portal/portal.service';
import { PublicController } from './public/public.controller';
import { PublicService } from './public/public.service';
import { SettingsController } from './settings/settings.controller';
import { SettingsService } from './settings/settings.service';
import { StaffController } from './staff/staff.controller';
import { StaffService } from './staff/staff.service';
import { StorageController } from './storage/storage.controller';
import { StorageService } from './storage/storage.service';
import { VerificationController } from './verification/verification.controller';
import { VerificationService } from './verification/verification.service';
import { MaintenancesController } from './maintenances/maintenances.controller';
import { MaintenancesService } from './maintenances/maintenances.service';
import { AvailabilityService } from './vehicles/availability.service';
import { VehiclesController } from './vehicles/vehicles.controller';
import { VehiclesService } from './vehicles/vehicles.service';

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
  controllers: [
    AuthController,
    AuditLogsController,
    BookingsController,
    DashboardController,
    DriversController,
    FinancesController,
    FoundationController,
    HandoversController,
    HealthController,
    PortalController,
    PublicController,
    SettingsController,
    StaffController,
    StorageController,
    MaintenancesController,
    VehiclesController,
    VerificationController,
  ],
  providers: [
    PrismaService,
    MaintenancesService,
    AuditService,
    AuthService,
    AdminAuthGuard,
    CsrfGuard,
    RolesGuard,
    DashboardService,
    DriversService,
    FinancesService,
    FoundationService,
    HandoversService,
    JobsService,
    PortalTokenGuard,
    PortalService,
    PublicService,
    SettingsService,
    StaffService,
    StorageService,
    VehiclesService,
    AvailabilityService,
    BookingsService,
    VerificationService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
