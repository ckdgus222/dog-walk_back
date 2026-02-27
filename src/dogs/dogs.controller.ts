import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';
import { AuthUser } from '../auth/strategies/jwt.strategy';
import { CreateDogDto } from './dto/create-dog.dto';
import { UpdateDogDto } from './dto/update-dog.dto';
import { DogsService } from './dogs.service';

type AuthenticatedRequest = Request & {
  user: AuthUser;
};

@UseGuards(JwtAuthGuard)
@Controller('dogs')
export class DogsController {
  constructor(private readonly dogsService: DogsService) {}

  @Post()
  // request.user.id를 ownerId로 사용해 "내 강아지"를 생성합니다.
  createDog(
    @Req() request: AuthenticatedRequest,
    @Body() createDogDto: CreateDogDto,
  ) {
    return this.dogsService.createMyDog(request.user.id, createDogDto);
  }

  @Get('my')
  // 현재 로그인 사용자의 강아지 목록만 조회합니다.
  getMyDogs(@Req() request: AuthenticatedRequest) {
    return this.dogsService.getMyDogs(request.user.id);
  }

  @Patch(':id')
  // URL의 dogId + request.user.id로 소유권이 있는 리소스만 수정합니다.
  updateMyDog(
    @Req() request: AuthenticatedRequest,
    @Param('id') dogId: string,
    @Body() updateDogDto: UpdateDogDto,
  ) {
    return this.dogsService.updateMyDog(request.user.id, dogId, updateDogDto);
  }
}
