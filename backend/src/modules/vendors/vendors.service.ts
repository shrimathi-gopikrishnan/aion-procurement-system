import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vendor } from '../../database/entities/vendor.entity';
import { VendorItem } from '../../database/entities/vendor-item.entity';
import { AiService } from '../../ai/ai.service';

@Injectable()
export class VendorsService {
  constructor(
    @InjectRepository(Vendor) private vendorRepo: Repository<Vendor>,
    @InjectRepository(VendorItem) private itemRepo: Repository<VendorItem>,
    private aiService: AiService,
  ) {}

  findAll() { return this.vendorRepo.find({ order: { name: 'ASC' } }); }

  async findOne(id: number) {
    const v = await this.vendorRepo.findOne({ where: { id }, relations: ['items', 'items.component'] });
    if (!v) throw new NotFoundException(`Vendor #${id} not found`);
    return v;
  }

  create(dto: any) { return this.vendorRepo.save(this.vendorRepo.create(dto)); }

  async update(id: number, dto: any) {
    const v = await this.findOne(id);
    Object.assign(v, dto);
    return this.vendorRepo.save(v);
  }

  async searchByComponent(componentId: number) {
    const items = await this.itemRepo.find({
      where: { componentId, isAvailable: true },
      relations: ['vendor', 'component'],
    });
    return items.filter((i) => i.vendor?.status === 'active');
  }

  async rankVendors(componentId: number, componentName: string) {
    const vendorItems = await this.searchByComponent(componentId);
    if (!vendorItems.length) {
      return { vendors: [], ranking: [], recommendation: 'No vendors available for this component.' };
    }
    const vendorData = vendorItems.map((vi) => ({
      id: vi.vendor.id,
      name: vi.vendor.name,
      price: vi.price,
      deliveryDays: vi.deliveryDays,
      rating: vi.vendor.rating,
      reliabilityScore: vi.vendor.reliabilityScore,
      onTimeDeliveryRate: vi.vendor.onTimeDeliveryRate,
    }));
    const aiResult = await this.aiService.rankVendors({ componentName, vendors: vendorData });
    return { vendors: vendorItems, ranking: aiResult.ranking, recommendation: aiResult.recommendation };
  }

  addVendorItem(vendorId: number, dto: any) {
    return this.itemRepo.save(this.itemRepo.create({ ...dto, vendorId }));
  }

  async updateVendorItem(id: number, dto: any) {
    await this.itemRepo.update(id, dto);
    return this.itemRepo.findOne({ where: { id }, relations: ['component'] });
  }
}
