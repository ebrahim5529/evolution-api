import { PrismaClient, UserRole, SubscriptionStatus, SubscriptionPlan } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.warn('WARNING: JWT_SECRET is not set. Using generated fallback for development only.');
}
const getJwtSecret = () => JWT_SECRET || `evo-${Date.now()}-fallback-dev-only`;
const JWT_EXPIRES_IN = '7d';
const TRIAL_DAYS = 4;

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface LoginData {
  emailOrUsername: string;
  password: string;
}

function generateApiKey(): string {
  return `evo_${crypto.randomBytes(24).toString('hex')}`;
}

function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function getTrialEndDate(): Date {
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + TRIAL_DAYS);
  return endDate;
}

export class EmailAuthService {
  async register(data: RegisterData) {
    const existingEmail = await prisma.saasUser.findUnique({
      where: { email: data.email }
    });
    if (existingEmail) {
      throw new Error('البريد الإلكتروني مستخدم بالفعل');
    }

    const existingUsername = await prisma.saasUser.findUnique({
      where: { username: data.username }
    });
    if (existingUsername) {
      throw new Error('اسم المستخدم مستخدم بالفعل');
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);
    const verificationToken = generateVerificationToken();
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const user = await prisma.saasUser.create({
      data: {
        username: data.username,
        email: data.email,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        apiKey: generateApiKey(),
        verificationToken,
        verificationTokenExpiry,
        emailVerified: false,
        role: UserRole.USER,
      }
    });

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      verificationToken,
    };
  }

  async verifyEmail(token: string) {
    const user = await prisma.saasUser.findFirst({
      where: {
        verificationToken: token,
        verificationTokenExpiry: { gte: new Date() }
      }
    });

    if (!user) {
      throw new Error('رمز التحقق غير صالح أو منتهي الصلاحية');
    }

    const trialEndDate = getTrialEndDate();

    await prisma.$transaction([
      prisma.saasUser.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          verificationToken: null,
          verificationTokenExpiry: null,
        }
      }),
      prisma.subscription.upsert({
        where: { userId: user.id },
        update: {
          status: SubscriptionStatus.TRIAL,
          plan: SubscriptionPlan.FREE,
          currentPeriodStart: new Date(),
          currentPeriodEnd: trialEndDate,
        },
        create: {
          userId: user.id,
          status: SubscriptionStatus.TRIAL,
          plan: SubscriptionPlan.FREE,
          maxInstances: 1,
          currentPeriodStart: new Date(),
          currentPeriodEnd: trialEndDate,
        }
      })
    ]);

    return { message: 'تم تأكيد البريد الإلكتروني بنجاح. لديك فترة تجربة 4 أيام.' };
  }

  async login(data: LoginData) {
    const user = await prisma.saasUser.findFirst({
      where: {
        OR: [
          { email: data.emailOrUsername },
          { username: data.emailOrUsername }
        ]
      },
      include: { Subscription: true }
    });

    if (!user || !user.password) {
      throw new Error('بيانات الدخول غير صحيحة');
    }

    const isPasswordValid = await bcrypt.compare(data.password, user.password);
    if (!isPasswordValid) {
      throw new Error('بيانات الدخول غير صحيحة');
    }

    if (!user.emailVerified) {
      throw new Error('يجب تأكيد البريد الإلكتروني أولاً');
    }

    const subscription = user.Subscription;
    if (subscription) {
      const now = new Date();
      if (subscription.currentPeriodEnd && subscription.currentPeriodEnd < now) {
        if (subscription.status !== SubscriptionStatus.EXPIRED) {
          await prisma.subscription.update({
            where: { id: subscription.id },
            data: { status: SubscriptionStatus.EXPIRED }
          });
        }
        throw new Error('انتهت صلاحية اشتراكك. يرجى التواصل مع المسؤول لتجديد الاشتراك.');
      }
    }

    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        username: user.username,
        role: user.role 
      },
      getJwtSecret(),
      { expiresIn: JWT_EXPIRES_IN }
    );

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        apiKey: user.apiKey,
        subscription: subscription ? {
          plan: subscription.plan,
          status: subscription.status,
          expiresAt: subscription.currentPeriodEnd,
        } : null
      }
    };
  }

  async verifyToken(token: string) {
    try {
      const decoded = jwt.verify(token, getJwtSecret()) as any;
      const user = await prisma.saasUser.findUnique({
        where: { id: decoded.userId },
        include: { Subscription: true }
      });

      if (!user) {
        throw new Error('المستخدم غير موجود');
      }

      return {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        apiKey: user.apiKey,
        subscription: user.Subscription ? {
          plan: user.Subscription.plan,
          status: user.Subscription.status,
          expiresAt: user.Subscription.currentPeriodEnd,
        } : null
      };
    } catch (error) {
      throw new Error('الجلسة منتهية الصلاحية');
    }
  }

  async resendVerificationEmail(email: string) {
    const user = await prisma.saasUser.findUnique({
      where: { email }
    });

    if (!user) {
      throw new Error('البريد الإلكتروني غير مسجل');
    }

    if (user.emailVerified) {
      throw new Error('البريد الإلكتروني مؤكد بالفعل');
    }

    const verificationToken = generateVerificationToken();
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.saasUser.update({
      where: { id: user.id },
      data: {
        verificationToken,
        verificationTokenExpiry,
      }
    });

    return { verificationToken };
  }

  async forgotPassword(email: string) {
    const user = await prisma.saasUser.findUnique({
      where: { email }
    });

    if (!user) {
      return { message: 'إذا كان البريد مسجلاً، سيتم إرسال رابط إعادة تعيين كلمة المرور' };
    }

    const resetToken = generateVerificationToken();
    const resetExpiry = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.saasUser.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: resetToken,
        resetPasswordExpiry: resetExpiry,
      }
    });

    return { resetToken, message: 'تم إرسال رابط إعادة تعيين كلمة المرور' };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await prisma.saasUser.findFirst({
      where: {
        resetPasswordToken: token,
        resetPasswordExpiry: { gte: new Date() }
      }
    });

    if (!user) {
      throw new Error('رمز إعادة التعيين غير صالح أو منتهي الصلاحية');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.saasUser.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpiry: null,
      }
    });

    return { message: 'تم تغيير كلمة المرور بنجاح' };
  }
}

export const emailAuthService = new EmailAuthService();
