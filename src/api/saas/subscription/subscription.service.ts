import { PrismaClient, SubscriptionStatus, SubscriptionPlan } from '@prisma/client';

const prisma = new PrismaClient();

export type SubscriptionDuration = '1_month' | '2_months' | '1_year' | '3_years';

const DURATION_DAYS: Record<SubscriptionDuration, number> = {
  '1_month': 30,
  '2_months': 60,
  '1_year': 365,
  '3_years': 1095,
};

const PLAN_INSTANCES: Record<SubscriptionPlan, number> = {
  FREE: 1,
  BASIC: 5,
  PRO: 20,
  ENTERPRISE: 100,
};

export class SubscriptionService {
  async renewSubscription(
    userId: string, 
    duration: SubscriptionDuration, 
    plan: SubscriptionPlan = SubscriptionPlan.BASIC
  ) {
    const user = await prisma.saasUser.findUnique({
      where: { id: userId },
      include: { Subscription: true }
    });

    if (!user) {
      throw new Error('المستخدم غير موجود');
    }

    const now = new Date();
    const durationDays = DURATION_DAYS[duration];
    const endDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    if (user.Subscription) {
      return await prisma.subscription.update({
        where: { id: user.Subscription.id },
        data: {
          status: SubscriptionStatus.ACTIVE,
          plan,
          maxInstances: PLAN_INSTANCES[plan],
          currentPeriodStart: now,
          currentPeriodEnd: endDate,
        }
      });
    } else {
      return await prisma.subscription.create({
        data: {
          userId: user.id,
          status: SubscriptionStatus.ACTIVE,
          plan,
          maxInstances: PLAN_INSTANCES[plan],
          currentPeriodStart: now,
          currentPeriodEnd: endDate,
        }
      });
    }
  }

  async cancelSubscription(userId: string) {
    const subscription = await prisma.subscription.findUnique({
      where: { userId }
    });

    if (!subscription) {
      throw new Error('لا يوجد اشتراك لهذا المستخدم');
    }

    return await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: SubscriptionStatus.CANCELLED,
      }
    });
  }

  async getSubscription(userId: string) {
    return await prisma.subscription.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            firstName: true,
            lastName: true,
          }
        }
      }
    });
  }

  async getAllSubscriptions() {
    return await prisma.subscription.findMany({
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getExpiringSubscriptions(days: number = 7) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return await prisma.subscription.findMany({
      where: {
        status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL] },
        currentPeriodEnd: {
          lte: futureDate,
          gte: new Date(),
        }
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            firstName: true,
            lastName: true,
          }
        }
      },
      orderBy: { currentPeriodEnd: 'asc' }
    });
  }

  async updateExpiredSubscriptions() {
    const now = new Date();
    
    const result = await prisma.subscription.updateMany({
      where: {
        status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL] },
        currentPeriodEnd: { lt: now }
      },
      data: {
        status: SubscriptionStatus.EXPIRED
      }
    });

    return result.count;
  }

  async getSubscriptionStats() {
    const [total, trial, active, expired, cancelled] = await Promise.all([
      prisma.subscription.count(),
      prisma.subscription.count({ where: { status: SubscriptionStatus.TRIAL } }),
      prisma.subscription.count({ where: { status: SubscriptionStatus.ACTIVE } }),
      prisma.subscription.count({ where: { status: SubscriptionStatus.EXPIRED } }),
      prisma.subscription.count({ where: { status: SubscriptionStatus.CANCELLED } }),
    ]);

    const planStats = await prisma.subscription.groupBy({
      by: ['plan'],
      _count: { plan: true },
    });

    return {
      total,
      trial,
      active,
      expired,
      cancelled,
      byPlan: planStats.reduce((acc, curr) => {
        acc[curr.plan] = curr._count.plan;
        return acc;
      }, {} as Record<string, number>),
    };
  }
}

export const subscriptionService = new SubscriptionService();
