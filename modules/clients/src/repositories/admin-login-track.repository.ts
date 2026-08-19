import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { LoginTrack } from '../entities/login-track.entity';

@Injectable()
export class AdminLoginTrackRepository {
  constructor(@InjectRepository(LoginTrack) private readonly repo: Repository<LoginTrack>) {}

  async findAndCountPaginated(clientId: number, softwareLoginEmail: string | undefined, skip: number, take: number) {
    const qb = this.repo
      .createQueryBuilder('lt')
      .innerJoinAndSelect('lt.staff', 'staff')
      .where('lt.clientId = :clientId', { clientId })
      .andWhere('lt.staffId != :excludedStaffId', { excludedStaffId: 1 });

    if (softwareLoginEmail) {
      qb.andWhere('staff.email != :softwareLoginEmail', { softwareLoginEmail });
    }

    qb.orderBy('lt.createdAt', 'DESC').skip(skip).take(take);

    return qb.getManyAndCount();
  }
}
