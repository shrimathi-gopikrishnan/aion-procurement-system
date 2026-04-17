import { Controller, Get, Param, Query, ParseIntPipe, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private service: DashboardService) {}

  @Get('summary') getSummary() { return this.service.getSummary(); }
  @Get('timeline/:id') getTimeline(@Param('id', ParseIntPipe) id: number) { return this.service.getTimeline(id); }
  @Get('inventory-status') getInventoryStatus() { return this.service.getInventoryStatus(); }
  @Get('audit-log') getAuditLog(@Query() query: any) { return this.service.getAuditLog(query); }
}
