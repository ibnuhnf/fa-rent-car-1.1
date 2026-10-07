import { Module } from '@nestjs/common';
import { MaintenancesController } from './maintenances.controller';
import { MaintenancesService } from './maintenances.service';

@Module({
  controllers: [MaintenancesController],
  providers: [MaintenancesService],
  exports: [MaintenancesService],
})
export class MaintenancesModule {}
