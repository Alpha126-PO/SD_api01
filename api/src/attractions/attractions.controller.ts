import { Controller, Get, Query } from "@nestjs/common";
import { AttractionsService } from "./attractions.service";

@Controller("attractions")
export class AttractionsController {
  constructor(private readonly attractionsService: AttractionsService) {}

  /**
   * GET /attractions?district=ตลิ่งชัน&category=วัด&openNow=true
   * ตรงกับ "เลือกเขต + หมวดหมู่ + toggle เปิดอยู่ตอนนี้" ในหน้าแอป
   */
  @Get()
  findAll(
    @Query("district") district?: string,
    @Query("category") category?: string,
    @Query("openNow") openNow?: string
  ) {
    return this.attractionsService.findAll(district, category, openNow === "true");
  }

  /** GET /attractions/districts -> รายชื่อเขตทั้งหมดที่มีข้อมูล ใช้ทำ dropdown เลือกเขต */
  @Get("districts")
  listDistricts() {
    return this.attractionsService.listDistricts();
  }
}
