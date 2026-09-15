import { Body, Controller, Get, HttpCode, Post, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from './decorators/current-user.decorator';

const REFRESH_COOKIE = 'paya_refresh';

// Must match the actual mounted path of the refresh/logout routes — main.ts sets a global
// "api" prefix, so the real route is /api/auth/refresh, not /auth/refresh. A mismatch here
// means the browser silently never sends the cookie back and session restore breaks.
const REFRESH_COOKIE_PATH = '/api/auth';

function cookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: REFRESH_COOKIE_PATH,
    expires: expiresAt,
  };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const user = await this.auth.validateCredentials(dto.email, dto.password);
    if (!user) {
      await this.auth.recordFailedLogin(dto.email);
      throw new UnauthorizedException('Invalid email or password');
    }
    const { accessToken, refreshToken, refreshExpiresAt, user: publicUser } = await this.auth.login(user);
    res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions(refreshExpiresAt));
    return { accessToken, user: publicUser };
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const rawToken = req.cookies?.[REFRESH_COOKIE];
    if (!rawToken) throw new UnauthorizedException('No refresh token');
    const { accessToken, refreshToken, refreshExpiresAt, user } = await this.auth.rotateRefreshToken(rawToken);
    res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions(refreshExpiresAt));
    return { accessToken, user };
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const rawToken = req.cookies?.[REFRESH_COOKIE];
    if (rawToken) await this.auth.revokeRefreshToken(rawToken);
    res.clearCookie(REFRESH_COOKIE, { path: REFRESH_COOKIE_PATH });
    return { ok: true };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: AuthenticatedUser) {
    return this.auth.me(user.userId);
  }
}
