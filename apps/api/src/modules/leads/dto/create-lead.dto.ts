import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsEmail,
  Matches,
} from 'class-validator';

export class CreateLeadDto {
  @IsString()
  @IsNotEmpty({ message: 'Customer name is required' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'Contact phone number is required' })
  @Matches(/^(\+91[\-\s]?)?[0]?(91)?[6789]\d{9}$/, {
    message: 'Please provide a valid 10-digit Indian mobile number',
  })
  phone: string;

  @IsEmail({}, { message: 'Invalid email address' })
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  pincode?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  source?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsNumber()
  @IsOptional()
  monthly_bill?: number;

  @IsNumber()
  @IsOptional()
  system_kw?: number;

  @IsString()
  @IsOptional()
  property_type?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
