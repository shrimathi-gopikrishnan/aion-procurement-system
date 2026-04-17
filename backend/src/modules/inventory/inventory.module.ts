import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { Inventory } from '../../database/entities/inventory.entity';
import { Reservation } from '../../database/entities/reservation.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Inventory, Reservation])],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
