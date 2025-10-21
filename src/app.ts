import express, { Application } from 'express';
import helmet from 'helmet';
import compression from 'compression';
import { corsMiddleware } from './middleware/cors';
import { requestLogger } from './middleware/logger';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './modules/auth/auth.routes';
import customersRoutes from './modules/customers/customers.routes';
import paymentsRoutes from './modules/payments/payments.routes';
import remindersRoutes from './modules/reminders/reminders.routes';
import salesRoutes from './modules/sales/sales.routes';
import settingsRoutes from './modules/settings/settings.routes';
import usersRoutes from './modules/users/users.routes';

// Create Express app
const app: Application = express();

// Security middleware
app.use(helmet());

// CORS middleware
app.use(corsMiddleware);

// Compression middleware
app.use(compression());

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use(requestLogger);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/reminders', remindersRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/users', usersRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found',
    },
  });
});

// Error handler middleware (must be last)
app.use(errorHandler);

export default app;
