import { createZodDto } from 'nestjs-zod';
import { createHandoverRequestSchema, handoverDtoSchema } from '@fa/shared';

export class CreateHandoverDto extends createZodDto(createHandoverRequestSchema) {}
export class HandoverDto extends createZodDto(handoverDtoSchema) {}
