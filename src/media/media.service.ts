import { BadRequestException, Injectable } from '@nestjs/common';
import { MediaPurpose, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { ERROR_MESSAGES } from '../common/constants';
import { PrismaService } from '../prisma/prisma.service';
import { MediaPurposeDto } from './dto/upload-media.dto';
import { DOG_PROFILE_TEMP_PREFIX, toUploadsUrl } from './media-storage.util';

type UploadedFileInput = {
  buffer: Buffer;
  mimetype: string;
  size: number;
};

type UploadMediaResponse = {
  file: {
    id: string;
    purpose: MediaPurpose;
    url: string;
    mimeType: string;
    size: number;
  };
};

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const MAX_IMAGE_FILE_SIZE = 5 * 1024 * 1024;

const toMediaPurpose = (purpose: MediaPurposeDto): MediaPurpose => {
  switch (purpose) {
    case MediaPurposeDto.DOG_PROFILE:
      return MediaPurpose.DOG_PROFILE;
    case MediaPurposeDto.FEED_POST:
      return MediaPurpose.FEED_POST;
  }
};

@Injectable()
export class MediaService {
  constructor(private readonly prisma: PrismaService) {}

  async uploadImage(
    file: UploadedFileInput | undefined,
    purpose: MediaPurposeDto,
  ): Promise<UploadMediaResponse> {
    if (!file) {
      throw new BadRequestException(ERROR_MESSAGES.MEDIA.FILE_REQUIRED);
    }

    if (file.size > MAX_IMAGE_FILE_SIZE) {
      throw new BadRequestException(ERROR_MESSAGES.MEDIA.FILE_TOO_LARGE);
    }

    const extension = MIME_TO_EXT[file.mimetype];
    if (!extension) {
      throw new BadRequestException(
        ERROR_MESSAGES.MEDIA.UNSUPPORTED_IMAGE_TYPE,
      );
    }

    const basePrefix =
      purpose === MediaPurposeDto.DOG_PROFILE
        ? DOG_PROFILE_TEMP_PREFIX
        : 'media/';
    const storageKey = `${basePrefix}${randomUUID()}.${extension}`;
    const absolutePath = join(process.cwd(), 'uploads', storageKey);

    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, file.buffer);

    const mediaCreateArgs = {
      data: {
        purpose: toMediaPurpose(purpose),
        storageKey,
        url: toUploadsUrl(storageKey),
        mimeType: file.mimetype,
        size: file.size,
      },
      select: {
        id: true,
        purpose: true,
        url: true,
        mimeType: true,
        size: true,
      },
    } satisfies Prisma.MediaCreateArgs;

    const media = await this.prisma.media.create(mediaCreateArgs);

    return {
      file: media,
    };
  }
}
