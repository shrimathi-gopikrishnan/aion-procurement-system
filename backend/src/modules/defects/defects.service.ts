import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Defect, DefectStatus } from '../../database/entities/defect.entity';
import { AiService } from '../../ai/ai.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class DefectsService {
  constructor(
    @InjectRepository(Defect) private repo: Repository<Defect>,
    private aiService: AiService,
    private eventEmitter: EventEmitter2,
  ) {}

  async findAll(query?: { status?: string; createdById?: number }) {
    const qb = this.repo.createQueryBuilder('d')
      .leftJoinAndSelect('d.component', 'component')
      .leftJoinAndSelect('d.createdBy', 'createdBy')
      .orderBy('d.createdAt', 'DESC');
    if (query?.status) qb.andWhere('d.status = :status', { status: query.status });
    if (query?.createdById) qb.andWhere('d.createdById = :uid', { uid: query.createdById });
    const defects = await qb.getMany();
    return defects.map((d) => {
      if (d.createdBy) delete (d.createdBy as any).passwordHash;
      return d;
    });
  }

  async findOne(id: number) {
    const defect = await this.repo.findOne({
      where: { id },
      relations: ['component', 'createdBy'],
    });
    if (!defect) throw new NotFoundException(`Defect #${id} not found`);
    if (defect.createdBy) delete (defect.createdBy as any).passwordHash;
    return defect;
  }

  async getMyDefects(userId: number) {
    const defects = await this.repo.createQueryBuilder('d')
      .leftJoinAndSelect('d.component', 'component')
      .where('d.createdById = :userId', { userId })
      .orderBy('d.createdAt', 'DESC')
      .getMany();
    return defects;
  }

  async uploadAndAnalyze(file: Express.Multer.File, userId: number, componentId?: number): Promise<Defect> {
    const imageUrl = `/uploads/${file.filename}`;
    const imagePath = file.path;

    const analysis = await this.aiService.analyzeDefectImage(imagePath);

    if (!analysis.isValidEquipment) {
      throw new BadRequestException(
        analysis.rejectionMessage ||
          'This image does not appear to show industrial equipment. Please upload a clear photo of the damaged component.',
      );
    }

    const defect = this.repo.create({
      componentId: componentId || null,
      aiDetectedComponent: analysis.detectedComponent,
      damageType: analysis.damageType,
      severity: analysis.severity as any,
      aiConfidence: analysis.confidence,
      aiExplanation: analysis.explanation,
      aiSuggestedAction: analysis.suggestedAction,
      repairOrReplace: analysis.repairOrReplace,
      repairReplaceRationale: analysis.repairReplaceRationale,
      riskScore: analysis.riskScore,
      rulesFired: JSON.stringify(analysis.rulesFired ?? []),
      imageUrl,
      imagePath,
      status: DefectStatus.PENDING_REVIEW,
      createdById: userId,
    });

    const saved = await this.repo.save(defect);
    this.eventEmitter.emit('defect.detected', { defectId: saved.id, severity: saved.severity });
    return saved;
  }

  async updateReview(
    id: number,
    dto: { supervisorNotes?: string; componentId?: number; damageType?: string; severity?: string },
    _supervisorId: number,
  ) {
    const defect = await this.findOne(id);
    Object.assign(defect, dto);
    defect.status = DefectStatus.REVIEWED;
    return this.repo.save(defect);
  }

  async requestResubmit(id: number, reason: string, supervisorId: number) {
    const defect = await this.findOne(id);
    if (defect.status === DefectStatus.LINKED_TO_MO) {
      throw new BadRequestException('Cannot request resubmit for a defect linked to an MO');
    }

    defect.status = DefectStatus.RESUBMIT_REQUESTED;
    defect.resubmitReason = reason;
    defect.resubmitRequestedAt = new Date();
    defect.resubmitRequestedById = supervisorId;
    const saved = await this.repo.save(defect);

    if (defect.createdById) {
      this.eventEmitter.emit('notification.create', {
        userId: defect.createdById,
        type: 'resubmit_request',
        title: 'Image Resubmission Required',
        message: `A supervisor has requested a new image for your reported defect #${id}. Reason: ${reason}`,
        entityType: 'defect',
        entityId: id,
        actionUrl: `/my-defects`,
        priority: 'high',
        isRead: false,
      });
    }

    return saved;
  }

  async resubmit(id: number, file: Express.Multer.File, userId: number) {
    const defect = await this.findOne(id);

    if (defect.status !== DefectStatus.RESUBMIT_REQUESTED) {
      throw new BadRequestException('Defect is not in resubmit-requested state');
    }
    if (defect.createdById !== userId) {
      throw new ForbiddenException('Only the original reporter can resubmit');
    }

    const imageUrl = `/uploads/${file.filename}`;
    const imagePath = file.path;
    const analysis = await this.aiService.analyzeDefectImage(imagePath);

    defect.imageUrl = imageUrl;
    defect.imagePath = imagePath;
    defect.aiDetectedComponent = analysis.detectedComponent;
    defect.damageType = analysis.damageType;
    defect.severity = analysis.severity as any;
    defect.aiConfidence = analysis.confidence;
    defect.aiExplanation = analysis.explanation;
    defect.aiSuggestedAction = analysis.suggestedAction;
    defect.repairOrReplace = analysis.repairOrReplace;
    defect.repairReplaceRationale = analysis.repairReplaceRationale;
    defect.riskScore = analysis.riskScore;
    defect.rulesFired = JSON.stringify(analysis.rulesFired ?? []);
    defect.status = DefectStatus.PENDING_REVIEW;

    const saved = await this.repo.save(defect);

    if (defect.resubmitRequestedById) {
      this.eventEmitter.emit('notification.create', {
        userId: defect.resubmitRequestedById,
        type: 'status_update',
        title: 'Image Resubmitted — Ready for Review',
        message: `Operator has resubmitted the image for Defect #${id}. New AI analysis is available.`,
        entityType: 'defect',
        entityId: id,
        actionUrl: `/defects/${id}`,
        priority: 'medium',
        isRead: false,
      });
    }

    return saved;
  }

  async getPendingReviews() {
    return this.repo.createQueryBuilder('d')
      .leftJoinAndSelect('d.component', 'component')
      .leftJoinAndSelect('d.createdBy', 'createdBy')
      .where('d.status IN (:...statuses)', {
        statuses: [DefectStatus.PENDING_REVIEW, DefectStatus.RESUBMITTED],
      })
      .orderBy('d.createdAt', 'ASC')
      .getMany();
  }
}
