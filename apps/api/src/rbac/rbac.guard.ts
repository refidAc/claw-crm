/**
 * RbacGuard — checks Role/Permission table for fine-grained resource access.
 * Use @RequirePermission('contacts', 'read') on controller methods.
 */
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import type { User } from '@crm/db';

export const PERMISSION_KEY = 'permission';
export const RequirePermission = (resource: string, action: string) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (target: any, key: string | symbol, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata(PERMISSION_KEY, { resource, action }, descriptor.value as object);
    return descriptor;
  };

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permission = this.reflector.get<{ resource: string; action: string }>(
      PERMISSION_KEY,
      context.getHandler(),
    );
    if (!permission) return true; // No restriction defined

    const request = context.switchToHttp().getRequest<{ user?: User }>();
    const user = request.user;
    if (!user) return false;

    // Owners bypass RBAC
    if (user.role === 'owner' || user.role === 'admin') return true;

    // Look up DB permissions
    const role = await this.prisma.role.findFirst({
      where: { accountId: user.accountId, name: user.role },
      include: { permissions: true },
    });

    const allowed = role?.permissions.some(
      (p) =>
        (p.resource === permission.resource || p.resource === '*') &&
        (p.action === permission.action || p.action === '*'),
    );

    if (!allowed) throw new ForbiddenException('Insufficient permissions');
    return true;
  }
}
