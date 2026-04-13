import { IsArray, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BulkApproveDto {
  @ApiProperty({
    description: 'Array of draft UUIDs to approve',
    example: ['uuid-1', 'uuid-2'],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  draftIds!: string[];
}
