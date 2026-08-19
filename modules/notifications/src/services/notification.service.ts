import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationRepository } from '../repositories/notification.repository';
import { FirebaseService } from '@integrations/firebase';

export interface CreateNotificationDto {
  type?: string;
  message?: string;
  title?: string;
  reason?: string;
}

/** Mirrors `controllers/admin/notificationController.js`. */
@Injectable()
export class NotificationService {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly firebaseService: FirebaseService,
  ) {}

  async sendNotification(staffId: number, title: string, body: string) {
    return this.notificationRepository.create({ staffId, title, message: body });
  }

  async getStaffNotifications(staffId: number) {
    return this.notificationRepository.findByStaffId(staffId);
  }

  async createNotification(clientId: number, staffId: number, dto: CreateNotificationDto) {
    const notification = await this.notificationRepository.create({
      type: dto.type,
      message: dto.message,
      staffId,
      title: dto.title,
      reason: dto.reason,
      clientId,
    });

    const tokens = await this.notificationRepository.findClientUserTokens(clientId);

    if (tokens.length) {
      await this.firebaseService.sendToClientTokens(clientId, tokens, {
        title: dto.title,
        body: { message: dto.message },
        type: dto.type,
      });
    }

    return { success: true, message: 'Notification created successfully', data: notification };
  }

  async getAllNotifications(clientId: number, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [rows, count] = await this.notificationRepository.findAndCountByClient(clientId, skip, limit);
    return {
      success: true,
      message: 'Notifications fetched successfully',
      data: rows,
      pagination: { totalPages: Math.ceil(count / limit), page },
    };
  }

  /** Mirrors `controllers/APP/notificationController.js:getAllNotifications`. */
  async getAllNotificationsForApp(clientId: number, type: string | undefined, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [rows, count] = await this.notificationRepository.findAndCountByClientType(clientId, type, skip, limit);
    return {
      success: true,
      message: 'Notifications fetched successfully',
      data: rows,
      pagination: { totalPages: Math.ceil(count / limit), page },
    };
  }

  async deleteNotification(id: number, clientId: number) {
    const notification = await this.notificationRepository.findByIdAndClient(id, clientId);
    if (!notification) {
      throw new NotFoundException({ success: false, message: 'Notification not found' });
    }
    await this.notificationRepository.delete(id);
    return { success: true, message: 'Notification deleted successfully' };
  }
}
