import { PrismaClient, SaasUser, UserRole, SubscriptionPlan, SubscriptionStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

export interface UpsertUser {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  profileImageUrl?: string | null;
}

export interface ISaasStorage {
  getUser(id: string): Promise<SaasUser | null>;
  upsertUser(user: UpsertUser): Promise<SaasUser>;
  getAllUsers(): Promise<SaasUser[]>;
  updateUserRole(userId: string, role: UserRole): Promise<SaasUser>;
  deleteUser(userId: string): Promise<void>;
  getUserByEmail(email: string): Promise<SaasUser | null>;
  getUserByApiKey(apiKey: string): Promise<SaasUser | null>;
  generateApiKey(userId: string): Promise<string>;
}

class SaasStorage implements ISaasStorage {
  async getUser(id: string): Promise<SaasUser | null> {
    return await prisma.saasUser.findUnique({
      where: { id },
      include: { Subscription: true, instances: true }
    });
  }

  async upsertUser(userData: UpsertUser): Promise<SaasUser> {
    const existingUser = await prisma.saasUser.findUnique({
      where: { id: userData.id }
    });

    if (existingUser) {
      return await prisma.saasUser.update({
        where: { id: userData.id },
        data: {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          updatedAt: new Date(),
        },
      });
    }

    const newUser = await prisma.saasUser.create({
      data: {
        id: userData.id,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        profileImageUrl: userData.profileImageUrl,
        role: UserRole.USER,
        apiKey: `evo_${uuidv4().replace(/-/g, '')}`,
      },
    });

    await prisma.subscription.create({
      data: {
        userId: newUser.id,
        plan: SubscriptionPlan.FREE,
        status: SubscriptionStatus.ACTIVE,
        maxInstances: 1,
      },
    });

    return newUser;
  }

  async getAllUsers(): Promise<SaasUser[]> {
    return await prisma.saasUser.findMany({
      include: { Subscription: true, instances: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  async updateUserRole(userId: string, role: UserRole): Promise<SaasUser> {
    return await prisma.saasUser.update({
      where: { id: userId },
      data: { role }
    });
  }

  async deleteUser(userId: string): Promise<void> {
    await prisma.saasUser.delete({
      where: { id: userId }
    });
  }

  async getUserByEmail(email: string): Promise<SaasUser | null> {
    return await prisma.saasUser.findUnique({
      where: { email },
      include: { Subscription: true, instances: true }
    });
  }

  async getUserByApiKey(apiKey: string): Promise<SaasUser | null> {
    return await prisma.saasUser.findUnique({
      where: { apiKey },
      include: { Subscription: true, instances: true }
    });
  }

  async generateApiKey(userId: string): Promise<string> {
    const newApiKey = `evo_${uuidv4().replace(/-/g, '')}`;
    await prisma.saasUser.update({
      where: { id: userId },
      data: { apiKey: newApiKey }
    });
    return newApiKey;
  }

  async getUserInstances(userId: string) {
    return await prisma.instance.findMany({
      where: { userId },
      include: {
        Setting: true,
        Webhook: true,
      }
    });
  }

  async getUserInstanceCount(userId: string): Promise<number> {
    return await prisma.instance.count({
      where: { userId }
    });
  }

  async assignInstanceToUser(instanceId: string, userId: string) {
    return await prisma.instance.update({
      where: { id: instanceId },
      data: { userId }
    });
  }

  async getSubscription(userId: string) {
    return await prisma.subscription.findUnique({
      where: { userId }
    });
  }

  async updateSubscription(userId: string, data: {
    plan?: SubscriptionPlan;
    status?: SubscriptionStatus;
    maxInstances?: number;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    currentPeriodStart?: Date;
    currentPeriodEnd?: Date;
  }) {
    return await prisma.subscription.update({
      where: { userId },
      data
    });
  }

  async getStats() {
    const totalUsers = await prisma.saasUser.count();
    const totalInstances = await prisma.instance.count();
    const activeInstances = await prisma.instance.count({
      where: { connectionStatus: 'open' }
    });
    const subscriptionStats = await prisma.subscription.groupBy({
      by: ['plan'],
      _count: { plan: true }
    });

    return {
      totalUsers,
      totalInstances,
      activeInstances,
      subscriptionStats
    };
  }

  async getAllInstances() {
    const instances = await prisma.instance.findMany({
      select: {
        id: true,
        name: true,
        connectionStatus: true,
        ownerJid: true,
        profileName: true,
        profilePicUrl: true,
        integration: true,
        number: true,
        clientName: true,
        createdAt: true,
        updatedAt: true,
        userId: true,
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    return instances;
  }
}

export const saasStorage = new SaasStorage();
