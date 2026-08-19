import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FirebaseModule } from '@integrations/firebase';

import { Notification } from './entities/notification.entity';
import { User } from '../../users/src/entities/user.entity';

import { NotificationRepository } from './repositories/notification.repository';
import { NotificationService } from './services/notification.service';
import { AdminNotificationsController } from './controllers/admin-notifications.controller';
import { AppNotificationsController } from './controllers/app-notifications.controller';

@Module({
  imports: [FirebaseModule, TypeOrmModule.forFeature([Notification, User])],
  controllers: [AdminNotificationsController, AppNotificationsController],
  providers: [NotificationRepository, NotificationService],
  exports: [TypeOrmModule, NotificationRepository, NotificationService],
})
export class NotificationsModule {}
