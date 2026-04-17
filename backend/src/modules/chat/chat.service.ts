import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiService } from '../../ai/ai.service';
import { MaintenanceOrder } from '../../database/entities/maintenance-order.entity';
import { Defect } from '../../database/entities/defect.entity';
import { PurchaseRequisition } from '../../database/entities/purchase-requisition.entity';
import { PurchaseOrder } from '../../database/entities/purchase-order.entity';
import { Inventory } from '../../database/entities/inventory.entity';
import { AuditLog } from '../../database/entities/audit-log.entity';

@Injectable()
export class ChatService {
  constructor(
    private aiService: AiService,
    @InjectRepository(MaintenanceOrder) private moRepo: Repository<MaintenanceOrder>,
    @InjectRepository(Defect) private defectRepo: Repository<Defect>,
    @InjectRepository(PurchaseRequisition) private prRepo: Repository<PurchaseRequisition>,
    @InjectRepository(PurchaseOrder) private poRepo: Repository<PurchaseOrder>,
    @InjectRepository(Inventory) private inventoryRepo: Repository<Inventory>,
    @InjectRepository(AuditLog) private auditRepo: Repository<AuditLog>,
  ) {}

  async chat(
    message: string,
    userRole: string,
    userId: number,
    history: Array<{ role: 'user' | 'assistant'; content: string }> = [],
  ): Promise<string> {
    const context = await this.buildContext();
    return this.aiService.chat(message, userRole, context, history);
  }

  private async buildContext(): Promise<string> {
    const lines: string[] = [];

    try {
      // MOs pending review — no relations, use raw fields
      const pendingMOCount = await this.moRepo.count({ where: { status: 'pending_review' as any } });
      const recentMOs = await this.moRepo.find({
        where: { status: 'pending_review' as any },
        order: { createdAt: 'DESC' },
        take: 5,
      });
      lines.push(`MAINTENANCE ORDERS PENDING REVIEW: ${pendingMOCount}`);
      for (const mo of recentMOs) {
        lines.push(`  - ${mo.moNumber} | Created: ${mo.createdAt?.toISOString?.().slice(0, 10) ?? 'unknown'}`);
      }
    } catch { lines.push('MAINTENANCE ORDERS: data unavailable'); }

    try {
      // Recent defects — no relations
      const recentDefects = await this.defectRepo.find({ order: { createdAt: 'DESC' }, take: 5 });
      lines.push(`\nRECENT DEFECTS (last 5):`);
      for (const d of recentDefects) {
        lines.push(`  - Defect #${d.id} | ${d.aiDetectedComponent || 'Unknown'} | Severity: ${d.severity} | Status: ${d.status}`);
      }
      const pendingCount = await this.defectRepo.count({ where: { status: 'pending_review' as any } });
      lines.push(`  (${pendingCount} total pending review)`);
    } catch { lines.push('\nDEFECTS: data unavailable'); }

    try {
      // PRs awaiting approval — no relations
      const pendingPRCount = await this.prRepo.count({ where: { status: 'pending_approval' as any } });
      const openPRs = await this.prRepo.find({ where: { status: 'pending_approval' as any }, take: 5 });
      lines.push(`\nPURCHASE REQUISITIONS AWAITING APPROVAL: ${pendingPRCount}`);
      for (const pr of openPRs) {
        lines.push(`  - ${pr.prNumber} | Priority: ${pr.priority}`);
      }
    } catch { lines.push('\nPURCHASE REQUISITIONS: data unavailable'); }

    try {
      // Inventory low stock — avoid eager relations by using raw query
      const allInventory = await this.inventoryRepo
        .createQueryBuilder('inv')
        .select(['inv.id', 'inv.componentId', 'inv.quantityOnHand', 'inv.quantityReserved', 'inv.reorderPoint'])
        .getRawMany();
      const lowStock = allInventory.filter((i) =>
        (i.inv_quantityOnHand - i.inv_quantityReserved) <= i.inv_reorderPoint
      );
      lines.push(`\nLOW STOCK ITEMS: ${lowStock.length}`);
      for (const i of lowStock.slice(0, 5)) {
        lines.push(`  - Component #${i.inv_componentId} | Available: ${i.inv_quantityOnHand - i.inv_quantityReserved} | Reorder at: ${i.inv_reorderPoint}`);
      }
    } catch { lines.push('\nINVENTORY: data unavailable'); }

    try {
      // PO summary
      const pendingPOs = await this.poRepo.count({ where: { status: 'created' as any } });
      const approvedPOs = await this.poRepo.count({ where: { status: 'approved' as any } });
      lines.push(`\nPURCHASE ORDERS: ${pendingPOs} pending approval, ${approvedPOs} approved`);
    } catch { lines.push('\nPURCHASE ORDERS: data unavailable'); }

    try {
      // Recent audit trail — no relations
      const recentAudit = await this.auditRepo.find({ order: { createdAt: 'DESC' }, take: 5 });
      lines.push(`\nRECENT SYSTEM ACTIVITY:`);
      for (const a of recentAudit) {
        lines.push(`  - ${a.action} on ${a.entityType} #${a.entityId} at ${a.createdAt?.toISOString?.().slice(0, 16) ?? 'unknown'}`);
      }
    } catch { lines.push('\nRECENT ACTIVITY: data unavailable'); }

    return lines.join('\n');
  }
}
