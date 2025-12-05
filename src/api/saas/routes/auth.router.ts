import { Router, Request, Response } from 'express';
import { emailAuthService } from '../auth/emailAuth.service';
import { emailService } from '../email/email.service';
import { subscriptionService } from '../subscription/subscription.service';
import { auditService } from '../audit/audit.service';

const authRouter = Router();

authRouter.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, email, password, confirmPassword, firstName, lastName } = req.body;

    if (!username || !email || !password || !confirmPassword) {
      return res.status(400).json({ message: 'جميع الحقول مطلوبة' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'كلمتا المرور غير متطابقتين' });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'البريد الإلكتروني غير صالح' });
    }

    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({ message: 'اسم المستخدم يجب أن يكون بين 3 و 20 حرفاً' });
    }

    const result = await emailAuthService.register({
      username,
      email,
      password,
      firstName,
      lastName,
    });

    await emailService.sendVerificationEmail(email, result.verificationToken, username);

    res.status(201).json({
      message: 'تم التسجيل بنجاح. يرجى تأكيد بريدك الإلكتروني.',
      user: result.user,
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(400).json({ message: error.message || 'فشل في التسجيل' });
  }
});

authRouter.get('/verify-email', async (req: Request, res: Response) => {
  try {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ message: 'رمز التحقق مطلوب' });
    }

    const result = await emailAuthService.verifyEmail(token);
    res.json(result);
  } catch (error: any) {
    console.error('Email verification error:', error);
    res.status(400).json({ message: error.message || 'فشل في تأكيد البريد' });
  }
});

authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { emailOrUsername, password } = req.body;

    if (!emailOrUsername || !password) {
      return res.status(400).json({ message: 'البريد/اسم المستخدم وكلمة المرور مطلوبان' });
    }

    const result = await emailAuthService.login({ emailOrUsername, password });

    await auditService.logLogin(
      result.user.id,
      result.user.email || '',
      req.ip,
      req.headers['user-agent']
    );

    res.json(result);
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(401).json({ message: error.message || 'فشل في تسجيل الدخول' });
  }
});

authRouter.post('/resend-verification', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'البريد الإلكتروني مطلوب' });
    }

    const result = await emailAuthService.resendVerificationEmail(email);
    
    await emailService.sendVerificationEmail(email, result.verificationToken, email.split('@')[0]);

    res.json({ message: 'تم إرسال رابط التأكيد' });
  } catch (error: any) {
    console.error('Resend verification error:', error);
    res.status(400).json({ message: error.message || 'فشل في إعادة إرسال رابط التأكيد' });
  }
});

authRouter.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'البريد الإلكتروني مطلوب' });
    }

    const result = await emailAuthService.forgotPassword(email);

    if ((result as any).resetToken) {
      await emailService.sendPasswordResetEmail(email, (result as any).resetToken, email.split('@')[0]);
    }

    res.json({ message: 'إذا كان البريد مسجلاً، سيتم إرسال رابط إعادة تعيين كلمة المرور' });
  } catch (error: any) {
    console.error('Forgot password error:', error);
    res.status(400).json({ message: error.message || 'فشل في إرسال رابط إعادة تعيين كلمة المرور' });
  }
});

authRouter.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, password, confirmPassword } = req.body;

    if (!token || !password || !confirmPassword) {
      return res.status(400).json({ message: 'جميع الحقول مطلوبة' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'كلمتا المرور غير متطابقتين' });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' });
    }

    const result = await emailAuthService.resetPassword(token, password);
    res.json(result);
  } catch (error: any) {
    console.error('Reset password error:', error);
    res.status(400).json({ message: error.message || 'فشل في إعادة تعيين كلمة المرور' });
  }
});

authRouter.get('/me', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'غير مصرح' });
    }

    const token = authHeader.split(' ')[1];
    const user = await emailAuthService.verifyToken(token);
    res.json(user);
  } catch (error: any) {
    console.error('Get user error:', error);
    res.status(401).json({ message: error.message || 'غير مصرح' });
  }
});

authRouter.post('/logout', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const user = await emailAuthService.verifyToken(token);
        await auditService.logLogout(user.id, user.email || undefined);
      } catch (e) {
      }
    }
    res.json({ message: 'تم تسجيل الخروج' });
  } catch (error: any) {
    res.json({ message: 'تم تسجيل الخروج' });
  }
});

export { authRouter };
