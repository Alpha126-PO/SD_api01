import { Injectable, OnModuleDestroy } from "@nestjs/common";
import * as mysql from "mysql2/promise";

interface OpenStatus {
  label: string;
  isOpen: boolean | null;
}

@Injectable()
export class AttractionsService implements OnModuleDestroy {
  private pool: mysql.Pool;

  constructor() {
    // ต่อผ่าน Unix socket (เหมือนที่ load_to_mysql.js ใช้ตอนแก้ ECONNREFUSED)
    // ถ้าเครื่องคุณต่อผ่าน TCP ปกติได้ เปลี่ยนเป็น host: "localhost" แทนได้
    this.pool = mysql.createPool({
      socketPath: "/tmp/mysql.sock",
      user: "root",
      password: "224818",
      database: "bkk_tourism",
      charset: "utf8mb4_unicode_ci",
      connectionLimit: 5,
    });
  }

  async onModuleDestroy() {
    await this.pool.end();
  }

  /**
   * คำนวณสถานะเปิด/ปิด เทียบเวลาปัจจุบันกับ hours_text
   * รองรับรูปแบบง่ายๆ "HH:MM-HH:MM" ก่อน (ปรับ/เพิ่ม pattern ได้ตามข้อมูลจริงที่เติมเข้าไปทีหลัง)
   * ถ้าไม่มีข้อมูลเวลา (hours_text เป็น null) จะคืนค่า "ไม่ระบุเวลาเปิด-ปิด"
   */
  private computeOpenStatus(hoursText: string | null): OpenStatus {
    if (!hoursText) {
      return { label: "ไม่ระบุเวลาเปิด-ปิด", isOpen: null };
    }

    const match = hoursText.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
    if (!match) {
      return { label: "ไม่ระบุเวลาเปิด-ปิด", isOpen: null };
    }

    const openMinutes = parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
    const closeMinutes = parseInt(match[3], 10) * 60 + parseInt(match[4], 10);

    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    let isOpen: boolean;
    if (openMinutes <= closeMinutes) {
      // กรณีปกติ เช่น 08:00-17:00
      isOpen = nowMinutes >= openMinutes && nowMinutes <= closeMinutes;
    } else {
      // กรณีข้ามเที่ยงคืน เช่น 18:00-01:00
      isOpen = nowMinutes >= openMinutes || nowMinutes <= closeMinutes;
    }

    return { label: isOpen ? "เปิดอยู่" : "ปิดแล้ว", isOpen };
  }

  /**
   * ดึงรายการสถานที่ท่องเที่ยว กรองตามเขต/หมวดหมู่/toggle เปิดอยู่ตอนนี้ (ถ้าระบุ)
   * ตรงกับขั้นตอน "กรองตามหมวดหมู่ -> คำนวณเปิด/ปิด -> กรองตาม toggle -> เรียงตามตัวอักษร" ใน flowchart
   */
  async findAll(district?: string, category?: string, openNow?: boolean) {
    let sql = "SELECT * FROM attractions WHERE 1=1";
    const params: any[] = [];

    if (district) {
      sql += " AND district = ?";
      params.push(district);
    }
    if (category) {
      sql += " AND type = ?";
      params.push(category);
    }

    const [rows] = await this.pool.query(sql, params);

    let results = (rows as any[]).map((row) => {
      const status = this.computeOpenStatus(row.hours_text);
      return {
        id: row.db_id,
        name: row.name,
        type: row.type,
        district: row.district,
        address: row.address,
        phone: row.phone,
        googlemapUrl: row.googlemap_url,
        statusLabel: status.label,
        isOpen: status.isOpen,
      };
    });

    if (openNow) {
      results = results.filter((r) => r.isOpen === true);
    }

    // เรียงตามตัวอักษรไทย ก-ฮ ตามที่ออกแบบไว้
    results.sort((a, b) => a.name.localeCompare(b.name, "th"));

    return results;
  }

  /** ใช้สำหรับหน้าเลือกเขต (dropdown) — คืนรายชื่อเขตที่มีข้อมูลอยู่จริง พร้อมจำนวนสถานที่ */
  async listDistricts() {
    const [rows] = await this.pool.query(
      "SELECT district, COUNT(*) AS count FROM attractions GROUP BY district ORDER BY district"
    );
    return rows;
  }
}
