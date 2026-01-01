# تنظیمات احراز هویت Supabase برای بلک لیست

این راهنما مراحل پیکربندی Supabase برای استفاده از Magic Link (ورود بدون رمز عبور) را شرح می‌دهد.

## مرحله 1: دسترسی به داشبورد Supabase

1. به [supabase.com/dashboard](https://supabase.com/dashboard) بروید
2. پروژه خود را انتخاب کنید
3. از منوی کناری، **Authentication** > **URL Configuration** را انتخاب کنید

## مرحله 2: پیکربندی URL های تایید

در بخش **URL Configuration**، موارد زیر را تنظیم کنید:

### Site URL
این آدرس به عنوان آدرس پایه (Base URL) استفاده می‌شود. اگر لینک شما به localhost:3000 می‌رود، یعنی این گزینه هنوز روی localhost تنظیم شده است.
```
https://your-production-domain.com
```
یا برای توسعه در v0:
```
https://preview-gaming-match-tracker-[your-id].vusercontent.net
```

### Redirect URLs
**بسیار مهم**: تمام دامنه‌هایی که می‌خواهید در آن‌ها لاگین کنید را در اینجا اضافه کنید. اگر این موارد را اضافه نکنید، Supabase به طور خودکار به Site URL بالا برمی‌گردد.

URL های مجاز برای بازگشت پس از احراز هویت را اضافه کنید:

```
https://your-production-domain.com/auth/callback
https://preview-gaming-match-tracker-[your-id].vusercontent.net/auth/callback
```

**نکته مهم**: می‌توانید چندین URL اضافه کنید (هر کدام در یک خط جدید) تا هم دامنه تولید و هم محیط v0 کار کنند.

## مرحله 3: تنظیم قالب ایمیل Magic Link

1. در داشبورد Supabase، به **Authentication** > **Email Templates** بروید
2. روی **Magic Link** کلیک کنید. در اینجا می‌توانید عنوان (Subject) و محتوا را به دلخواه تغییر دهید:

### عنوان ایمیل (Subject):
```
ورود به سیستم بلک لیست
```

### محتوا (Body):
```html
<h2>سلام!</h2>
<p>برای ورود به سیستم مدیریت مسابقات بلک لیست، روی دکمه زیر کلیک کنید:</p>
<p><a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 12px 24px; background-color: #f59e0b; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">ورود به بلک لیست</a></p>
<p>یا این لینک را در مرورگر خود کپی کنید:</p>
<p>{{ .ConfirmationURL }}</p>
<p><small>این لینک فقط برای یک بار استفاده معتبر است و پس از 1 ساعت منقضی می‌شود.</small></p>
<hr />
<p><small>اگر این درخواست را نکرده‌اید، این ایمیل را نادیده بگیرید.</small></p>
```

### تنظیمات اضافی:
- **Email rate limit**: 3 emails per hour (برای جلوگیری از سوء استفاده)
- **Token expiry**: 3600 seconds (1 hour)

## مرحله 4: غیرفعال کردن روش‌های احراز هویت غیرضروری

1. به **Authentication** > **Providers** بروید
2. مطمئن شوید که **Email** فعال است
3. سایر روش‌ها (Google, GitHub, etc.) را غیرفعال کنید اگر نیازی ندارید

## مرحله 5: تنظیم مدت زمان نشست (Session)

1. به **Authentication** > **Settings** بروید
2. **JWT Expiry** را روی مقدار بالایی تنظیم کنید (مثلاً 604800 ثانیه = 1 هفته)
3. گزینه **Refresh Token Rotation** را فعال کنید برای امنیت بیشتر

## مرحله 6: تست کردن

1. به صفحه ورود بروید
2. ایمیل خود را وارد کنید (باید در لیست `TRUSTED_EMAILS` باشد)
3. ایمیل را دریافت کنید و روی لینک کلیک کنید
4. باید با موفقیت وارد شوید و به صفحه اصلی هدایت شوید

## یادداشت‌های مهم

- **لیست کاربران مجاز**: ایمیل‌های مجاز در فایل `app/auth/login/page.tsx` در آرایه `TRUSTED_EMAILS` قرار دارند
- **چند دامنه**: با اضافه کردن چندین URL در Redirect URLs، هم v0 و هم دامنه تولید کار می‌کنند
- **امنیت**: فقط ایمیل‌های موجود در whitelist می‌توانند لینک magic دریافت کنند
- **مدت اعتبار**: لینک‌های magic پس از 1 ساعت منقضی می‌شوند (قابل تنظیم در Supabase)

## عیب‌یابی رایج

### لینک منقضی شده
- مطمئن شوید URL های callback در Supabase Redirect URLs اضافه شده‌اند
- Token expiry را در تنظیمات Authentication بررسی کنید

### ایمیل دریافت نمی‌شود
- پوشه spam/junk را بررسی کنید
- مطمئن شوید ایمیل در لیست TRUSTED_EMAILS است
- Rate limiting را در Supabase بررسی کنید

### خطای redirect
- مطمئن شوید Site URL و Redirect URLs در Supabase درست تنظیم شده‌اند
- دامنه دقیق (با https://) را استفاده کنید

## پشتیبانی

برای مشکلات یا سوالات:
- مستندات Supabase: [supabase.com/docs/guides/auth](https://supabase.com/docs/guides/auth)
- تماس با توسعه‌دهندگان بلک لیست
