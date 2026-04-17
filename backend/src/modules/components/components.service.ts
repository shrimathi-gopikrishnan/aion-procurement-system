import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Component } from '../../database/entities/component.entity';

@Injectable()
export class ComponentsService {
  constructor(@InjectRepository(Component) private repo: Repository<Component>) {}

  findAll() { return this.repo.find({ order: { name: 'ASC' } }); }

  async findOne(id: number) {
    const c = await this.repo.findOne({ where: { id } });
    if (!c) throw new NotFoundException(`Component #${id} not found`);
    return c;
  }

  create(dto: any) { return this.repo.save(this.repo.create(dto)); }

  async update(id: number, dto: any) {
    const c = await this.findOne(id);
    Object.assign(c, dto);
    return this.repo.save(c);
  }

  async remove(id: number) {
    const c = await this.findOne(id);
    await this.repo.remove(c);
    return { message: 'Deleted' };
  }
}
