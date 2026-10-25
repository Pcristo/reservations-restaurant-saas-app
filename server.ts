import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { onRequestGet as healthHandler } from "./functions/api/health";
import { onRequestPost as sendSmsHandler } from "./functions/api/send-sms";
import { onRequestPost as confirmEmailHandler } from "./functions/api/email/confirmation";
import { onRequestPost as reminderEmailHandler } from "./functions/api/email/reminder";
import { onRequestPost as cancelEmailHandler } from "./functions/api/email/cancellation";
import { onRequestPost as updateEmailHandler } from "./functions/api/email/update";
import { onRequestPost as testEmailHandler } from "./functions/api/email/test";
import { onRequestPost as deleteUserByEmailHandler } from "./functions/api/admin/delete-user-by-email";
import { onRequestPost as deleteUserHandler } from "./functions/api/admin/delete-user";
import { onRequestPost as updatePasswordHandler } from "./functions/api/admin/update-password";
import { onRequestPost as updateAdminCredentialsHandler } from "./functions/api/admin/update-admin-credentials";
import { onRequestPost as createTenantHandler } from "./functions/api/admin/create-tenant";
import { onRequestPost as deleteRestaurantHandler } from "./functions/api/admin/delete-restaurant";
import { onRequestPost as contactHandler } from "./functions/api/contact";
import { onRequestPost as verifyRecaptchaHandler } from "./functions/api/verify-recaptcha";
import { onRequest as cronRemindersHandler } from "./functions/api/cron/reminders";
import { 
  onRequestPost as updateResendConfigHandler,
  onRequestGet as getResendConfigHandler 
} from "./functions/api/admin/update-resend-config";
import { onRequestGet as billingOverviewHandler } from "./functions/api/billing/overview";
import { onRequestPost as billingChangePlanHandler } from "./functions/api/billing/change-plan";
import { onRequestPost as billingPayInvoiceHandler } from "./functions/api/billing/pay-invoice";
import { onRequestPost as billingCancelSubscriptionHandler } from "./functions/api/billing/cancel-subscription";
import { onRequestPost as billingReactivateSubscriptionHandler } from "./functions/api/billing/reactivate-subscription";
import { 
  onRequestGet as billingPaymentMethodsGetHandler,
  onRequestPost as billingPaymentMethodsPostHandler,
  onRequestDelete as billingPaymentMethodsDeleteHandler 
} from "./functions/api/billing/payment-methods";
import { onRequestPost as billingMarkInvoicePaidHandler } from "./functions/api/billing/mark-invoice-paid";
import { onRequestPost as billingSendReminderHandler } from "./functions/api/billing/send-reminder";
import { onRequestGet as billingListInvoicesHandler } from "./functions/api/billing/list-invoices";
import { onRequestGet as supportDebugHandler } from "./functions/api/support/debug";
import { onRequestPost as supportCreateHandler } from "./functions/api/support/create";
import { onRequestPost as supportUpdateStatusHandler } from "./functions/api/support/update-status";
import { onRequestGet as billingAdminStatsHandler } from "./functions/api/billing/admin-dashboard-stats";
import { onRequestPost as billingCreateInvoiceHandler } from "./functions/api/billing/create-invoice";

// Preserve existing environment secrets by setting override: false
dotenv.config({ override: false });

// Sanitize from email if misconfigured or mistakenly set to API key
if (!process.env.RESEND_FROM_EMAIL || process.env.RESEND_FROM_EMAIL.startsWith('re_') || !process.env.RESEND_FROM_EMAIL.includes('@')) {
  process.env.RESEND_FROM_EMAIL = 'DineMaster Pro <reservations@wordwide.pro>';
}

