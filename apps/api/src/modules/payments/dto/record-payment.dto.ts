import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsIn,
  Min,
} from 'class-validator';

export class RecordPaymentDto {
  @IsString()
  @IsNotEmpty()
  lead_id: string;

  @IsString()
  @IsOptional()
  quotation_id?: string;

  @IsString()
  @IsIn(['booking', 'advance', 'milestone', 'final'], {
    message: 'Type must be booking, advance, milestone, or final',
  })
  type: 'booking' | 'advance' | 'milestone' | 'final';

  @IsNumber()
  @Min(1)
  amount: number;

  @IsString()
  @IsOptional()
  due_date?: string;

  @IsString()
  @IsOptional()
  paid_on?: string;

  @IsString()
  @IsOptional()
  mode?: string;

  @IsString()
  @IsOptional()
  ref_no?: string;

  @IsString()
  @IsOptional()
  @IsIn(['pending', 'paid', 'failed'])
  status?: 'pending' | 'paid' | 'failed';
}
