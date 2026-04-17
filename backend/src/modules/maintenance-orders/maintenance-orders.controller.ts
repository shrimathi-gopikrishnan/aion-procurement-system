import {
  Controller, Get, Post, Patch, Param, Body, Query,
  UseGuards, Request, ParseIntPipe,
} from '@nestjs/common';
import { MaintenanceOrdersService } from './maintenance-orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../database/entities/user.entity';
import { MoAction } from '../../database/entities/maintenance-order.entity';

@Controller('maintenance-orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MaintenanceOrdersController {
  constructor(private service: MaintenanceOrdersService) {}

  @Get()
  findAll(@Query() query: any) { return this.service.findAll(query); }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findOne(id); }

  @Get(':id/audit-trail')
  getAuditTrail(@Param('id', ParseIntPipe) id: number) { return this.service.getAuditTrail(id); }

  @Post()
  create(@Body() dto: { defectId: number; plannedWork?: string }, @Request() req) {
    return this.service.createFromDefect(dto.defectId, req.user.id, dto);
  }

  @Post('approve-defect')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  approveDefectAndCreateMO(
    @Body() dto: { defectId: number; decision: 'repair' | 'replace' | 'no_action'; notes?: string },
    @Request() req,
  ) {
    return this.service.createAndApproveFromDefect(dto.defectId, dto.decision, req.user.id, dto.notes);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: any, @Request() req) {
    return this.service.update(id, dto, req.user.id);
  }

  @Post(':id/approve')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  approve(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: { action: MoAction; actionReason?: string; plannedWork?: string },
    @Request() req,
  ) {
    return this.service.approve(id, req.user.id, dto);
  }

  @Post(':id/reject')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  reject(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: { reason: string },
    @Request() req,
  ) {
    return this.service.reject(id, req.user.id, dto.reason);
  }
}
