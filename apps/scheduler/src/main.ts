import { NestFactory } from '@nestjs/core';
import { SchedulerModule } from './scheduler.module';
import { DataSource } from 'typeorm';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(SchedulerModule);
  const dataSource = app.get(DataSource);
  if (dataSource && dataSource.isInitialized) {
    console.log('✅ Database connected successfully (MySQL)');
  }
  console.log('⏰ Task Scheduler service started');
}

bootstrap().catch((err) => {
  console.error('💥 Fatal error during Scheduler bootstrap:', err);
  process.exit(1);
});
