import { Type } from 'class-transformer';
import {
  IsArray,
  IsDefined,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
  ValidateNested,
} from 'class-validator';

export enum DogGenderDto {
  MALE = 'male',
  FEMALE = 'female',
}

export class SignupDogDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  breed: string;

  @IsString()
  birthYear: string;

  @IsEnum(DogGenderDto)
  gender: DogGenderDto;

  @IsArray()
  @IsString({ each: true })
  personality: string[];

  @IsOptional()
  @IsUUID()
  // 선업로드(/media/upload) 응답의 data.file.id를 전달받는 필드
  photoFileId?: string;
}

export class SignupDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  nickname: string;

  @IsDefined()
  @ValidateNested()
  @Type(() => SignupDogDto)
  // 회원가입 트랜잭션에서 User 생성과 함께 Dog 생성에 사용됩니다.
  dog: SignupDogDto;
}
