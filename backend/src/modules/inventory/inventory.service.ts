import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inventory } from '../../database/entities/inventory.entity';
import { Reservation, ReservationStatus } from '../../database/entities/reservation.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Inventory) private inventoryRepo: Repository<Inventory>,
    @InjectRepository(Reservation) private reservationRepo: Repository<Reservation>,
    private eventEmitter: EventEmitter2,
  ) {}

  findAll() { return this.inventoryRepo.find({ order: { updatedAt: 'DESC' } }); }

  async findByComponent(componentId: number) {
    return this.inventoryRepo.findOne({ where: { componentId } });
  }

  async checkAvailability(componentId: number, requiredQty: number) {
    const inv = await this.inventoryRepo.findOne({ where: { componentId } });
    if (!inv) return { available: 0, required: requiredQty, canFulfill: false, needsToPurchase: requiredQty };
    const available = inv.quantityOnHand - inv.quantityReserved;
    const canFulfill = available >= requiredQty;
    return { available, required: requiredQty, canFulfill, needsToPurchase: canFulfill ? 0 : requiredQty - available };
  }

  async checkAndReserveForMO(maintenanceOrderId: number, items: Array<{ componentId: number; quantity: number }>) {
    const results = [];
    const shortages = [];

    for (const item of items) {
      const check = await this.checkAvailability(item.componentId, item.quantity);
      const reservedQty = Math.min(check.available, item.quantity);
      const status = check.canFulfill
        ? ReservationStatus.RESERVED
        : reservedQty > 0 ? ReservationStatus.PARTIAL : ReservationStatus.FAILED;

      if (reservedQty > 0) {
        const inv = await this.inventoryRepo.findOne({ where: { componentId: item.componentId } });
        if (inv) { inv.quantityReserved += reservedQty; await this.inventoryRepo.save(inv); }
      }

      const res = this.reservationRepo.create({
        maintenanceOrderId, componentId: item.componentId,
        requestedQty: item.quantity, reservedQty, status,
      });
      await this.reservationRepo.save(res);
      results.push({ ...res, check });
      if (!check.canFulfill) shortages.push({ componentId: item.componentId, needed: check.needsToPurchase });
    }

    this.eventEmitter.emit('inventory.checked', { maintenanceOrderId, shortages });
    return { reservations: results, shortages, hasShortages: shortages.length > 0 };
  }

  async releaseReservations(maintenanceOrderId: number) {
    const reservations = await this.reservationRepo.find({
      where: { maintenanceOrderId, status: ReservationStatus.RESERVED },
    });
    for (const res of reservations) {
      const inv = await this.inventoryRepo.findOne({ where: { componentId: res.componentId } });
      if (inv) { inv.quantityReserved = Math.max(0, inv.quantityReserved - res.reservedQty); await this.inventoryRepo.save(inv); }
      res.status = ReservationStatus.RELEASED;
      await this.reservationRepo.save(res);
    }
    return { released: reservations.length };
  }

  async updateStock(componentId: number, dto: any) {
    let inv = await this.inventoryRepo.findOne({ where: { componentId } });
    if (!inv) inv = this.inventoryRepo.create({ componentId, quantityOnHand: 0, quantityReserved: 0 });
    Object.assign(inv, dto);
    return this.inventoryRepo.save(inv);
  }

  async receiveGoods(componentId: number, quantity: number) {
    let inv = await this.inventoryRepo.findOne({ where: { componentId } });
    if (!inv) inv = this.inventoryRepo.create({ componentId, quantityOnHand: 0, quantityReserved: 0 });
    inv.quantityOnHand += quantity;
    return this.inventoryRepo.save(inv);
  }

  async getReservationsForMO(maintenanceOrderId: number) {
    return this.reservationRepo.find({ where: { maintenanceOrderId } });
  }
}
