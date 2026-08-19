import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Logger } from 'nestjs-pino';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { DynamicCorsService } from '@app/security';
import fastifyMultipart from '@fastify/multipart';
import { RealtimeService } from '@app/realtime';
import { AppModule } from './app.module';
import { MultipartInterceptor } from './multipart.interceptor';

async function bootstrap(): Promise<void> {
  console.log('⏳ Bootstrapping Nexin REST API...');
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      rawBody: true,
      logger: false,
      // Legacy Express routes like `/consumption/` (trailing slash) must keep resolving — Fastify is
      // strict by default, so ignore the trailing slash like Express did.
      ignoreTrailingSlash: true,
    } as any),
    { bufferLogs: true },
  );

  await app.register(fastifyMultipart as any, {
    attachFieldsToBody: true,
  });

  app.useGlobalInterceptors(new MultipartInterceptor());

  app.useLogger(app.get(Logger));

  const dynamicCors = app.get(DynamicCorsService);
  app.enableCors({
    origin: dynamicCors.originResolver,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    // allowedHeaders: [
    //   'Origin',
    //   'X-Requested-With',
    //   'Content-Type',
    //   'Accept',
    //   'Authorization',
    //   'x-client-id',
    //   'x-razorpay-signature',
    //   'x-api-key',
    // ],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: false,
      transform: false,
      forbidNonWhitelisted: false,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Nexin EV Enterprise CSMS / CPO API')
    .setDescription('Enterprise Multi-Tenant EV Charging Station Management System API Specification')
    .setVersion('1.0')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', name: 'x-client-id', in: 'header' }, 'x-client-id')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  const port = Number(process.env.PORT) || 8080;

  // Mirrors legacy `server.js`'s `initSocket(server)` — socket.io is attached to the same HTTP server
  // the REST API runs on, and clients join rooms by sessionId / chargerId to receive realtime events.
  app.get(RealtimeService).attach(app.getHttpServer());

  await app.listen(port, '0.0.0.0');

  const dataSource = app.get(DataSource);
  const dbConnected = dataSource && dataSource.isInitialized;

  console.log('\n========================================================================');
  console.log('🚀 NEXIN ENTERPRISE BACKEND SERVER STARTED SUCCESSFULLY');
  console.log('========================================================================');
  console.log(`🌐 REST API Server URL : http://localhost:${port}`);
  console.log(`📚 Swagger Docs URL   : http://localhost:${port}/docs`);
  console.log(`🗄️  Database Status     : ${dbConnected ? 'CONNECTED (MySQL)' : 'DISCONNECTED'}`);
  console.log(`⚡ WebSocket Server    : READY (Socket.io on port ${port}, rooms bridged from OCPP gateway)`);
  console.log('========================================================================\n');
}

bootstrap().catch((err) => {
  console.error('💥 Fatal error during NestJS bootstrap:', err);
  process.exit(1);
});
