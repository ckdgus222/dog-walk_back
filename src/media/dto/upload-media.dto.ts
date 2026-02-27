import { IsEnum } from 'class-validator';

export enum MediaPurposeDto {
  DOG_PROFILE = 'DOG_PROFILE',
  FEED_POST = 'FEED_POST',
}

export class UploadMediaDto {
  @IsEnum(MediaPurposeDto)
  purpose: MediaPurposeDto;
}
