import { createZodDto } from 'nestjs-zod';
import {
  createMaintenanceRequestSchema,
  maintenanceDtoSchema,
  maintenanceListResponseSchema,
  updateMaintenanceRequestSchema,
  vehicleDocumentsResponseSchema,
} from '@fa/shared';

export class CreateMaintenanceDto extends createZodDto(createMaintenanceRequestSchema) {}
export class UpdateMaintenanceDto extends createZodDto(updateMaintenanceRequestSchema) {}
export class MaintenanceDto extends createZodDto(maintenanceDtoSchema) {}
export class MaintenanceListResponseDto extends createZodDto(maintenanceListResponseSchema) {}
export class VehicleDocumentsResponseDto extends createZodDto(vehicleDocumentsResponseSchema) {}
