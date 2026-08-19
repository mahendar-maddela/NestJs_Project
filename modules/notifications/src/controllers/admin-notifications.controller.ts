import { Controller, Get, Post, Delete, Param, Body, Query, Req, ParseIntPipe, UseGuards } from '@nestjs/common';
import { NotificationService, CreateNotificationDto } from '../services/notification.service';
import { AdminAuthGuard, StaffPermissionsGuard, StaffPermission, ClientFeaturesGuard, ClientFeatureRequired } from '@modules/auth';

@Controller('v1/admin/notifications')
@UseGuards(AdminAuthGuard, ClientFeaturesGuard, StaffPermissionsGuard)
@ClientFeatureRequired('Push Notification')
export class AdminNotificationsController {
  constructor(private readonly notificationService: NotificationService) {}

  private clientId(req: any): number {
    return Number(req.client?.clientId || req.user?.clientId || req.headers['x-client-id'] || 0);
  }

  @Get()
  @StaffPermission('Notification_Management')
  async getAllNotifications(@Req() req: any, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.notificationService.getAllNotifications(this.clientId(req), Number(page) || 1, Number(limit) || 20);
  }

  @Post()
  @StaffPermission('Notification_Management')
  async createNotification(@Req() req: any, @Body() dto: CreateNotificationDto) {
    return this.notificationService.createNotification(this.clientId(req), req.user?.id, dto);
  }

  @Delete(':id')
  @StaffPermission('Notification_Management')
  async deleteNotification(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.notificationService.deleteNotification(id, this.clientId(req));
  }
}
