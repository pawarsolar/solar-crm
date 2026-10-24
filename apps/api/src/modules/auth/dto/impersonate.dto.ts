import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class ImpersonateDto {
  @IsString()
  @IsNotEmpty({ message: 'A target user_id is required to start a child login' })
  @IsUUID('4', { message: 'user_id must be a valid user identifier' })
  user_id: string;
}
