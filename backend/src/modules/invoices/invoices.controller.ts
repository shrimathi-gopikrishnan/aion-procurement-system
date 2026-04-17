import {
  Controller, Get, Post, Param, Body, Query,
  UseGuards, ParseIntPipe, Request,
} from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../database/entities/user.entity';

@Controller('invoices')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InvoicesController {
  constructor(private service: InvoicesService) {}

  @Get()
  @Roles(UserRole.FINANCE, UserRole.PROCUREMENT_MANAGER, UserRole.ADMIN)
  findAll(@Query() query: any) { return this.service.findAll(query); }

  @Get(':id') findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findOne(id); }

  @Post()
  create(@Body() dto: any, @Request() req) { return this.service.create(dto, req.user.id); }

  @Post(':id/approve')
  @Roles(UserRole.FINANCE, UserRole.ADMIN)
  approve(@Param('id', ParseIntPipe) id: number, @Request() req) { return this.service.approve(id, req.user.id); }

  @Post(':id/pay')
  @Roles(UserRole.FINANCE, UserRole.ADMIN)
  pay(@Param('id', ParseIntPipe) id: number, @Request() req) { return this.service.markPaid(id, req.user.id); }

  @Post(':id/reject')
  @Roles(UserRole.FINANCE, UserRole.ADMIN)
  reject(@Param('id', ParseIntPipe) id: number, @Body() dto: { reason: string }, @Request() req) {
    return this.service.reject(id, req.user.id, dto.reason);
  }
}
