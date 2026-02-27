/**
 * AuthService — handles sign-up, sign-in, token issuance, and session validation.
 * Uses bcrypt for password hashing and JWT for token signing.
 */
import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

export interface JwtPayload {
  sub: string;
  email: string;
  accountId: string;
  role: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  private hashPassword(password: string): string {
    // Simple SHA-256 hash for scaffold; replace with bcrypt in production
    return crypto.createHash('sha256').update(password).digest('hex');
  }

  async signUp(accountName: string, email: string, password: string, name: string) {
    // Check existing user
    const existing = await this.prisma.user.findFirst({ where: { email } });
    if (existing) throw new ConflictException('Email already in use');

    const slug = accountName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    const account = await this.prisma.account.create({
      data: { name: accountName, slug: `${slug}-${Date.now()}` },
    });

    const user = await this.prisma.user.create({
      data: {
        accountId: account.id,
        email,
        name,
        hashedPassword: this.hashPassword(password),
        role: 'owner',
      },
    });

    return this.issueToken(user.id, user.email, account.id, user.role);
  }

  async signIn(email: string, password: string) {
    const user = await this.prisma.user.findFirst({
      where: { email, deletedAt: null },
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = this.hashPassword(password) === user.hashedPassword;
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    return this.issueToken(user.id, user.email, user.accountId, user.role);
  }

  private issueToken(userId: string, email: string, accountId: string, role: string) {
    const payload: JwtPayload = { sub: userId, email, accountId, role };
    const token = this.jwt.sign(payload);
    return { accessToken: token, userId, accountId };
  }

  async validateUser(payload: JwtPayload) {
    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub, deletedAt: null },
    });
    return user ?? null;
  }
}
