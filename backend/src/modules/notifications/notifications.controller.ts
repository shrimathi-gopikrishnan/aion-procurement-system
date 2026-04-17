import {
  Controller, Get, Patch, Delete, Param, UseGuards, Request, ParseIntPipe,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private service: NotificationsService) {}

  @Get()
  getMyNotifications(@Request() req) {
    return this.service.getForUser(req.user.id);
  }

  @Get('unread-count')
  getUnreadCount(@Request() req) {
    return this.service.getUnreadCount(req.user.id).then((count) => ({ count }));
  }

  @Patch(':id/read')
  markRead(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.service.markRead(id, req.user.id);
  }

  @Patch('read-all')
  markAllRead(@Request() req) {
    return this.service.markAllRead(req.user.id);
  }

  @Delete(':id')
  deleteOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.service.deleteOne(id, req.user.id);
  }
}
