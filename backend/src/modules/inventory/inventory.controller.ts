import {
  Controller, Get, Post, Patch, Param, Body, Query,
  UseGuards, ParseIntPipe, Request,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../database/entities/user.entity';

@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventoryController {
  constructor(private service: InventoryService) {}

  @Get()
  findAll() { return this.service.findAll(); }

  @Get('check')
  check(@Query('componentId') componentId: string, @Query('qty') qty: string) {
    return this.service.checkAvailability(parseInt(componentId), parseInt(qty));
  }

  @Get('reservations/:moId')
  getReservations(@Param('moId', ParseIntPipe) moId: number) {
    return this.service.getReservationsForMO(moId);
  }

  @Post('reserve')
  reserve(@Body() dto: { maintenanceOrderId: number; items: Array<{ componentId: number; quantity: number }> }) {
    return this.service.checkAndReserveForMO(dto.maintenanceOrderId, dto.items);
  }

  @Post('release')
  release(@Body() dto: { maintenanceOrderId: number }) {
    return this.service.releaseReservations(dto.maintenanceOrderId);
  }

  @Patch(':componentId')
  @Roles(UserRole.WAREHOUSE, UserRole.ADMIN, UserRole.SUPERVISOR)
  updateStock(@Param('componentId', ParseIntPipe) componentId: number, @Body() dto: any) {
    return this.service.updateStock(componentId, dto);
  }
}
