import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { DefectsController } from './defects.controller';
import { DefectsService } from './defects.service';
import { Defect } from '../../database/entities/defect.entity';
import { Component } from '../../database/entities/component.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Defect, Component]),
    MulterModule.register({ dest: process.env.UPLOAD_DIR || './uploads' }),
  ],
  controllers: [DefectsController],
  providers: [DefectsService],
  exports: [DefectsService],
})
export class DefectsModule {}
