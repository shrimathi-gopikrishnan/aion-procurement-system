import {
  Controller, Get, Post, Param, Body,
  UseGuards, ParseIntPipe, Request,
} from '@nestjs/common';
import { GoodsReceiptsService } from './goods-receipts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../database/entities/user.entity';

@Controller('goods-receipts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GoodsReceiptsController {
  constructor(private service: GoodsReceiptsService) {}

  @Get()
  @Roles(UserRole.WAREHOUSE, UserRole.SUPERVISOR, UserRole.PROCUREMENT_MANAGER, UserRole.ADMIN)
  findAll() { return this.service.findAll(); }

  @Get(':id') findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findOne(id); }

  @Post()
  @Roles(UserRole.WAREHOUSE, UserRole.ADMIN)
  create(@Body() dto: any, @Request() req) {
    return this.service.create({ ...dto, receivedById: req.user.id });
  }
}
