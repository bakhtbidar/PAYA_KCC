import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthenticatedUser } from './decorators/current-user.decorator';

interface AccessTokenPayload {
  sub: string;
  email: string;
  fullName: string;
  roles: AuthenticatedUser['roles'];
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_ACCESS_SECRET')!,
    });
  }

  validate(payload: AccessTokenPayload): AuthenticatedUser {
    return {
      userId: payload.sub,
      email: payload.email,
      fullName: payload.fullName,
      roles: payload.roles,
    };
  }
}
