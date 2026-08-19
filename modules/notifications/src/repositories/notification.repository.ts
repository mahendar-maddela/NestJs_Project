import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../entities/notification.entity';
import { User } from '../../../users/src/entities/user.entity';

@Injectable()
export class NotificationRepository {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async findClientUserTokens(clientId: number) {
    const users = await this.userRepo.find({ where: { clientId }, select: { id: true, userId: true, fcmToken: true } });
    return users.map((u) => u.fcmToken).filter((t): t is string => Boolean(t));
  }

  async create(data: Partial<Notification>) {
    return this.notificationRepo.save(this.notificationRepo.create(data));
  }

  async findByStaffId(staffId: number) {
    return this.notificationRepo.find({ where: { staffId } });
  }

  async findAndCountByClient(clientId: number, skip: number, take: number) {
    return this.notificationRepo.findAndCount({
      where: { clientId },
      order: { createdAt: 'DESC' },
      skip,
      take,
    });
  }

  /** Mirrors `controllers/APP/notificationController.js:getAllNotifications`. */
  async findAndCountByClientType(clientId: number, type: string | undefined, skip: number, take: number) {
    return this.notificationRepo.findAndCount({
      where: { clientId, ...(type ? { type } : {}) },
      order: { createdAt: 'DESC' },
      skip,
      take,
    });
  }

  async findByIdAndClient(id: number, clientId: number) {
    return this.notificationRepo.findOne({ where: { id, clientId } });
  }

  async delete(id: number) {
    return this.notificationRepo.delete(id);
  }
}
