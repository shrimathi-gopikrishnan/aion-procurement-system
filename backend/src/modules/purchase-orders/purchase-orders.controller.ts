import {
  Controller, Get, Post, Patch, Param, Body, Query,
  UseGuards, ParseIntPipe, Request,
} from '@nestjs/common';
import { PurchaseOrdersService } from './purchase-orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../database/entities/user.entity';
import { PoStatus } from '../../database/entities/purchase-order.entity';

@Controller('pos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PurchaseOrdersController {
  constructor(private service: PurchaseOrdersService) {}

  @Get() findAll(@Query() query: any) { return this.service.findAll(query); }
  @Get(':id') findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findOne(id); }

  @Post()
  create(@Body() dto: any, @Request() req) { return this.service.create(dto, req.user.id); }

  @Post('from-pr')
  createFromPR(@Body() dto: { prId: number; vendorId: number; [key: string]: any }, @Request() req) {
    const { prId, vendorId, ...rest } = dto;
    return this.service.createFromPR(prId, vendorId, req.user.id, rest);
  }

  @Post(':id/approve')
  @Roles(UserRole.PROCUREMENT_MANAGER, UserRole.SUPERVISOR, UserRole.ADMIN)
  approve(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.service.approve(id, req.user.id);
  }

  @Patch(':id/status')
  @Roles(UserRole.PROCUREMENT_MANAGER, UserRole.ADMIN)
  updateStatus(@Param('id', ParseIntPipe) id: number, @Body() dto: { status: PoStatus }, @Request() req) {
    return this.service.updateStatus(id, dto.status, req.user.id);
  }
}
