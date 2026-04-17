import {
  Controller, Get, Post, Patch, Param, Body, Query,
  UseGuards, ParseIntPipe,
} from '@nestjs/common';
import { VendorsService } from './vendors.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../database/entities/user.entity';

@Controller('vendors')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VendorsController {
  constructor(private service: VendorsService) {}

  @Get() findAll() { return this.service.findAll(); }
  @Get(':id') findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findOne(id); }

  @Get('search/by-component')
  searchByComponent(@Query('componentId') componentId: string) {
    return this.service.searchByComponent(parseInt(componentId));
  }

  @Post()
  @Roles(UserRole.PROCUREMENT_MANAGER, UserRole.ADMIN)
  create(@Body() dto: any) { return this.service.create(dto); }

  @Patch(':id')
  @Roles(UserRole.PROCUREMENT_MANAGER, UserRole.ADMIN)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: any) { return this.service.update(id, dto); }

  @Post('rank')
  rankVendors(@Body() dto: { componentId: number; componentName: string }) {
    return this.service.rankVendors(dto.componentId, dto.componentName);
  }

  @Post(':id/items')
  @Roles(UserRole.PROCUREMENT_MANAGER, UserRole.ADMIN)
  addItem(@Param('id', ParseIntPipe) id: number, @Body() dto: any) {
    return this.service.addVendorItem(id, dto);
  }

  @Patch('items/:id')
  @Roles(UserRole.PROCUREMENT_MANAGER, UserRole.ADMIN)
  updateItem(@Param('id', ParseIntPipe) id: number, @Body() dto: any) {
    return this.service.updateVendorItem(id, dto);
  }
}
