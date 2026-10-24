import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class UpdateStageDto {
  @IsString()
  @IsNotEmpty({ message: 'Target pipeline stage is required' })
  stage: string;

  @IsString()
  @IsOptional()
  note?: string;
}
