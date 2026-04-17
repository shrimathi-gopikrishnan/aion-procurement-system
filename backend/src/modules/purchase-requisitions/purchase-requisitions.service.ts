import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  PurchaseRequisition, PrStatus, PrPriority,
} from '../../database/entities/purchase-requisition.entity';
import { PrItem } from '../../database/entities/pr-item.entity';
import { MaintenanceOrder } from '../../database/entities/maintenance-order.entity';
import { Component } from '../../database/entities/component.entity';
import { AuditLog } from '../../database/entities/audit-log.entity';
import { AiService } from '../../ai/ai.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class PurchaseRequisitionsService {
  constructor(
    @InjectRepository(PurchaseRequisition) private repo: Repository<PurchaseRequisition>,
    @InjectRepository(PrItem) private itemRepo: Repository<PrItem>,
    @InjectRepository(MaintenanceOrder) private moRepo: Repository<MaintenanceOrder>,
    @InjectRepository(Component) private componentRepo: Repository<Component>,
    @InjectRepository(AuditLog) private auditRepo: Repository<AuditLog>,
    private aiService: AiService,
    private eventEmitter: EventEmitter2,
  ) {}

  private generatePrNumber() {
    return `PR-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
  }

  private async log(entityId: number, action: string, userId: number, from?: string, to?: string) {
    await this.auditRepo.save(
      this.auditRepo.create({ entityType: 'purchase_requisition', entityId, action, fromState: from, toState: to, performedById: userId }),
    );
  }

  private strip(pr: PurchaseRequisition) {
    if (pr.createdBy) delete (pr.createdBy as any).passwordHash;
    if (pr.approvedBy) delete (pr.approvedBy as any).passwordHash;
    return pr;
  }

  async findAll(query?: any) {
    const where: any = {};
    if (query?.status) where.status = query.status;
    const prs = await this.repo.find({
      where,
      relations: ['items', 'items.component', 'createdBy', 'approvedBy', 'maintenanceOrder'],
      order: { createdAt: 'DESC' },
    });
    return prs.map(this.strip.bind(this));
  }

  async findOne(id: number) {
    const pr = await this.repo.findOne({
      where: { id },
      relations: ['items', 'items.component', 'createdBy', 'approvedBy', 'maintenanceOrder'],
    });
    if (!pr) throw new NotFoundException(`PR #${id} not found`);
    return this.strip(pr);
  }

  async generateFromMO(maintenanceOrderId: number, userId: number, shortages?: Array<{ componentId: number; needed: number }>) {
    const mo = await this.moRepo.findOne({
      where: { id: maintenanceOrderId },
      relations: ['defect', 'defect.component'],
    });
    if (!mo) throw new NotFoundException('Maintenance Order not found');

    // If no explicit shortages, create a PR for the defect component
    let items = shortages || [];
    if (!items.length && mo.defect?.componentId) {
      items = [{ componentId: mo.defect.componentId, needed: 1 }];
    }

    const enrichedItems = await Promise.all(
      items.map(async (s) => {
        const comp = await this.componentRepo.findOne({ where: { id: s.componentId } });
        return { ...s, componentName: comp?.name || 'Unknown Component' };
      }),
    );

    const aiDraft = await this.aiService.generatePrDraft({
      components: enrichedItems.map((i) => ({ name: i.componentName, quantity: i.needed })),
      maintenanceOrderNumber: mo.moNumber,
      defectSeverity: mo.defect?.severity || 'medium',
      action: mo.action,
    });

    const pr = this.repo.create({
      prNumber: this.generatePrNumber(),
      maintenanceOrderId,
      status: PrStatus.DRAFT,
      priority: (aiDraft.priority as PrPriority) || PrPriority.MEDIUM,
      justification: aiDraft.justification,
      aiDraftNotes: aiDraft.notes,
      createdById: userId,
      version: 1,
    });
    const saved = await this.repo.save(pr);

    for (const item of enrichedItems) {
      await this.itemRepo.save(this.itemRepo.create({
        purchaseRequisitionId: saved.id,
        componentId: item.componentId,
        quantity: item.needed,
      }));
    }

    await this.log(saved.id, 'PR_CREATED', userId, null, PrStatus.DRAFT);
    this.eventEmitter.emit('pr.drafted', { prId: saved.id });
    return this.findOne(saved.id);
  }

  async create(dto: any, userId: number) {
    const pr = this.repo.create({
      ...dto,
      prNumber: this.generatePrNumber(),
      status: PrStatus.DRAFT,
      createdById: userId,
      version: 1,
    });
    const saved = await this.repo.save(pr) as unknown as PurchaseRequisition;
    if (dto.items?.length) {
      for (const item of dto.items) {
        await this.itemRepo.save(this.itemRepo.create({ ...item, purchaseRequisitionId: saved.id }));
      }
    }
    await this.log(saved.id, 'PR_CREATED', userId);
    return this.findOne(saved.id);
  }

  async update(id: number, dto: any, userId: number) {
    const pr = await this.findOne(id);
    if ([PrStatus.APPROVED, PrStatus.CONVERTED_TO_PO].includes(pr.status as any)) {
      throw new BadRequestException('Cannot edit an approved or converted PR');
    }
    Object.assign(pr, dto);
    pr.version = (pr.version || 1) + 1;
    if (dto.items) {
      await this.itemRepo.delete({ purchaseRequisitionId: id });
      for (const item of dto.items) {
        await this.itemRepo.save(this.itemRepo.create({ ...item, purchaseRequisitionId: id }));
      }
    }
    const saved = await this.repo.save(pr);
    await this.log(id, 'PR_UPDATED', userId);
    return this.findOne(saved.id);
  }

  async submitForApproval(id: number, userId: number) {
    const pr = await this.findOne(id);
    if (pr.status !== PrStatus.DRAFT) throw new BadRequestException('PR must be in draft state');
    pr.status = PrStatus.PENDING_APPROVAL;
    const saved = await this.repo.save(pr);
    await this.log(id, 'PR_SUBMITTED', userId, PrStatus.DRAFT, PrStatus.PENDING_APPROVAL);
    return saved;
  }

  async approve(id: number, userId: number) {
    const pr = await this.findOne(id);
    if (pr.status !== PrStatus.PENDING_APPROVAL) throw new BadRequestException('PR is not pending approval');
    const prev = pr.status;
    pr.status = PrStatus.APPROVED;
    pr.approvedById = userId;
    pr.approvedAt = new Date() as any;
    const saved = await this.repo.save(pr);
    await this.log(id, 'PR_APPROVED', userId, prev, PrStatus.APPROVED);
    this.eventEmitter.emit('pr.approved', { prId: id });
    return saved;
  }

  async reject(id: number, userId: number, reason: string) {
    const pr = await this.findOne(id);
    const prev = pr.status;
    pr.status = PrStatus.REJECTED;
    pr.rejectionReason = reason;
    const saved = await this.repo.save(pr);
    await this.log(id, 'PR_REJECTED', userId, prev, PrStatus.REJECTED);
    return saved;
  }

  async markConverted(id: number) {
    await this.repo.update(id, { status: PrStatus.CONVERTED_TO_PO });
  }
}
