// Vercel serverless entry — same as index.ts but exports app instead of calling listen()
// This file is compiled separately for Vercel deployment

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { createGatewayMiddleware } from '@barry.jiang/dingtalk-aiapp-infra';
import { need_login, ensurePageAuth } from './_core/auth.js';
import { ENV } from './_core/env.js';
import contactsRoutes from './official-apis/contactsRoutes.js';
import { createTokenInjectionMiddleware } from './_core/tokenInjection.js';
import deptRoutes from './official-apis/deptRoutes.js';
import storageRoutes from './official-apis/storageRoutes.js';
import campaignRoutes from './routes/campaignRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import callRoutes from './routes/callRoutes.js';
import voiceAgentRoutes from './routes/voiceAgentRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import monitoringRoutes from './routes/monitoringRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import twilioWebhookRoutes from './routes/twilioWebhookRoutes.js';
import simulationRoutes from './routes/simulationRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(cookieParser());

app.use('/api/storage', need_login, storageRoutes);

app.use(express.json({ type: ['application/json', 'text/plain'] }));
app.use(express.urlencoded({ extended: true }));

if (!ENV.devMode) {
  app.use(createGatewayMiddleware());
}

// Twilio webhooks — before auth, before static, before need_login
// Mounted at both paths: /webhooks/twilio (local dev) and /api/webhooks/twilio (Vercel)
app.use('/webhooks/twilio', twilioWebhookRoutes);
app.use('/api/webhooks/twilio', twilioWebhookRoutes);

app.use(ensurePageAuth);
app.use(createTokenInjectionMiddleware());

// Serve static frontend
app.use(express.static(path.join(__dirname, '..', 'client')));

app.use('/api', need_login);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/contacts', contactsRoutes);
app.use('/api/depts', deptRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/calls', callRoutes);
app.use('/api/voice-agents', voiceAgentRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/monitoring', monitoringRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/simulation', simulationRoutes);

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile('index.html', { root: path.join(__dirname, '..', 'client') });
});

export default app;