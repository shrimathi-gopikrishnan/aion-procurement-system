import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PurchaseOrder, PoStatus } from '../../database/entities/purchase-order.entity';
import { PoItem } from '../../database/entities/po-item.entity';
import { PurchaseRequisition } from '../../database/entities/purchase-requisition.entity';
import { AuditLog } from '../../database/entities/audit-log.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class PurchaseOrdersService {
  constructor(
    @InjectRepository(PurchaseOrder) private repo: Repository<PurchaseOrder>,
    @InjectRepository(PoItem) private itemRepo: Repository<PoItem>,
    @InjectRepository(PurchaseRequisition) private prRepo: Repository<PurchaseRequisition>,
    @InjectRepository(AuditLog) private auditRepo: Repository<AuditLog>,
    private eventEmitter: EventEmitter2,
  ) {}

  private generatePoNumber() {
    return `PO-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
  }

  private async log(entityId: number, action: string, userId: number, from?: string, to?: string) {
    await this.auditRepo.save(
      this.auditRepo.create({ entityType: 'purchase_order', entityId, action, fromState: from, toState: to, performedById: userId }),
    );
  }

  private strip(po: PurchaseOrder) {
    if (po.createdBy) delete (po.createdBy as any).passwordHash;
    if (po.approvedBy) delete (po.approvedBy as any).passwordHash;
    return po;
  }

  async findAll(query?: any) {
    const qb = this.repo.createQueryBuilder('po')
      .leftJoinAndSelect('po.vendor', 'vendor')
      .leftJoinAndSelect('po.items', 'items')
      .leftJoinAndSelect('items.component', 'component')
      .leftJoinAndSelect('po.createdBy', 'createdBy')
      .leftJoinAndSelect('po.approvedBy', 'approvedBy')
      .leftJoinAndSelect('po.purchaseRequisition', 'pr')
      .orderBy('po.createdAt', 'DESC');
    if (query?.status) qb.andWhere('po.status = :s', { s: query.status });
    const pos = await qb.getMany();
    return pos.map(this.strip.bind(this));
  }

  async findOne(id: number) {
    const po = await this.repo.findOne({
      where: { id },
      relations: ['vendor', 'items', 'items.component', 'createdBy', 'approvedBy', 'purchaseRequisition'],
    });
    if (!po) throw new NotFoundException(`PO #${id} not found`);
    return this.strip(po);
  }

  async createFromPR(prId: number, vendorId: number, userId: number, dto?: any) {
    const pr = await this.prRepo.findOne({ where: { id: prId }, relations: ['items'] });
    if (!pr) throw new NotFoundException('PR not found');
    if (pr.status !== 'approved') throw new BadRequestException('PR must be approved before creating a PO');

    const po = this.repo.create({
      poNumber: this.generatePoNumber(),
      purchaseRequisitionId: prId,
      vendorId,
      status: PoStatus.CREATED,
      currency: dto?.currency || 'USD',
      deliveryAddress: dto?.deliveryAddress,
      expectedDeliveryDate: dto?.expectedDeliveryDate,
      paymentTerms: dto?.paymentTerms,
      notes: dto?.notes,
      createdById: userId,
    });
    const savedPo = await this.repo.save(po);

    let totalAmount = 0;
    for (const item of pr.items) {
      const unitPrice = dto?.prices?.[item.componentId] || item.estimatedUnitPrice || 0;
      totalAmount += unitPrice * item.quantity;
      await this.itemRepo.save(
        this.itemRepo.create({ purchaseOrderId: savedPo.id, componentId: item.componentId, quantity: item.quantity, unitPrice, receivedQty: 0 }),
      );
    }

    savedPo.totalAmount = totalAmount;
    await this.repo.save(savedPo);
    await this.log(savedPo.id, 'PO_CREATED', userId, null, PoStatus.CREATED);
    this.eventEmitter.emit('po.created', { poId: savedPo.id });
    return this.findOne(savedPo.id);
  }

  async create(dto: any, userId: number) {
    const po = this.repo.create({ ...dto, poNumber: this.generatePoNumber(), status: PoStatus.CREATED, createdById: userId });
    const saved = await this.repo.save(po) as unknown as PurchaseOrder;
    if (dto.items?.length) {
      let total = 0;
      for (const item of dto.items) {
        await this.itemRepo.save(this.itemRepo.create({ ...item, purchaseOrderId: saved.id }));
        total += (item.unitPrice || 0) * item.quantity;
      }
      saved.totalAmount = total;
      await this.repo.save(saved);
    }
    await this.log(saved.id, 'PO_CREATED', userId);
    return this.findOne(saved.id);
  }

  async approve(id: number, userId: number) {
    const po = await this.findOne(id);
    const prev = po.status;
    po.status = PoStatus.APPROVED;
    po.approvedById = userId;
    po.approvedAt = new Date() as any;
    const saved = await this.repo.save(po);
    await this.log(id, 'PO_APPROVED', userId, prev, PoStatus.APPROVED);
    this.eventEmitter.emit('po.approved', { poId: id });
    return saved;
  }

  async updateStatus(id: number, status: PoStatus, userId: number) {
    const po = await this.findOne(id);
    const prev = po.status;
    po.status = status;
    const saved = await this.repo.save(po);
    await this.log(id, `PO_STATUS_CHANGED`, userId, prev, status);
    return saved;
  }
}
