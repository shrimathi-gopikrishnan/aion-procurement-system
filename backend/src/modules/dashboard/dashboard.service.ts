import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MaintenanceOrder } from '../../database/entities/maintenance-order.entity';
import { Defect } from '../../database/entities/defect.entity';
import { PurchaseRequisition } from '../../database/entities/purchase-requisition.entity';
import { PurchaseOrder } from '../../database/entities/purchase-order.entity';
import { Invoice } from '../../database/entities/invoice.entity';
import { Inventory } from '../../database/entities/inventory.entity';
import { AuditLog } from '../../database/entities/audit-log.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(MaintenanceOrder) private moRepo: Repository<MaintenanceOrder>,
    @InjectRepository(Defect) private defectRepo: Repository<Defect>,
    @InjectRepository(PurchaseRequisition) private prRepo: Repository<PurchaseRequisition>,
    @InjectRepository(PurchaseOrder) private poRepo: Repository<PurchaseOrder>,
    @InjectRepository(Invoice) private invRepo: Repository<Invoice>,
    @InjectRepository(Inventory) private inventoryRepo: Repository<Inventory>,
    @InjectRepository(AuditLog) private auditRepo: Repository<AuditLog>,
  ) {}

  async getSummary() {
    try {
      const [
        totalDefects, pendingDefects,
        totalMOs, pendingMOs, approvedMOs,
        totalPRs, pendingPRs,
        totalPOs,
        pendingInvoices, paidInvoices,
      ] = await Promise.all([
        this.defectRepo.count().catch(() => 0),
        this.defectRepo.count({ where: { status: 'pending_review' as any } }).catch(() => 0),
        this.moRepo.count().catch(() => 0),
        this.moRepo.count({ where: { status: 'pending_review' as any } }).catch(() => 0),
        this.moRepo.count({ where: { status: 'approved' as any } }).catch(() => 0),
        this.prRepo.count().catch(() => 0),
        this.prRepo.count({ where: { status: 'pending_approval' as any } }).catch(() => 0),
        this.poRepo.count().catch(() => 0),
        this.invRepo.count({ where: { status: 'pending' as any } }).catch(() => 0),
        this.invRepo.count({ where: { status: 'paid' as any } }).catch(() => 0),
      ]);

      let totalPoValue = 0;
      try {
        const raw = await this.poRepo
          .createQueryBuilder('po')
          .select('SUM(po.totalAmount)', 'total')
          .getRawOne();
        totalPoValue = parseFloat(raw?.total || '0');
      } catch { totalPoValue = 0; }

      const recentDefects = await this.defectRepo
        .createQueryBuilder('d')
        .select(['d.id', 'd.aiDetectedComponent', 'd.damageType', 'd.severity', 'd.status', 'd.createdAt'])
        .orderBy('d.createdAt', 'DESC')
        .limit(5)
        .getMany()
        .catch(() => []);

      const recentMOs = await this.moRepo
        .createQueryBuilder('mo')
        .select(['mo.id', 'mo.moNumber', 'mo.status', 'mo.action', 'mo.createdAt'])
        .orderBy('mo.createdAt', 'DESC')
        .limit(5)
        .getMany()
        .catch(() => []);

      return {
        defects: { total: totalDefects, pending: pendingDefects },
        maintenanceOrders: { total: totalMOs, pending: pendingMOs, approved: approvedMOs },
        purchaseRequisitions: { total: totalPRs, pending: pendingPRs },
        purchaseOrders: { total: totalPOs, totalValue: totalPoValue },
        invoices: { pending: pendingInvoices, paid: paidInvoices },
        recentActivity: { defects: recentDefects, maintenanceOrders: recentMOs },
      };
    } catch (err) {
      return {
        defects: { total: 0, pending: 0 },
        maintenanceOrders: { total: 0, pending: 0, approved: 0 },
        purchaseRequisitions: { total: 0, pending: 0 },
        purchaseOrders: { total: 0, totalValue: 0 },
        invoices: { pending: 0, paid: 0 },
        recentActivity: { defects: [], maintenanceOrders: [] },
      };
    }
  }

  async getTimeline(maintenanceOrderId: number) {
    const mo = await this.moRepo
      .createQueryBuilder('mo')
      .leftJoinAndSelect('mo.defect', 'defect')
      .leftJoinAndSelect('mo.createdBy', 'createdBy')
      .leftJoinAndSelect('mo.approvedBy', 'approvedBy')
      .where('mo.id = :id', { id: maintenanceOrderId })
      .getOne()
      .catch(() => null);

    if (mo?.createdBy) delete (mo.createdBy as any).passwordHash;
    if (mo?.approvedBy) delete (mo.approvedBy as any).passwordHash;

    const auditLogs = await this.auditRepo.find({
      where: { entityType: 'maintenance_order', entityId: maintenanceOrderId },
      order: { createdAt: 'ASC' },
    }).catch(() => []);

    const prs = await this.prRepo.find({
      where: { maintenanceOrderId },
      relations: ['items', 'items.component'],
    }).catch(() => []);

    const pos: any[] = [];
    for (const pr of prs) {
      try {
        const found = await this.poRepo.find({
          where: { purchaseRequisitionId: pr.id },
          relations: ['vendor', 'items', 'items.component'],
        });
        pos.push(...found);
      } catch {}
    }

    return { maintenanceOrder: mo, auditTrail: auditLogs, purchaseRequisitions: prs, purchaseOrders: pos };
  }

  async getAuditLog(query: { entityType?: string; take?: string; skip?: string }) {
    try {
      const qb = this.auditRepo
        .createQueryBuilder('a')
        .leftJoinAndSelect('a.performedBy', 'performedBy')
        .orderBy('a.createdAt', 'DESC')
        .take(parseInt(query.take || '50'))
        .skip(parseInt(query.skip || '0'));
      if (query.entityType) qb.where('a.entityType = :et', { et: query.entityType });
      const logs = await qb.getMany();
      return logs.map((l) => {
        if (l.performedBy) delete (l.performedBy as any).passwordHash;
        return l;
      });
    } catch { return []; }
  }

  async getInventoryStatus() {
    try {
      const items = await this.inventoryRepo
        .createQueryBuilder('inv')
        .leftJoinAndSelect('inv.component', 'component')
        .orderBy('inv.updatedAt', 'DESC')
        .getMany();
      const lowStock = items.filter((i) => (i.quantityOnHand - i.quantityReserved) <= i.reorderPoint);
      return { items, lowStockCount: lowStock.length, lowStockItems: lowStock };
    } catch {
      return { items: [], lowStockCount: 0, lowStockItems: [] };
    }
  }
}
