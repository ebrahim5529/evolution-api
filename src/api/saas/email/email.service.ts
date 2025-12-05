const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev';
const APP_URL = process.env.SERVER_URL || 'http://localhost:5000';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export class EmailService {
  private async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!RESEND_API_KEY) {
      console.log('=== Email Preview (No API Key) ===');
      console.log(`To: ${options.to}`);
      console.log(`Subject: ${options.subject}`);
      console.log(`HTML: ${options.html.substring(0, 200)}...`);
      console.log('================================');
      return true;
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: options.to,
          subject: options.subject,
          html: options.html,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Email send failed:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Email send error:', error);
      return false;
    }
  }

  async sendVerificationEmail(email: string, token: string, username: string): Promise<boolean> {
    const verifyUrl = `${APP_URL}/verify-email?token=${token}`;
    
    const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0f172a; color: #e2e8f0; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #1e293b; border-radius: 16px; padding: 40px; }
    .logo { text-align: center; margin-bottom: 30px; }
    .logo h1 { color: #22c55e; margin: 0; font-size: 28px; }
    h2 { color: #f8fafc; margin-bottom: 20px; }
    p { color: #94a3b8; line-height: 1.8; margin-bottom: 20px; }
    .btn { display: inline-block; background: linear-gradient(135deg, #22c55e, #16a34a); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #334155; text-align: center; color: #64748b; font-size: 14px; }
    .code { background: #334155; padding: 10px 20px; border-radius: 8px; font-family: monospace; color: #22c55e; display: inline-block; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <h1>🚀 Evolution API</h1>
    </div>
    <h2>مرحباً ${username}!</h2>
    <p>شكراً لتسجيلك في Evolution API. لإكمال التسجيل وتفعيل حسابك، يرجى تأكيد بريدك الإلكتروني.</p>
    <p style="text-align: center;">
      <a href="${verifyUrl}" class="btn">تأكيد البريد الإلكتروني</a>
    </p>
    <p>أو انسخ الرابط التالي وافتحه في متصفحك:</p>
    <p class="code">${verifyUrl}</p>
    <p><strong>ملاحظة:</strong> ستحصل على فترة تجربة مجانية لمدة 4 أيام بعد تأكيد بريدك الإلكتروني.</p>
    <p>هذا الرابط صالح لمدة 24 ساعة فقط.</p>
    <div class="footer">
      <p>Evolution API - منصة WhatsApp للأعمال</p>
      <p>إذا لم تقم بإنشاء هذا الحساب، يمكنك تجاهل هذا البريد.</p>
    </div>
  </div>
</body>
</html>
    `;

    return this.sendEmail({
      to: email,
      subject: 'تأكيد بريدك الإلكتروني - Evolution API',
      html,
    });
  }

  async sendPasswordResetEmail(email: string, token: string, username: string): Promise<boolean> {
    const resetUrl = `${APP_URL}/reset-password?token=${token}`;
    
    const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0f172a; color: #e2e8f0; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #1e293b; border-radius: 16px; padding: 40px; }
    .logo { text-align: center; margin-bottom: 30px; }
    .logo h1 { color: #22c55e; margin: 0; font-size: 28px; }
    h2 { color: #f8fafc; margin-bottom: 20px; }
    p { color: #94a3b8; line-height: 1.8; margin-bottom: 20px; }
    .btn { display: inline-block; background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #334155; text-align: center; color: #64748b; font-size: 14px; }
    .warning { background: #7c2d12; padding: 15px; border-radius: 8px; color: #fbbf24; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <h1>🔐 Evolution API</h1>
    </div>
    <h2>إعادة تعيين كلمة المرور</h2>
    <p>مرحباً ${username}،</p>
    <p>تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك. اضغط على الزر أدناه لإنشاء كلمة مرور جديدة.</p>
    <p style="text-align: center;">
      <a href="${resetUrl}" class="btn">إعادة تعيين كلمة المرور</a>
    </p>
    <div class="warning">
      <p style="margin: 0; color: #fbbf24;"><strong>⚠️ تنبيه:</strong> هذا الرابط صالح لمدة ساعة واحدة فقط.</p>
    </div>
    <div class="footer">
      <p>Evolution API - منصة WhatsApp للأعمال</p>
      <p>إذا لم تطلب إعادة تعيين كلمة المرور، يمكنك تجاهل هذا البريد.</p>
    </div>
  </div>
</body>
</html>
    `;

    return this.sendEmail({
      to: email,
      subject: 'إعادة تعيين كلمة المرور - Evolution API',
      html,
    });
  }

  async sendSubscriptionExpiringSoonEmail(email: string, username: string, daysLeft: number): Promise<boolean> {
    const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0f172a; color: #e2e8f0; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #1e293b; border-radius: 16px; padding: 40px; }
    .logo { text-align: center; margin-bottom: 30px; }
    .logo h1 { color: #22c55e; margin: 0; font-size: 28px; }
    h2 { color: #f8fafc; margin-bottom: 20px; }
    p { color: #94a3b8; line-height: 1.8; margin-bottom: 20px; }
    .alert { background: #7c2d12; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
    .alert-text { color: #fbbf24; font-size: 24px; font-weight: bold; margin: 0; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #334155; text-align: center; color: #64748b; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <h1>⏰ Evolution API</h1>
    </div>
    <h2>تنبيه: اشتراكك على وشك الانتهاء</h2>
    <p>مرحباً ${username}،</p>
    <div class="alert">
      <p class="alert-text">متبقي ${daysLeft} يوم فقط</p>
    </div>
    <p>نود إعلامك أن اشتراكك في Evolution API سينتهي قريباً. للاستمرار في استخدام جميع الميزات، يرجى التواصل مع المسؤول لتجديد اشتراكك.</p>
    <div class="footer">
      <p>Evolution API - منصة WhatsApp للأعمال</p>
    </div>
  </div>
</body>
</html>
    `;

    return this.sendEmail({
      to: email,
      subject: `تنبيه: اشتراكك ينتهي خلال ${daysLeft} يوم - Evolution API`,
      html,
    });
  }
}

export const emailService = new EmailService();
