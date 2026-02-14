import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';
import { AuthUser } from '../auth/strategies/jwt.strategy';
import { UpdateMeDto } from './dto/update-me.dto';
import { MeService } from './me.service';

type AuthenticatedRequest = Request & {
  user: AuthUser;
};

@UseGuards(JwtAuthGuard)
@Controller('me')
export class MeController {
  constructor(private readonly meService: MeService) {}

  @Get()
  getMe(@Req() request: AuthenticatedRequest) {
    return this.meService.getMe(request.user.id);
  }

  @Patch()
  updateMe(
    @Req() request: AuthenticatedRequest,
    @Body() updateMeDto: UpdateMeDto,
  ) {
    return this.meService.updateMe(request.user.id, updateMeDto);
  }
}
