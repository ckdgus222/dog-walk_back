import { Module } from '@nestjs/common';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';

@Module({
  // 업로드 엔드포인트와 저장 로직을 한 모듈로 묶습니다.
  controllers: [MediaController],
  providers: [MediaService],
})
export class MediaModule {}
