import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../../database/entities/user.entity';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private repo: Repository<User>) {}

  async findAll() {
    const users = await this.repo.find({ order: { createdAt: 'DESC' } });
    return users.map(({ passwordHash, ...u }) => u);
  }

  async findOne(id: number) {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User #${id} not found`);
    const { passwordHash, ...safe } = user;
    return safe;
  }

  async findByEmail(email: string) {
    return this.repo.findOne({ where: { email } });
  }

  async create(dto: { name: string; email: string; password: string; role: string }) {
    const existing = await this.repo.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already in use');
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = this.repo.create({ name: dto.name, email: dto.email, passwordHash, role: dto.role as any });
    const saved = await this.repo.save(user);
    const { passwordHash: _, ...safe } = saved;
    return safe;
  }

  async update(id: number, dto: any) {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User #${id} not found`);
    if (dto.password) {
      dto.passwordHash = await bcrypt.hash(dto.password, 10);
      delete dto.password;
    }
    Object.assign(user, dto);
    const saved = await this.repo.save(user);
    const { passwordHash, ...safe } = saved;
    return safe;
  }

  async remove(id: number) {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User #${id} not found`);
    user.isActive = false;
    await this.repo.save(user);
    return { message: 'User deactivated' };
  }
}
