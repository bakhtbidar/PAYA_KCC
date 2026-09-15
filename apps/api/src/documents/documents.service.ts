import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { TenantScopeService } from '../common/tenant-scope.service';
import { StorageService } from '../common/storage.service';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { CreateDocumentDto } from './dto/create-document.dto';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly scope: TenantScopeService,
    private readonly storage: StorageService,
  ) {}

  async listForRestaurant(restaurantId: string, user: AuthenticatedUser) {
    await this.scope.assertRestaurantAccess(user, restaurantId);
    return this.prisma.document.findMany({
      where: { restaurantId },
      include: { equipment: { select: { name: true, assetTag: true } }, uploadedBy: { select: { fullName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async upload(dto: CreateDocumentDto, file: Express.Multer.File, actor: AuthenticatedUser) {
    await this.scope.assertRestaurantAccess(actor, dto.restaurantId);

    const storagePath = await this.storage.save(dto.restaurantId, file.originalname, file.buffer);
    const document = await this.prisma.document.create({
      data: {
        restaurantId: dto.restaurantId,
        equipmentId: dto.equipmentId,
        uploadedByUserId: actor.userId,
        name: file.originalname,
        docType: dto.docType,
        storagePath,
        issueDate: dto.issueDate ? new Date(dto.issueDate) : undefined,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
        issuingBody: dto.issuingBody,
        notes: dto.notes,
      },
    });

    await this.audit.record({
      actorUserId: actor.userId,
      action: 'CREATE',
      entityType: 'Document',
      entityId: document.id,
      after: { name: document.name, docType: document.docType, restaurantId: dto.restaurantId },
    });

    return document;
  }

  async getForDownload(id: string, user: AuthenticatedUser) {
    const document = await this.prisma.document.findUnique({ where: { id } });
    if (!document) throw new NotFoundException('Document not found');
    await this.scope.assertRestaurantAccess(user, document.restaurantId);
    const stream = await this.storage.getStream(document.storagePath);
    return { document, stream };
  }
}
