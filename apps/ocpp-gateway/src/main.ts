import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { GatewayModule } from './gateway.module';
import { OcppGateway } from './gateway';
import { WebSocketServer, WebSocket } from 'ws';
import { DataSource } from 'typeorm';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    GatewayModule,
    new FastifyAdapter(),
  );
  const port = process.env.OCPP_PORT || 8010;

  const server = app.getHttpServer();
  const wss = new WebSocketServer({ noServer: true, clientTracking: true });
  const ocppGateway = app.get(OcppGateway);

  server.on('upgrade', (request: any, socket: any, head: any) => {
    const url = request.url || '';
    console.log(`📡 Incoming WebSocket upgrade attempt on URL: ${url}`);
    const match = url.match(/^\/[^/]+\/ocpp\/([^/?]+)/);

    if (match) {
      const chargerId = match[1];
      const secProtocol = (request.headers['sec-websocket-protocol'] || '').toLowerCase();
      let protocolVersion = '1.6';
      if (secProtocol.includes('ocpp2.0') || secProtocol.includes('ocpp2.1')) {
        protocolVersion = '2.0.1';
      }

      console.log(`✅ Accepted WebSocket upgrade for Charger [${chargerId}] (Protocol: ${protocolVersion})`);
      wss.handleUpgrade(request, socket, head, (ws: WebSocket) => {
        ocppGateway.handleConnection(ws, chargerId, protocolVersion);
      });
    } else {
      console.warn(`❌ Rejected WebSocket upgrade on invalid URL pattern: ${url}`);
      socket.destroy();
    }
  });

  await app.listen(port, '0.0.0.0');
  const dataSource = app.get(DataSource);
  if (dataSource && dataSource.isInitialized) {
    console.log('✅ Database connected successfully (MySQL)');
  }
  console.log(`🔌 Multi-Version OCPP Gateway running on port ${port} (full v1.6; v2.0.1/2.1 answered with CallError NotSupported)`);
}

bootstrap().catch((err) => {
  console.error('💥 Fatal error during OCPP Gateway bootstrap:', err);
  process.exit(1);
});
