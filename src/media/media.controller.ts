import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadMediaDto } from './dto/upload-media.dto';
import { MediaService } from './media.service';

@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
    }),
  )
  uploadImage(
    @UploadedFile() file: { buffer: Buffer; mimetype: string; size: number },
    @Body() uploadMediaDto: UploadMediaDto,
  ) {
    return this.mediaService.uploadImage(file, uploadMediaDto.purpose);
  }
}
