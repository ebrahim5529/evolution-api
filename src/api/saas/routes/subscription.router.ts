import { Router, Request, Response, NextFunction } from 'express';
import { subscriptionService, SubscriptionDuration } from '../subscription/subscription.service';
import { emailAuthService } from '../auth/emailAuth.service';
import { SubscriptionPlan, UserRole } from '@prisma/client';

const subscriptionRouter = Router();

const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'غير مصرح' });
    }

    const token = authHeader.split(' ')[1];
    const user = await emailAuthService.verifyToken(token);
    (req as any).user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'غير مصرح' });
  }
};

const adminMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;
  if (!user || (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN)) {
    return res.status(403).json({ message: 'غير مصرح - مطلوب صلاحيات المسؤول' });
  }
  next();
};

subscriptionRouter.get('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const subscription = await subscriptionService.getSubscription(user.id);
    res.json(subscription);
  } catch (error: any) {
    console.error('Get subscription error:', error);
    res.status(400).json({ message: error.message || 'فشل في جلب الاشتراك' });
  }
});

subscriptionRouter.get('/all', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const subscriptions = await subscriptionService.getAllSubscriptions();
    res.json(subscriptions);
  } catch (error: any) {
    console.error('Get all subscriptions error:', error);
    res.status(400).json({ message: error.message || 'فشل في جلب الاشتراكات' });
  }
});

subscriptionRouter.get('/stats', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const stats = await subscriptionService.getSubscriptionStats();
    res.json(stats);
  } catch (error: any) {
    console.error('Get subscription stats error:', error);
    res.status(400).json({ message: error.message || 'فشل في جلب الإحصائيات' });
  }
});

subscriptionRouter.get('/expiring', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const subscriptions = await subscriptionService.getExpiringSubscriptions(days);
    res.json(subscriptions);
  } catch (error: any) {
    console.error('Get expiring subscriptions error:', error);
    res.status(400).json({ message: error.message || 'فشل في جلب الاشتراكات المنتهية' });
  }
});

subscriptionRouter.post('/renew/:userId', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { duration, plan } = req.body as { duration: SubscriptionDuration; plan?: SubscriptionPlan };

    const validDurations: SubscriptionDuration[] = ['1_month', '2_months', '1_year', '3_years'];
    if (!duration || !validDurations.includes(duration)) {
      return res.status(400).json({ 
        message: 'مدة الاشتراك غير صالحة. القيم المتاحة: 1_month, 2_months, 1_year, 3_years' 
      });
    }

    const validPlans: SubscriptionPlan[] = ['FREE', 'BASIC', 'PRO', 'ENTERPRISE'];
    if (plan && !validPlans.includes(plan)) {
      return res.status(400).json({ 
        message: 'خطة الاشتراك غير صالحة. القيم المتاحة: FREE, BASIC, PRO, ENTERPRISE' 
      });
    }

    const subscription = await subscriptionService.renewSubscription(userId, duration, plan);
    res.json({
      message: 'تم تجديد الاشتراك بنجاح',
      subscription,
    });
  } catch (error: any) {
    console.error('Renew subscription error:', error);
    res.status(400).json({ message: error.message || 'فشل في تجديد الاشتراك' });
  }
});

subscriptionRouter.post('/cancel/:userId', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const subscription = await subscriptionService.cancelSubscription(userId);
    res.json({
      message: 'تم إلغاء الاشتراك',
      subscription,
    });
  } catch (error: any) {
    console.error('Cancel subscription error:', error);
    res.status(400).json({ message: error.message || 'فشل في إلغاء الاشتراك' });
  }
});

subscriptionRouter.post('/update-expired', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const count = await subscriptionService.updateExpiredSubscriptions();
    res.json({
      message: `تم تحديث ${count} اشتراك منتهي`,
      updatedCount: count,
    });
  } catch (error: any) {
    console.error('Update expired subscriptions error:', error);
    res.status(400).json({ message: error.message || 'فشل في تحديث الاشتراكات المنتهية' });
  }
});

export { subscriptionRouter };
