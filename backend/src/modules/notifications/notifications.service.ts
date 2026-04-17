import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import { Notification } from '../../database/entities/notification.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification) private repo: Repository<Notification>,
  ) {}

  @OnEvent('notification.create')
  async handleCreate(payload: Partial<Notification>) {
    const n = this.repo.create(payload);
    await this.repo.save(n);
  }

  async create(data: Partial<Notification>) {
    const n = this.repo.create(data);
    return this.repo.save(n);
  }

  async getForUser(userId: number) {
    return this.repo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  async getUnreadCount(userId: number): Promise<number> {
    return this.repo.count({ where: { userId, isRead: false } });
  }

  async markRead(id: number, userId: number) {
    await this.repo.update({ id, userId }, { isRead: true });
    return { success: true };
  }

  async markAllRead(userId: number) {
    await this.repo.update({ userId, isRead: false }, { isRead: true });
    return { success: true };
  }

  async deleteOne(id: number, userId: number) {
    await this.repo.delete({ id, userId });
    return { success: true };
  }
}
