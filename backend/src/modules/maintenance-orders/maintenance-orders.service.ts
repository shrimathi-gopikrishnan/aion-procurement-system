import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MaintenanceOrder, MoStatus, MoAction } from '../../database/entities/maintenance-order.entity';
import { Defect, DefectStatus } from '../../database/entities/defect.entity';
import { AuditLog } from '../../database/entities/audit-log.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class MaintenanceOrdersService {
  constructor(
    @InjectRepository(MaintenanceOrder) private repo: Repository<MaintenanceOrder>,
    @InjectRepository(Defect) private defectRepo: Repository<Defect>,
    @InjectRepository(AuditLog) private auditRepo: Repository<AuditLog>,
    private eventEmitter: EventEmitter2,
  ) {}

  private generateMoNumber(): string {
    return `MO-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
  }

  private async log(entityId: number, action: string, userId: number, from?: string, to?: string, meta?: any) {
    await this.auditRepo.save(
      this.auditRepo.create({
        entityType: 'maintenance_order',
        entityId,
        action,
        fromState: from,
        toState: to,
        metadata: meta ? JSON.stringify(meta) : null,
        performedById: userId,
      }),
    );
  }

  private strip(mo: MaintenanceOrder) {
    if (mo.createdBy) delete (mo.createdBy as any).passwordHash;
    if (mo.approvedBy) delete (mo.approvedBy as any).passwordHash;
    return mo;
  }

  async findAll(query?: any) {
    const qb = this.repo
      .createQueryBuilder('mo')
      .leftJoinAndSelect('mo.defect', 'defect')
      .leftJoinAndSelect('defect.component', 'component')
      .leftJoinAndSelect('mo.createdBy', 'createdBy')
      .leftJoinAndSelect('mo.approvedBy', 'approvedBy')
      .orderBy('mo.createdAt', 'DESC');
    if (query?.status) qb.andWhere('mo.status = :s', { s: query.status });
    const mos = await qb.getMany();
    return mos.map(this.strip.bind(this));
  }

  async findOne(id: number) {
    const mo = await this.repo.findOne({
      where: { id },
      relations: ['defect', 'defect.component', 'createdBy', 'approvedBy'],
    });
    if (!mo) throw new NotFoundException(`Maintenance Order #${id} not found`);
    return this.strip(mo);
  }

  async createAndApproveFromDefect(
    defectId: number,
    decision: 'repair' | 'replace' | 'no_action',
    supervisorId: number,
    notes?: string,
  ): Promise<any> {
    const defect = await this.defectRepo.findOne({ where: { id: defectId } });
    if (!defect) throw new NotFoundException('Defect not found');

    // No action — close defect without creating an MO
    if (decision === 'no_action') {
      defect.status = DefectStatus.REVIEWED;
      defect.supervisorNotes = notes || 'No corrective action required at this time.';
      await this.defectRepo.save(defect);

      if (defect.createdById) {
        this.eventEmitter.emit('notification.create', {
          userId: defect.createdById,
          type: 'status_update',
          title: 'Defect Reviewed — No Action Required',
          message: `Defect #${defectId} has been reviewed. Supervisor determined no corrective action is required. ${notes ? 'Note: ' + notes : ''}`,
          entityType: 'defect',
          entityId: defectId,
          actionUrl: `/my-defects`,
          priority: 'low',
          isRead: false,
        });
      }

      return { id: null, action: 'no_action', defectId, message: 'Defect reviewed — no action required' };
    }

    const action = decision === 'repair' ? MoAction.REPAIR : MoAction.REPLACE;
    const mo = this.repo.create({
      moNumber: this.generateMoNumber(),
      defectId,
      status: MoStatus.APPROVED,
      action,
      actionReason: notes || `Supervisor approved: ${decision}`,
      plannedWork: `${decision === 'repair' ? 'Repair' : 'Replace'} ${defect.aiDetectedComponent || 'component'} — ${defect.damageType || 'defect'}`,
      createdById: supervisorId,
      approvedById: supervisorId,
      approvedAt: new Date(),
      workflowState: 'ACTION_DECIDED',
    });

    const saved = await this.repo.save(mo);
    defect.status = DefectStatus.LINKED_TO_MO;
    if (notes) defect.supervisorNotes = notes;
    await this.defectRepo.save(defect);

    await this.log(saved.id, 'MO_CREATED_AND_APPROVED', supervisorId, 'DRAFT', MoStatus.APPROVED, { action });
    this.eventEmitter.emit('maintenance_order.approved', { moId: saved.id, action });

    if (defect.createdById) {
      this.eventEmitter.emit('notification.create', {
        userId: defect.createdById,
        type: 'mo_approved',
        title: 'Your Defect Has Been Reviewed',
        message: `Decision: ${decision.toUpperCase()} — Maintenance Order ${saved.moNumber} created. ${notes ? 'Note: ' + notes : ''}`,
        entityType: 'maintenance_order',
        entityId: saved.id,
        actionUrl: `/maintenance-orders/${saved.id}`,
        priority: 'medium',
        isRead: false,
      });
    }

    return saved;
  }

  async createFromDefect(defectId: number, userId: number, dto?: { plannedWork?: string }) {
    const defect = await this.defectRepo.findOne({ where: { id: defectId } });
    if (!defect) throw new NotFoundException('Defect not found');

    const mo = this.repo.create({
      moNumber: this.generateMoNumber(),
      defectId,
      status: MoStatus.PENDING_REVIEW,
      action: MoAction.PENDING,
      plannedWork: dto?.plannedWork,
      createdById: userId,
      workflowState: 'MO_CREATED',
    });

    const saved = await this.repo.save(mo);
    defect.status = DefectStatus.LINKED_TO_MO;
    await this.defectRepo.save(defect);
    await this.log(saved.id, 'MO_CREATED', userId, 'DRAFT', 'MO_CREATED');
    this.eventEmitter.emit('maintenance_order.created', { moId: saved.id });
    return saved;
  }

  async approve(id: number, userId: number, dto: { action: MoAction; actionReason?: string; plannedWork?: string }) {
    const mo = await this.findOne(id);
    if (mo.status !== MoStatus.PENDING_REVIEW) {
      throw new BadRequestException('MO is not in pending review state');
    }
    const prev = mo.status;
    mo.status = MoStatus.APPROVED;
    mo.action = dto.action;
    mo.actionReason = dto.actionReason;
    if (dto.plannedWork) mo.plannedWork = dto.plannedWork;
    mo.approvedById = userId;
    mo.approvedAt = new Date();
    mo.workflowState = 'ACTION_DECIDED';
    const saved = await this.repo.save(mo);
    await this.log(id, 'MO_APPROVED', userId, prev, MoStatus.APPROVED, { action: dto.action });
    this.eventEmitter.emit('maintenance_order.approved', { moId: id, action: dto.action });

    // Notify the operator who reported the defect
    if (mo.defect?.createdById) {
      const actionLabel = dto.action === 'repair' ? 'Repair' : dto.action === 'replace' ? 'Replace' : 'Action';
      this.eventEmitter.emit('notification.create', {
        userId: mo.defect.createdById,
        type: 'mo_approved',
        title: `Your Defect Report Has Been Actioned`,
        message: `Maintenance Order ${mo.moNumber} has been approved. Decision: ${actionLabel}. ${dto.actionReason ? 'Reason: ' + dto.actionReason : ''}`,
        entityType: 'maintenance_order',
        entityId: id,
        actionUrl: `/maintenance-orders/${id}`,
        priority: 'medium',
        isRead: false,
      });
    }

    return saved;
  }

  async reject(id: number, userId: number, reason: string) {
    const mo = await this.findOne(id);
    const prev = mo.status;
    mo.status = MoStatus.REJECTED;
    mo.rejectionReason = reason;
    mo.workflowState = 'REJECTED';
    const saved = await this.repo.save(mo);
    await this.log(id, 'MO_REJECTED', userId, prev, MoStatus.REJECTED, { reason });
    this.eventEmitter.emit('maintenance_order.rejected', { moId: id });

    // Notify the operator who reported the defect
    if (mo.defect?.createdById) {
      this.eventEmitter.emit('notification.create', {
        userId: mo.defect.createdById,
        type: 'mo_rejected',
        title: `Maintenance Order Rejected`,
        message: `Maintenance Order ${mo.moNumber} was rejected. Reason: ${reason}`,
        entityType: 'maintenance_order',
        entityId: id,
        actionUrl: `/maintenance-orders/${id}`,
        priority: 'low',
        isRead: false,
      });
    }

    return saved;
  }

  async update(id: number, dto: any, userId: number) {
    const mo = await this.findOne(id);
    Object.assign(mo, dto);
    const saved = await this.repo.save(mo);
    await this.log(id, 'MO_UPDATED', userId, null, null, dto);
    return saved;
  }

  async getAuditTrail(id: number) {
    return this.auditRepo.find({
      where: { entityType: 'maintenance_order', entityId: id },
      relations: ['performedBy'],
      order: { createdAt: 'ASC' },
    });
  }
}
