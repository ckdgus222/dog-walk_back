import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ENV_KEYS, ERROR_MESSAGES } from '../../common/constants';

type TokenType = 'access' | 'refresh';

type JwtPayload = {
  sub: string;
  email: string;
  type: TokenType;
};

export type AuthUser = {
  id: string;
  email: string;
  type: TokenType;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    const secret = configService.get<string>(ENV_KEYS.JWT_SECRET);

    if (!secret) {
      throw new Error('JWT_SECRET is not configured.');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  validate(payload: JwtPayload): AuthUser {
    if (payload.type !== 'access') {
      throw new UnauthorizedException(ERROR_MESSAGES.AUTH.INVALID_TOKEN);
    }

    return {
      id: payload.sub,
      email: payload.email,
      type: payload.type,
    };
  }
}
