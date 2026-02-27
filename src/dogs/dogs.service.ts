import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DogGender, MediaPurpose, Prisma } from '@prisma/client';
import { ERROR_MESSAGES } from '../common/constants';
import {
  moveUploadFile,
  resolveFinalStorageKey,
  toUploadsUrl,
} from '../media/media-storage.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDogDto } from './dto/create-dog.dto';
import { UpdateDogDto } from './dto/update-dog.dto';

type DogProfile = {
  id: string;
  ownerId: string;
  name: string;
  breed: string;
  birthYear: string | null;
  gender: DogGender;
  personality: string[];
  photoFileId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type DogResponse = {
  dog: DogProfile;
};

type DogListResponse = {
  dogs: DogProfile[];
};

type MovedUploadFile = {
  fromStorageKey: string;
  toStorageKey: string;
};

@Injectable()
export class DogsService {
  constructor(private readonly prisma: PrismaService) {}

  async createMyDog(
    userId: string,
    createDogDto: CreateDogDto,
  ): Promise<DogResponse> {
    // 파일 이동이 발생한 경우, DB 실패 시 원복하기 위한 상태값입니다.
    let movedDogPhoto: MovedUploadFile | null = null;

    try {
      // Dog 생성 + Media 귀속/경로 확정을 하나의 트랜잭션으로 처리합니다.
      return await this.prisma.$transaction(async (tx) => {
        let finalizedPhotoStorageKey: string | null = null;

        if (createDogDto.photoFileId) {
          // 전달된 photoFileId가 현재 사용자 기준으로 연결 가능한지 검증합니다.
          const media = await this.validateDogPhotoFileAndGetMeta(tx, {
            photoFileId: createDogDto.photoFileId,
            userId,
          });

          // 임시 업로드 키(tmp/...)면 최종 키로 승격합니다.
          finalizedPhotoStorageKey = resolveFinalStorageKey(media.storageKey);
          if (finalizedPhotoStorageKey !== media.storageKey) {
            await this.movePhotoFileOrThrow({
              sourceStorageKey: media.storageKey,
              targetStorageKey: finalizedPhotoStorageKey,
            });
            movedDogPhoto = {
              fromStorageKey: media.storageKey,
              toStorageKey: finalizedPhotoStorageKey,
            };
          }
        }

        // ownerId는 인증 사용자 ID로 강제합니다.
        const dog = await tx.dog.create({
          data: {
            ownerId: userId,
            name: createDogDto.name,
            breed: createDogDto.breed,
            birthYear: this.normalizeBirthYear(createDogDto.birthYear),
            gender: createDogDto.gender as DogGender,
            personality: createDogDto.personality,
            photoFileId: createDogDto.photoFileId,
          },
          select: this.dogSelect,
        });

        if (createDogDto.photoFileId) {
          // 강아지 생성 성공 후 파일 귀속/경로를 최종 확정합니다.
          await tx.media.update({
            where: { id: createDogDto.photoFileId },
            data: {
              uploaderUserId: userId,
              ...(finalizedPhotoStorageKey && movedDogPhoto
                ? {
                    storageKey: finalizedPhotoStorageKey,
                    url: toUploadsUrl(finalizedPhotoStorageKey),
                  }
                : {}),
            },
          });
        }

        return { dog };
      });
    } catch (error) {
      // 트랜잭션 실패 시 이동된 파일이 있으면 원래 임시 위치로 복구 시도
      await this.rollbackMovedUploadFile(movedDogPhoto);
      throw error;
    }
  }

  async getMyDogs(userId: string): Promise<DogListResponse> {
    // 소유자(ownerId) 기준으로만 조회하여 타 사용자 데이터 노출을 차단합니다.
    const dogs = await this.prisma.dog.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: 'desc' },
      select: this.dogSelect,
    });

    return { dogs };
  }

  async updateMyDog(
    userId: string,
    dogId: string,
    updateDogDto: UpdateDogDto,
  ): Promise<DogResponse> {
    // 수정 플로우도 파일 이동 원복 포인트를 동일하게 유지합니다.
    let movedDogPhoto: MovedUploadFile | null = null;

    try {
      return await this.prisma.$transaction(async (tx) => {
        // dogId + ownerId 동시 조건으로 조회해 비소유 접근을 은닉(404)합니다.
        const existingDog = await tx.dog.findFirst({
          where: {
            id: dogId,
            ownerId: userId,
          },
          select: {
            id: true,
            photoFileId: true,
          },
        });

        if (!existingDog) {
          throw new NotFoundException(ERROR_MESSAGES.DOG.NOT_FOUND);
        }

        let finalizedPhotoStorageKey: string | null = null;
        if (updateDogDto.photoFileId) {
          // 기존 강아지(currentDogId)는 동일 사진 재사용을 허용합니다.
          const media = await this.validateDogPhotoFileAndGetMeta(tx, {
            photoFileId: updateDogDto.photoFileId,
            userId,
            currentDogId: existingDog.id,
          });

          // 임시 파일이면 최종 경로로 승격
          finalizedPhotoStorageKey = resolveFinalStorageKey(media.storageKey);
          if (finalizedPhotoStorageKey !== media.storageKey) {
            await this.movePhotoFileOrThrow({
              sourceStorageKey: media.storageKey,
              targetStorageKey: finalizedPhotoStorageKey,
            });
            movedDogPhoto = {
              fromStorageKey: media.storageKey,
              toStorageKey: finalizedPhotoStorageKey,
            };
          }
        }

        const data = this.toDogUpdateData(updateDogDto);
        if (Object.keys(data).length === 0) {
          // 빈 PATCH는 현재 상태를 그대로 반환합니다.
          const dog = await tx.dog.findUniqueOrThrow({
            where: { id: existingDog.id },
            select: this.dogSelect,
          });
          return { dog };
        }

        const dog = await tx.dog.update({
          where: { id: existingDog.id },
          data,
          select: this.dogSelect,
        });

        if (updateDogDto.photoFileId) {
          // 사진 교체 성공 시 미디어 소유/경로를 최종 확정
          await tx.media.update({
            where: { id: updateDogDto.photoFileId },
            data: {
              uploaderUserId: userId,
              ...(finalizedPhotoStorageKey && movedDogPhoto
                ? {
                    storageKey: finalizedPhotoStorageKey,
                    url: toUploadsUrl(finalizedPhotoStorageKey),
                  }
                : {}),
            },
          });
        }

        return { dog };
      });
    } catch (error) {
      await this.rollbackMovedUploadFile(movedDogPhoto);
      throw error;
    }
  }

  private normalizeBirthYear(
    value: string | undefined,
  ): string | null | undefined {
    // 빈 문자열은 DB null로 정규화해 "미입력" 의미를 통일합니다.
    if (value === undefined) {
      return undefined;
    }
    return value === '' ? null : value;
  }

  private toDogUpdateData(
    updateDogDto: UpdateDogDto,
  ): Prisma.DogUncheckedUpdateInput {
    // 전달된 필드만 부분 업데이트되도록 업데이트 객체를 동적으로 구성합니다.
    const data: Prisma.DogUncheckedUpdateInput = {};

    if (updateDogDto.name !== undefined) {
      data.name = updateDogDto.name;
    }
    if (updateDogDto.breed !== undefined) {
      data.breed = updateDogDto.breed;
    }
    if (updateDogDto.birthYear !== undefined) {
      data.birthYear = this.normalizeBirthYear(updateDogDto.birthYear);
    }
    if (updateDogDto.gender !== undefined) {
      data.gender = updateDogDto.gender as DogGender;
    }
    if (updateDogDto.personality !== undefined) {
      data.personality = updateDogDto.personality;
    }
    if (updateDogDto.photoFileId !== undefined) {
      data.photoFileId = updateDogDto.photoFileId;
    }

    return data;
  }

  private async validateDogPhotoFileAndGetMeta(
    tx: Prisma.TransactionClient,
    params: {
      photoFileId: string;
      userId: string;
      currentDogId?: string;
    },
  ): Promise<{
    id: string;
    storageKey: string;
  }> {
    // 검증에 필요한 최소 메타만 조회합니다.
    const media = await tx.media.findUnique({
      where: { id: params.photoFileId },
      select: {
        id: true,
        purpose: true,
        uploaderUserId: true,
        storageKey: true,
        dog: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!media || media.purpose !== MediaPurpose.DOG_PROFILE) {
      // 목적 불일치/파일 없음
      throw new BadRequestException(ERROR_MESSAGES.DOG.INVALID_PHOTO_FILE);
    }

    if (
      media.uploaderUserId !== null &&
      media.uploaderUserId !== params.userId
    ) {
      // 다른 사용자에게 이미 귀속된 파일 차단
      throw new BadRequestException(ERROR_MESSAGES.DOG.INVALID_PHOTO_FILE);
    }

    if (media.dog && media.dog.id !== params.currentDogId) {
      // 다른 강아지에 이미 연결된 파일 차단
      throw new BadRequestException(ERROR_MESSAGES.DOG.INVALID_PHOTO_FILE);
    }

    return {
      id: media.id,
      storageKey: media.storageKey,
    };
  }

  private async movePhotoFileOrThrow(params: {
    sourceStorageKey: string;
    targetStorageKey: string;
  }): Promise<void> {
    try {
      await moveUploadFile(params.sourceStorageKey, params.targetStorageKey);
    } catch {
      // 파일 시스템 오류는 비즈니스 오류(BAD_REQUEST)로 통일
      throw new BadRequestException(ERROR_MESSAGES.DOG.INVALID_PHOTO_FILE);
    }
  }

  private async rollbackMovedUploadFile(
    movedUploadFile: MovedUploadFile | null,
  ): Promise<void> {
    if (!movedUploadFile) {
      return;
    }

    try {
      await moveUploadFile(
        movedUploadFile.toStorageKey,
        movedUploadFile.fromStorageKey,
      );
    } catch {
      // 파일 롤백 실패는 원본 예외를 가리지 않도록 무시합니다.
    }
  }

  private readonly dogSelect = {
    id: true,
    ownerId: true,
    name: true,
    breed: true,
    birthYear: true,
    gender: true,
    personality: true,
    photoFileId: true,
    createdAt: true,
    updatedAt: true,
  } satisfies Prisma.DogSelect;
}