// Adapter to execute Cloudflare Pages Function handlers inside Express for local development
function adaptFunction(handler: (context: any) => Promise<Response>) {
  return async (req: express.Request, res: express.Response) => {
    try {
      const url = `${req.protocol}://${req.get('host') || 'localhost:3000'}${req.originalUrl}`;
      const headers = new Headers();
      for (const [k, v] of Object.entries(req.headers)) {
        if (v) {
          if (Array.isArray(v)) {
            v.forEach(val => headers.append(k, val));
          } else {
            headers.set(k, v);
          }
        }
      }

      const init: RequestInit = {
        method: req.method,
        headers,
      };

      if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
        init.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      }

      const webRequest = new Request(url, init);
      const context = {
        request: webRequest,
        env: process.env,
        params: req.params,
        data: {}
      };

      const webResponse = await handler(context);
      
      res.status(webResponse.status);
      webResponse.headers.forEach((value, key) => {
        res.setHeader(key, value);
      });

      const responseBody = await webResponse.text();
      res.send(responseBody);
    } catch (err: any) {
      console.error('[Local Dev Functions Adapter Error]:', err);
      res.status(500).json({ success: false, error: err?.message || 'Internal server error executing function' });
    }
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to parse JSON bodies
  app.use(express.json());

  // Cloudflare Pages Function Routes
  app.get('/api/health', adaptFunction(healthHandler));
  app.post('/api/send-sms', adaptFunction(sendSmsHandler));
  app.post('/api/email/confirmation', adaptFunction(confirmEmailHandler));
  app.post('/api/email/reminder', adaptFunction(reminderEmailHandler));
  app.post('/api/email/cancellation', adaptFunction(cancelEmailHandler));
  app.post('/api/email/update', adaptFunction(updateEmailHandler));
  app.post('/api/email/test', adaptFunction(testEmailHandler));
  app.post('/api/admin/delete-user-by-email', adaptFunction(deleteUserByEmailHandler));
  app.post('/api/admin/delete-user', adaptFunction(deleteUserHandler));
  app.post('/api/admin/update-password', adaptFunction(updatePasswordHandler));
  app.post('/api/admin/update-admin-credentials', adaptFunction(updateAdminCredentialsHandler));
  app.post('/api/admin/create-tenant', adaptFunction(createTenantHandler));
  app.post('/api/admin/delete-restaurant', adaptFunction(deleteRestaurantHandler));
  app.post('/api/contact', adaptFunction(contactHandler));
  app.post('/api/verify-recaptcha', adaptFunction(verifyRecaptchaHandler));
  app.all('/api/cron/reminders', adaptFunction(cronRemindersHandler));
  app.post('/api/admin/update-resend-config', adaptFunction(updateResendConfigHandler));
  app.get('/api/admin/update-resend-config', adaptFunction(getResendConfigHandler));
  app.get('/api/admin/resend-config', adaptFunction(getResendConfigHandler));

  // Billing & Membership API Routes
  app.get('/api/billing/overview', adaptFunction(billingOverviewHandler));
  app.post('/api/billing/change-plan', adaptFunction(billingChangePlanHandler));
  app.post('/api/billing/pay-invoice', adaptFunction(billingPayInvoiceHandler));
  app.post('/api/billing/cancel-subscription', adaptFunction(billingCancelSubscriptionHandler));
  app.post('/api/billing/reactivate-subscription', adaptFunction(billingReactivateSubscriptionHandler));
  app.get('/api/billing/payment-methods', adaptFunction(billingPaymentMethodsGetHandler));
  app.post('/api/billing/payment-methods', adaptFunction(billingPaymentMethodsPostHandler));
  app.delete('/api/billing/payment-methods', adaptFunction(billingPaymentMethodsDeleteHandler));
  app.post('/api/billing/mark-invoice-paid', adaptFunction(billingMarkInvoicePaidHandler));
  app.post('/api/billing/send-reminder', adaptFunction(billingSendReminderHandler));
  app.get('/api/billing/list-invoices', adaptFunction(billingListInvoicesHandler));
  app.post('/api/billing/create-invoice', adaptFunction(billingCreateInvoiceHandler));
  app.get('/api/billing/admin-dashboard-stats', adaptFunction(billingAdminStatsHandler));
  app.post('/api/support/create', adaptFunction(supportCreateHandler));
  app.post('/api/support/update-status', adaptFunction(supportUpdateStatusHandler));
  app.get('/api/support/debug', adaptFunction(supportDebugHandler));


  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    // Self-cleaning Service Worker response in dev mode so any previously registered
    // production Service Worker updates cleanly, clears caches, and unregisters itself
    app.get(['/sw.js', '/registerSW.js', '/workbox-:hash.js'], (_req, res) => {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.send(`
self.addEventListener('install', () => {
  self.skipWaiting();
});
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.map((name) => caches.delete(name))))
      .then(() => self.registration.unregister())
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then((clients) => {
        clients.forEach((client) => {
          if ('navigate' in client) {
            client.navigate(client.url);
          }
        });
      })
  );
});
`);
    });

    // If a stale Service Worker serves a cached dist/index.html that requests hashed /assets/*.js,
    // serve from dist/assets if available or return a self-healing script instead of SPA HTML fallback
    const distAssetsPath = path.join(process.cwd(), 'dist', 'assets');
    app.use('/assets', express.static(distAssetsPath, { fallthrough: true }));
    app.get('/assets/*.js', (_req, res) => {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.send(`
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    Promise.all(regs.map((r) => r.unregister())).then(() => {
      if ('caches' in window) {
        caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))).then(() => {
          window.location.reload();
        });
      } else {
        window.location.reload();
      }
    });
  });
}
`);
    });

    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, {
      setHeaders: (res, filePath) => {
        // Ensure Service Worker and Web Manifest are not aggressively cached
        if (filePath.endsWith('sw.js') || filePath.endsWith('registerSW.js') || filePath.endsWith('manifest.webmanifest')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        }
      }
    }));
    // Important: Use * for Express v4 to handle SPA routing properly
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
