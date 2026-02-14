import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import { ERROR_MESSAGES } from '../common/constants';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateMeDto } from './dto/update-me.dto';

type MeUser = Pick<
  User,
  | 'id'
  | 'email'
  | 'nickname'
  | 'profileImage'
  | 'bio'
  | 'createdAt'
  | 'updatedAt'
>;

type MeResponse = {
  user: MeUser;
};

@Injectable()
export class MeService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(userId: string): Promise<MeResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: this.userSelect,
    });

    if (!user) {
      throw new NotFoundException(ERROR_MESSAGES.USER.NOT_FOUND);
    }

    return { user };
  }

  async updateMe(
    userId: string,
    updateMeDto: UpdateMeDto,
  ): Promise<MeResponse> {
    const exists = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!exists) {
      throw new NotFoundException(ERROR_MESSAGES.USER.NOT_FOUND);
    }

    const data = this.toUserUpdateData(updateMeDto);
    if (Object.keys(data).length === 0) {
      return this.getMe(userId);
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data,
      select: this.userSelect,
    });

    return { user };
  }

  private toUserUpdateData(updateMeDto: UpdateMeDto): Prisma.UserUpdateInput {
    const data: Prisma.UserUpdateInput = {};

    if (updateMeDto.nickname !== undefined) {
      data.nickname = updateMeDto.nickname;
    }
    if (updateMeDto.profileImage !== undefined) {
      data.profileImage = updateMeDto.profileImage;
    }
    if (updateMeDto.bio !== undefined) {
      data.bio = updateMeDto.bio;
    }

    return data;
  }

  private readonly userSelect = {
    id: true,
    email: true,
    nickname: true,
    profileImage: true,
    bio: true,
    createdAt: true,
    updatedAt: true,
  } satisfies Prisma.UserSelect;
}
