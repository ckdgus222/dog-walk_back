import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateMeDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(30)
  nickname?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  profileImage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  bio?: string;
}
