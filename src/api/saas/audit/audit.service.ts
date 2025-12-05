import { PrismaClient, AuditAction, AuditSeverity } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateAuditLogParams {
  action: AuditAction;
  severity?: AuditSeverity;
  userId?: string;
  userEmail?: string;
  instanceId?: string;
  instanceName?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface AuditLogFilter {
  userId?: string;
  instanceId?: string;
  action?: AuditAction;
  severity?: AuditSeverity;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

class AuditService {
  async log(params: CreateAuditLogParams) {
    try {
      return await prisma.auditLog.create({
        data: {
          action: params.action,
          severity: params.severity || AuditSeverity.INFO,
          userId: params.userId,
          userEmail: params.userEmail,
          instanceId: params.instanceId,
          instanceName: params.instanceName,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
          details: params.details,
          metadata: params.metadata,
        },
      });
    } catch (error) {
      console.error('Failed to create audit log:', error);
      return null;
    }
  }

  async getLogs(filter: AuditLogFilter = {}) {
    const where: any = {};

    if (filter.userId) {
      where.userId = filter.userId;
    }
    if (filter.instanceId) {
      where.instanceId = filter.instanceId;
    }
    if (filter.action) {
      where.action = filter.action;
    }
    if (filter.severity) {
      where.severity = filter.severity;
    }
    if (filter.startDate || filter.endDate) {
      where.createdAt = {};
      if (filter.startDate) {
        where.createdAt.gte = filter.startDate;
      }
      if (filter.endDate) {
        where.createdAt.lte = filter.endDate;
      }
    }

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filter.limit || 100,
      skip: filter.offset || 0,
    });

    const total = await prisma.auditLog.count({ where });

    return { logs, total };
  }

  async getRecentLogs(limit: number = 50) {
    return await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getLogsByUser(userId: string, limit: number = 50) {
    return await prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getLogsByInstance(instanceId: string, limit: number = 50) {
    return await prisma.auditLog.findMany({
      where: { instanceId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalLogs, todayLogs, errorLogs, warningLogs, actionStats] = await Promise.all([
      prisma.auditLog.count(),
      prisma.auditLog.count({
        where: { createdAt: { gte: today } },
      }),
      prisma.auditLog.count({
        where: { severity: { in: [AuditSeverity.ERROR, AuditSeverity.CRITICAL] } },
      }),
      prisma.auditLog.count({
        where: { severity: AuditSeverity.WARNING },
      }),
      prisma.auditLog.groupBy({
        by: ['action'],
        _count: { action: true },
        orderBy: { _count: { action: 'desc' } },
        take: 10,
      }),
    ]);

    return {
      totalLogs,
      todayLogs,
      errorLogs,
      warningLogs,
      actionStats,
    };
  }

  async deleteOldLogs(daysOld: number = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    return await prisma.auditLog.deleteMany({
      where: { createdAt: { lt: cutoffDate } },
    });
  }

  logLogin(userId: string, userEmail: string, ipAddress?: string, userAgent?: string) {
    return this.log({
      action: AuditAction.LOGIN,
      userId,
      userEmail,
      ipAddress,
      userAgent,
      details: { message: 'User logged in successfully' },
    });
  }

  logLogout(userId: string, userEmail?: string) {
    return this.log({
      action: AuditAction.LOGOUT,
      userId,
      userEmail,
      details: { message: 'User logged out' },
    });
  }

  logInstanceCreate(userId: string, instanceId: string, instanceName: string) {
    return this.log({
      action: AuditAction.CREATE_INSTANCE,
      userId,
      instanceId,
      instanceName,
      details: { message: `Instance "${instanceName}" created` },
    });
  }

  logInstanceDelete(userId: string, instanceId: string, instanceName: string) {
    return this.log({
      action: AuditAction.DELETE_INSTANCE,
      severity: AuditSeverity.WARNING,
      userId,
      instanceId,
      instanceName,
      details: { message: `Instance "${instanceName}" deleted` },
    });
  }

  logInstanceConnect(instanceId: string, instanceName: string, phoneNumber?: string) {
    return this.log({
      action: AuditAction.CONNECT_INSTANCE,
      instanceId,
      instanceName,
      details: { message: `Instance "${instanceName}" connected`, phoneNumber },
    });
  }

  logInstanceDisconnect(instanceId: string, instanceName: string, reason?: string) {
    return this.log({
      action: AuditAction.DISCONNECT_INSTANCE,
      severity: AuditSeverity.WARNING,
      instanceId,
      instanceName,
      details: { message: `Instance "${instanceName}" disconnected`, reason },
    });
  }

  logRoleUpdate(adminUserId: string, targetUserId: string, oldRole: string, newRole: string) {
    return this.log({
      action: AuditAction.UPDATE_ROLE,
      severity: AuditSeverity.WARNING,
      userId: adminUserId,
      details: {
        message: `User role updated`,
        targetUserId,
        oldRole,
        newRole,
      },
    });
  }

  logUserDelete(adminUserId: string, deletedUserId: string, deletedEmail?: string) {
    return this.log({
      action: AuditAction.DELETE_USER,
      severity: AuditSeverity.CRITICAL,
      userId: adminUserId,
      details: {
        message: `User deleted`,
        deletedUserId,
        deletedEmail,
      },
    });
  }

  logApiKeyRegenerate(userId: string, userEmail?: string) {
    return this.log({
      action: AuditAction.REGENERATE_API_KEY,
      severity: AuditSeverity.WARNING,
      userId,
      userEmail,
      details: { message: 'API key regenerated' },
    });
  }

  logError(message: string, error: any, context?: Record<string, any>) {
    return this.log({
      action: AuditAction.SYSTEM_ERROR,
      severity: AuditSeverity.ERROR,
      details: {
        message,
        error: error?.message || String(error),
        stack: error?.stack,
        ...context,
      },
    });
  }
}

export const auditService = new AuditService();
