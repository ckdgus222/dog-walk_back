import { IsArray, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { DogGenderDto } from './create-dog.dto';

export class UpdateDogDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  breed?: string;

  @IsOptional()
  @IsString()
  birthYear?: string;

  @IsOptional()
  @IsEnum(DogGenderDto)
  gender?: DogGenderDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  personality?: string[];

  @IsOptional()
  @IsUUID()
  photoFileId?: string;
}
