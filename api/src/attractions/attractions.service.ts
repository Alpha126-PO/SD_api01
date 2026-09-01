import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AttractionEntity } from './attractions.entity';
import { AttractionsQueryDto } from './attractions.dto';

interface OpenStatus {
  label: string;
  isOpen: boolean | null;
}

@Injectable()
export class AttractionsService {
  constructor(
    @InjectRepository(AttractionEntity)
    private readonly attractionRepo: Repository<AttractionEntity>,
  ) {}

  /**
   * คำนวณสถานะเปิด/ปิด เทียบเวลาปัจจุบันกับ hours_text
   * ย้ายมาจาก attractions.service.ts เดิม (เวอร์ชัน mysql2 ตรงๆ) ตรรกะเหมือนเดิมทุกอย่าง
   */
  private computeOpenStatus(hoursText: string | null): OpenStatus {
    if (!hoursText) {
      return { label: 'ไม่ระบุเวลาเปิด-ปิด', isOpen: null };
    }

    const match = hoursText.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
    if (!match) {
      return { label: 'ไม่ระบุเวลาเปิด-ปิด', isOpen: null };
    }

    const openMinutes = parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
    const closeMinutes = parseInt(match[3], 10) * 60 + parseInt(match[4], 10);

    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    let isOpen: boolean;
    if (openMinutes <= closeMinutes) {
      isOpen = nowMinutes >= openMinutes && nowMinutes <= closeMinutes;
    } else {
      isOpen = nowMinutes >= openMinutes || nowMinutes <= closeMinutes;
    }

    return { label: isOpen ? 'เปิดอยู่' : 'ปิดแล้ว', isOpen };
  }

  /**
   * ดึงรายการสถานที่ท่องเที่ยว กรองตามเขต/หมวดหมู่/toggle เปิดอยู่ตอนนี้ (ถ้าระบุ)
   * ใช้ TypeORM QueryBuilder แทน mysql2 ตรงๆ (สไตล์เดียวกับ FloodRiskService)
   */
  async find(query: AttractionsQueryDto) {
    const qb = this.attractionRepo.createQueryBuilder('a');

    if (query.district) {
      qb.andWhere('a.district = :district', { district: query.district });
    }
    if (query.category) {
      qb.andWhere('a.type = :category', { category: query.category });
    }

    const rows = await qb.getMany();

    let results = rows.map((row) => {
      const status = this.computeOpenStatus(row.hoursText);
      return {
        id: row.id,
        name: row.name,
        type: row.type,
        district: row.district,
        address: row.address,
        phone: row.phone,
        googlemapUrl: row.googlemapUrl,
        statusLabel: status.label,
        isOpen: status.isOpen,
      };
    });

    if (query.openNow === 'true') {
      results = results.filter((r) => r.isOpen === true);
    }

    // เรียงตามตัวอักษรไทย ก-ฮ ตามที่ออกแบบไว้ใน flowchart
    results.sort((a, b) => a.name.localeCompare(b.name, 'th'));

    return results;
  }

  /** ใช้สำหรับหน้าเลือกเขต (dropdown) — คืนรายชื่อเขตที่มีข้อมูลอยู่จริง พร้อมจำนวนสถานที่ */
  async listDistricts() {
    return this.attractionRepo
      .createQueryBuilder('a')
      .select('a.district', 'district')
      .addSelect('COUNT(*)', 'count')
      .groupBy('a.district')
      .orderBy('a.district', 'ASC')
      .getRawMany();
  }
}
