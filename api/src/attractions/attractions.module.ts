import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttractionsController } from './attractions.controller';
import { AttractionsService } from './attractions.service';
import { AttractionEntity } from './attractions.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AttractionEntity])],
  controllers: [AttractionsController],
  providers: [AttractionsService],
})
export class AttractionsModule {}
