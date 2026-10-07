import { createZodDto } from 'nestjs-zod';
import {
  portalDocumentConfirmRequestSchema,
  portalDocumentStagingRequestSchema,
  portalRequestChangeSchema,
  submitDriverRatingRequestSchema,
} from '@fa/shared';

export class PortalDocumentStagingDto extends createZodDto(portalDocumentStagingRequestSchema) {}
export class PortalDocumentConfirmDto extends createZodDto(portalDocumentConfirmRequestSchema) {}
export class PortalRequestChangeDto extends createZodDto(portalRequestChangeSchema) {}
export class SubmitDriverRatingDto extends createZodDto(submitDriverRatingRequestSchema) {}
