import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createGatewayMiddleware } from '@barry.jiang/dingtalk-aiapp-infra';
import { need_login, ensurePageAuth } from './_core/auth.js';
import { ENV } from './_core/env.js';
import contactsRoutes from './official-apis/contactsRoutes.js';
import {createTokenInjectionMiddleware} from "./_core/tokenInjection.js";
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

// Storage upload route must be registered BEFORE express.json() and createGatewayMiddleware(),
// because body-parsing middleware consumes the request stream, which breaks multer's
// multipart/form-data parsing (causes "Unexpected end of form" error).
app.use('/api/storage', need_login, storageRoutes);

app.use(express.json({ type: ['application/json', 'text/plain'] }));
app.use(express.urlencoded({ extended: true }));

// DingTalk gateway middleware — only in production (not dev mode)
if (!ENV.devMode) {
  app.use(createGatewayMiddleware());
}

// Twilio webhooks - MUST be registered BEFORE ensurePageAuth and the catch-all route
// Twilio cannot authenticate with our login system, so we don't use need_login
// Also need to be before express.static to avoid serving index.html
app.use('/webhooks/twilio', twilioWebhookRoutes);

app.use(ensurePageAuth);

// Token injection must run BEFORE express.static,
// otherwise static middleware serves index.html directly and skips injection.
app.use(createTokenInjectionMiddleware());

app.use(express.static(path.join(__dirname, '..', 'client')));

app.use('/api', need_login);

// 健康检查接口（免登）
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/contacts', contactsRoutes);
app.use('/api/depts', deptRoutes);

// Phony AI Routes
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/calls', callRoutes);
app.use('/api/voice-agents', voiceAgentRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/monitoring', monitoringRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/simulation', simulationRoutes);

// default route (don't modify)
app.get('*', (req, res) => {
  res.sendFile('index.html', { root: path.join(__dirname, '..', 'client') });
});


app.listen(9000, () => {
  console.log('Server running on http://localhost:9000');
  if (ENV.devMode) {
    console.log('🔧 DEV MODE enabled — DingTalk auth bypassed');
  }
});
