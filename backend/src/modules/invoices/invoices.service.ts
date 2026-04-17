import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice, InvoiceStatus } from '../../database/entities/invoice.entity';
import { PurchaseOrder } from '../../database/entities/purchase-order.entity';
import { GoodsReceipt } from '../../database/entities/goods-receipt.entity';
import { AuditLog } from '../../database/entities/audit-log.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(Invoice) private repo: Repository<Invoice>,
    @InjectRepository(PurchaseOrder) private poRepo: Repository<PurchaseOrder>,
    @InjectRepository(GoodsReceipt) private grnRepo: Repository<GoodsReceipt>,
    @InjectRepository(AuditLog) private auditRepo: Repository<AuditLog>,
    private eventEmitter: EventEmitter2,
  ) {}

  private generateInvoiceNumber() {
    return `INV-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
  }

  private async log(entityId: number, action: string, userId: number, from?: string, to?: string) {
    await this.auditRepo.save(
      this.auditRepo.create({ entityType: 'invoice', entityId, action, fromState: from, toState: to, performedById: userId }),
    );
  }

  findAll(query?: any) {
    const qb = this.repo.createQueryBuilder('inv')
      .leftJoinAndSelect('inv.purchaseOrder', 'po')
      .leftJoinAndSelect('po.vendor', 'vendor')
      .leftJoinAndSelect('inv.goodsReceipt', 'grn')
      .orderBy('inv.createdAt', 'DESC');
    if (query?.status) qb.andWhere('inv.status = :s', { s: query.status });
    return qb.getMany();
  }

  async findOne(id: number) {
    const inv = await this.repo.findOne({
      where: { id },
      relations: ['purchaseOrder', 'purchaseOrder.vendor', 'purchaseOrder.items', 'purchaseOrder.items.component', 'goodsReceipt', 'approvedBy'],
    });
    if (!inv) throw new NotFoundException(`Invoice #${id} not found`);
    if (inv.approvedBy) delete (inv.approvedBy as any).passwordHash;
    return inv;
  }

  async create(dto: {
    purchaseOrderId: number; goodsReceiptId?: number; amount: number;
    vendorInvoiceNumber?: string; invoiceDate?: Date; dueDate?: Date; currency?: string;
  }, userId: number) {
    const po = await this.poRepo.findOne({ where: { id: dto.purchaseOrderId } });
    if (!po) throw new NotFoundException('Purchase Order not found');

    // 3-way match
    let status = InvoiceStatus.PENDING;
    let matchNotes = 'Awaiting GRN for 3-way match.';

    if (dto.goodsReceiptId) {
      const grn = await this.grnRepo.findOne({ where: { id: dto.goodsReceiptId } });
      if (grn) {
        const tolerance = 0.05;
        const diff = po.totalAmount > 0 ? Math.abs(dto.amount - po.totalAmount) / po.totalAmount : 0;
        if (diff <= tolerance && grn.status === 'complete') {
          status = InvoiceStatus.MATCHED;
          matchNotes = `3-way match passed. Amount diff: ${(diff * 100).toFixed(2)}%. PO: $${po.totalAmount}, Invoice: $${dto.amount}.`;
        } else {
          status = InvoiceStatus.EXCEPTION;
          matchNotes = `Match failed. Amount diff: ${(diff * 100).toFixed(2)}%. GRN status: ${grn.status}. Manual review required.`;
        }
      }
    }

    const invoice = this.repo.create({
      invoiceNumber: this.generateInvoiceNumber(),
      vendorInvoiceNumber: dto.vendorInvoiceNumber,
      purchaseOrderId: dto.purchaseOrderId,
      goodsReceiptId: dto.goodsReceiptId,
      amount: dto.amount,
      currency: dto.currency || 'USD',
      invoiceDate: dto.invoiceDate,
      dueDate: dto.dueDate,
      status,
      matchNotes,
    });

    const saved = await this.repo.save(invoice);
    await this.log(saved.id, 'INVOICE_CREATED', userId, null, status);
    this.eventEmitter.emit('invoice.created', { invoiceId: saved.id, status });
    return saved;
  }

  async approve(id: number, userId: number) {
    const inv = await this.findOne(id);
    if (![InvoiceStatus.MATCHED, InvoiceStatus.PENDING, InvoiceStatus.EXCEPTION].includes(inv.status as any)) {
      throw new BadRequestException('Invoice cannot be approved in its current state');
    }
    const prev = inv.status;
    inv.status = InvoiceStatus.APPROVED;
    inv.approvedById = userId;
    inv.approvedAt = new Date() as any;
    const saved = await this.repo.save(inv);
    await this.log(id, 'INVOICE_APPROVED', userId, prev, InvoiceStatus.APPROVED);
    this.eventEmitter.emit('invoice.approved', { invoiceId: id });
    return saved;
  }

  async markPaid(id: number, userId: number) {
    const inv = await this.findOne(id);
    if (inv.status !== InvoiceStatus.APPROVED) throw new BadRequestException('Invoice must be approved before marking paid');
    const prev = inv.status;
    inv.status = InvoiceStatus.PAID;
    inv.paidAt = new Date() as any;
    const saved = await this.repo.save(inv);
    await this.log(id, 'INVOICE_PAID', userId, prev, InvoiceStatus.PAID);
    this.eventEmitter.emit('invoice.paid', { invoiceId: id });
    return saved;
  }

  async reject(id: number, userId: number, reason: string) {
    const inv = await this.findOne(id);
    const prev = inv.status;
    inv.status = InvoiceStatus.REJECTED;
    inv.exceptionReason = reason;
    const saved = await this.repo.save(inv);
    await this.log(id, 'INVOICE_REJECTED', userId, prev, InvoiceStatus.REJECTED);
    return saved;
  }
}
