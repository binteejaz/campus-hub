// src/server.ts
import 'dotenv/config';
import http from 'http';
import app from './app';
import { initSocket } from './config/socket';
import { connectRedis } from './config/redis';
import { logger } from './config/logger';

const PORT = process.env.PORT || 5000;

async function bootstrap() {
  // Connect Redis
  await connectRedis();

  // Create HTTP server from Express app
  const server = http.createServer(app);

  // Attach Socket.io
  initSocket(server);

  server.listen(PORT, () => {
    logger.info(`🚀 CampusHub API running on http://localhost:${PORT}`);
    logger.info(`📡 Environment: ${process.env.NODE_ENV}`);
    logger.info(`🔌 WebSockets ready`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received — shutting down gracefully`);
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception:', err);
    process.exit(1);
  });
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection:', reason);
    process.exit(1);
  });
}

bootstrap();
