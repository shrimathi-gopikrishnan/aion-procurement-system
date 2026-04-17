import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private service: ChatService) {}

  @Post()
  async chat(
    @Body() body: { message: string; history?: Array<{ role: 'user' | 'assistant'; content: string }> },
    @Request() req: any,
  ) {
    const response = await this.service.chat(
      body.message,
      req.user.role,
      req.user.id,
      body.history || [],
    );
    return { response };
  }
}
