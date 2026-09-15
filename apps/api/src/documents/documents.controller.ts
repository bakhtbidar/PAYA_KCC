import { Body, Controller, Get, Param, Post, Query, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser, AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

@Controller('documents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get()
  list(@Query('restaurantId') restaurantId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.documents.listForRestaurant(restaurantId, user);
  }

  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES } }))
  upload(
    @Body() dto: CreateDocumentDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.documents.upload(dto, file, actor);
  }

  @Get(':id/download')
  async download(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Res() res: Response) {
    const { document, stream } = await this.documents.getForDownload(id, user);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(document.name)}"`);
    stream.pipe(res);
  }
}
