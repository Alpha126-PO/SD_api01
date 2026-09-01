import { Controller, Get, Query } from '@nestjs/common';
import { AttractionsService } from './attractions.service';
import { AttractionsQueryDto } from './attractions.dto';

@Controller('attractions')
export class AttractionsController {
  constructor(private readonly service: AttractionsService) {}

  /**
   * GET /attractions?district=บางรัก&category=วัด&openNow=false
   * ตรงกับ contract ที่ทีมตกลงกันไว้ใน bruno/projectApi/Attractions code 200.yml
   */
  @Get()
  async getAttractions(@Query() query: AttractionsQueryDto) {
    return this.service.find(query);
  }

  /** GET /attractions/districts -> รายชื่อเขตทั้งหมดที่มีข้อมูล ใช้ทำ dropdown เลือกเขต */
  @Get('districts')
  async getDistricts() {
    return this.service.listDistricts();
  }
}
