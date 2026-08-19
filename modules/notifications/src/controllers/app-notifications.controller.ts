import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { UserAuthGuard } from '@modules/auth';
import { NotificationService } from '../services/notification.service';

function currentClientId(req: any): number {
  return Number(req.client?.clientId || req.user?.clientId || req.headers['x-client-id'] || 1);
}

/** Mirrors `routes/app/notificationRoute.js`. */
@Controller('v1/notification')
@UseGuards(UserAuthGuard)
export class AppNotificationsController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  async getAllNotifications(@Req() req: any, @Query('page') page?: string, @Query('limit') limit?: string, @Query('type') type?: string) {
    return this.notificationService.getAllNotificationsForApp(currentClientId(req), type, Number(page) || 1, Number(limit) || 200);
  }
}
