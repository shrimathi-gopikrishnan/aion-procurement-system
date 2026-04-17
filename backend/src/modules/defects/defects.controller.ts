import {
  Controller, Post, Get, Patch, Param, Query, Body,
  UseGuards, UseInterceptors, UploadedFile, ParseIntPipe, Request,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { DefectsService } from './defects.service';
import { DecisionEngineService } from '../../ai/decision-engine.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../database/entities/user.entity';

const uploadInterceptor = FileInterceptor('image', {
  storage: diskStorage({
    destination: process.env.UPLOAD_DIR || './uploads',
    filename: (_req, file, cb) => cb(null, `${uuidv4()}${extname(file.originalname)}`),
  }),
  limits: { fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB || '20')) * 1024 * 1024 },
});

@Controller('defects')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DefectsController {
  constructor(
    private service: DefectsService,
    private decisionEngine: DecisionEngineService,
  ) {}

  @Get()
  findAll(@Query() query: any) { return this.service.findAll(query); }

  @Get('pending-reviews')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  getPendingReviews() { return this.service.getPendingReviews(); }

  @Get('my')
  getMyDefects(@Request() req) { return this.service.getMyDefects(req.user.id); }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findOne(id); }

  @Get(':id/decision')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  async getDecision(@Param('id', ParseIntPipe) id: number) {
    const defect = await this.service.findOne(id);
    return this.decisionEngine.evaluate({
      component: defect.aiDetectedComponent || '',
      damageType: defect.damageType || '',
      severity: defect.severity as any,
      confidence: defect.aiConfidence || 0.5,
      aiDecision: defect.repairOrReplace,
    });
  }

  @Post('upload')
  @UseInterceptors(uploadInterceptor)
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
    @Body('componentId') componentId?: string,
  ) {
    return this.service.uploadAndAnalyze(
      file,
      req.user.id,
      componentId ? parseInt(componentId) : undefined,
    );
  }

  @Patch(':id/review')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  updateReview(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: any,
    @Request() req,
  ) {
    return this.service.updateReview(id, dto, req.user.id);
  }

  @Post(':id/request-resubmit')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  requestResubmit(
    @Param('id', ParseIntPipe) id: number,
    @Body('reason') reason: string,
    @Request() req,
  ) {
    return this.service.requestResubmit(id, reason, req.user.id);
  }

  @Post(':id/resubmit')
  @UseInterceptors(uploadInterceptor)
  resubmit(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
  ) {
    return this.service.resubmit(id, file, req.user.id);
  }
}
