import {
  Controller, Get, Post, Patch, Param, Body, Query,
  UseGuards, ParseIntPipe, Request,
} from '@nestjs/common';
import { PurchaseRequisitionsService } from './purchase-requisitions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../database/entities/user.entity';

@Controller('prs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PurchaseRequisitionsController {
  constructor(private service: PurchaseRequisitionsService) {}

  @Get()
  findAll(@Query() query: any) { return this.service.findAll(query); }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findOne(id); }

  @Post()
  create(@Body() dto: any, @Request() req) { return this.service.create(dto, req.user.id); }

  @Post('generate-from-mo')
  generateFromMO(@Body() dto: { maintenanceOrderId: number; shortages?: any[] }, @Request() req) {
    return this.service.generateFromMO(dto.maintenanceOrderId, req.user.id, dto.shortages);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: any, @Request() req) {
    return this.service.update(id, dto, req.user.id);
  }

  @Post(':id/submit')
  submit(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.service.submitForApproval(id, req.user.id);
  }

  @Post(':id/approve')
  @Roles(UserRole.SUPERVISOR, UserRole.PROCUREMENT_MANAGER, UserRole.ADMIN)
  approve(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.service.approve(id, req.user.id);
  }

  @Post(':id/reject')
  @Roles(UserRole.SUPERVISOR, UserRole.PROCUREMENT_MANAGER, UserRole.ADMIN)
  reject(@Param('id', ParseIntPipe) id: number, @Body() dto: { reason: string }, @Request() req) {
    return this.service.reject(id, req.user.id, dto.reason);
  }
}
