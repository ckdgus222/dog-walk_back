import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export enum DogGenderDto {
  MALE = 'male',
  FEMALE = 'female',
}

export class CreateDogDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  breed: string;

  @IsOptional()
  @IsString()
  birthYear?: string;

  @IsEnum(DogGenderDto)
  gender: DogGenderDto;

  @IsArray()
  @IsString({ each: true })
  personality: string[];

  @IsOptional()
  @IsUUID()
  // /media/upload 응답 file.id를 연결할 때 사용합니다.
  photoFileId?: string;
}
