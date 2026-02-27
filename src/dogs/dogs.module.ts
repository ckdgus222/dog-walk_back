import { Module } from '@nestjs/common';
import { DogsController } from './dogs.controller';
import { DogsService } from './dogs.service';

@Module({
  // Dogs 도메인 라우팅/비즈니스 로직을 묶는 모듈입니다.
  controllers: [DogsController],
  providers: [DogsService],
})
export class DogsModule {}
