import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VendorsController } from './vendors.controller';
import { VendorsService } from './vendors.service';
import { Vendor } from '../../database/entities/vendor.entity';
import { VendorItem } from '../../database/entities/vendor-item.entity';
import { Component } from '../../database/entities/component.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Vendor, VendorItem, Component])],
  controllers: [VendorsController],
  providers: [VendorsService],
  exports: [VendorsService],
})
export class VendorsModule {}
