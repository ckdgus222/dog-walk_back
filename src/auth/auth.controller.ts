import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { JwtAuthGuard } from './guard/jwt-auth.guard';
import { AuthUser } from './strategies/jwt.strategy';

type AuthenticatedRequest = Request & {
  user: AuthUser;
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  signup(@Body() signupDto: SignupDto): Promise<AuthResponseDto> {
    return this.authService.signup(signupDto);
  }

  @Post('login')
  login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(loginDto);
  }

  @Post('refresh')
  refresh(
    @Headers('x-refresh-token') refreshToken: string,
  ): Promise<AuthResponseDto> {
    return this.authService.refresh(refreshToken);
  }

  @HttpCode(200)
  @Post('logout')
  async logout(@Headers('x-refresh-token') refreshToken: string) {
    await this.authService.logout(refreshToken);

    return {
      success: true,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() request: AuthenticatedRequest) {
    return {
      user: request.user,
    };
  }
}
