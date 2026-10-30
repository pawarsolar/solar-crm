import { IsEmail, IsNotEmpty, IsString, IsIn, IsOptional } from 'class-validator';

export class CreateUserDto {
  @IsEmail({}, { message: 'Valid work email is required' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Full name is required' })
  full_name: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsIn(['super_admin', 'sales_admin', 'telecaller', 'sales_exec', 'surveyor', 'installer', 'accounts'], {
    message: 'Invalid role specified',
  })
  role: 'super_admin' | 'sales_admin' | 'telecaller' | 'sales_exec' | 'surveyor' | 'installer' | 'accounts';

  @IsString()
  @IsOptional()
  team_id?: string;

  @IsString()
  @IsOptional()
  password?: string;
}
