import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RoleCode } from '../common/enums';
import { AuthenticatedUser } from './decorators/current-user.decorator';

function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

export interface PublicUser {
  id: string;
  email: string;
  fullName: string;
  roles: RoleCode[];
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  private toPublicUser(user: { id: string; email: string; fullName: string; roles: { role: { code: string } }[] }): PublicUser {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      roles: user.roles.map((ur) => ur.role.code as RoleCode),
    };
  }

  async validateCredentials(email: string, password: string): Promise<PublicUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { roles: { include: { role: true } } },
    });
    if (!user || !user.isActive) return null;
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return null;
    return this.toPublicUser(user);
  }

  signAccessToken(user: PublicUser): string {
    return this.jwt.sign(
      { sub: user.id, email: user.email, fullName: user.fullName, roles: user.roles },
      {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get<string>('JWT_ACCESS_TTL') ?? '15m',
      },
    );
  }

  async issueRefreshToken(userId: string): Promise<{ raw: string; expiresAt: Date }> {
    const raw = crypto.randomBytes(48).toString('hex');
    const days = parseInt(this.config.get<string>('JWT_REFRESH_TTL_DAYS') ?? '7', 10);
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    await this.prisma.refreshToken.create({
      data: { userId, tokenHash: hashToken(raw), expiresAt },
    });
    return { raw, expiresAt };
  }

  async login(user: PublicUser) {
    const accessToken = this.signAccessToken(user);
    const refresh = await this.issueRefreshToken(user.id);
    await this.audit.record({ actorUserId: user.id, action: 'LOGIN', entityType: 'User', entityId: user.id });
    return { accessToken, refreshToken: refresh.raw, refreshExpiresAt: refresh.expiresAt, user };
  }

  async rotateRefreshToken(rawToken: string) {
    const tokenHash = hashToken(rawToken);
    const record = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (!record || record.revokedAt || record.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token invalid or expired');
    }
    await this.prisma.refreshToken.update({ where: { id: record.id }, data: { revokedAt: new Date() } });

    const dbUser = await this.prisma.user.findUnique({
      where: { id: record.userId },
      include: { roles: { include: { role: true } } },
    });
    if (!dbUser || !dbUser.isActive) throw new UnauthorizedException('Account disabled');

    const user = this.toPublicUser(dbUser);
    const accessToken = this.signAccessToken(user);
    const refresh = await this.issueRefreshToken(user.id);
    return { accessToken, refreshToken: refresh.raw, refreshExpiresAt: refresh.expiresAt, user };
  }

  async revokeRefreshToken(rawToken: string) {
    const tokenHash = hashToken(rawToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async me(userId: string): Promise<PublicUser> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { roles: { include: { role: true } } },
    });
    return this.toPublicUser(user);
  }

  async recordFailedLogin(email: string) {
    await this.audit.record({ action: 'LOGIN_FAILED', entityType: 'User', entityId: email });
  }
}
