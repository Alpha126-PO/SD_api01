
const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");
const mysql = require("mysql2/promise");

// ---------- ตั้งค่าการเชื่อมต่อ MySQL ----------
const DB_CONFIG = {
  socketPath: "/tmp/mysql.sock", // ถ้าเครื่องคุณต่อผ่าน TCP ได้ปกติ เปลี่ยนเป็น host:"localhost" แทนได้
  user: "root",
  password: "224818",
  database: "bkk_tourism",
  charset: "utf8mb4_unicode_ci",
};

const DATA_DIR = path.join(__dirname, "data");

// แผนที่ไฟล์ -> ชื่อเขต เพิ่มเขตใหม่แค่เพิ่มบรรทัดที่นี่
const DISTRICT_FILES = {
  "attractions_samphanthawong.csv": "สัมพันธวงศ์",
  "attractions_talingchan.csv": "ตลิ่งชัน",
  "attractions_lat_krabang.csv": "ลาดกระบัง",
  "attractions_chatuchak.csv": "จตุจักร",
  "attractions_bang _khun_thian.csv": "บางขุนเทียน",
  "attractions_bang _khen.csv": "บางเขน",
  "attractions_khlong_toei.csv": "คลองเตย",
  "attractions_khlong_san.csv": "คลองสาน",
  "attractions_chom_thong.csv": "จอมทอง",
  "attractions_don_mueang.csv": "ดอนเมือง",
  "attractions_thung_khru.csv": "ทุ่งครุ",
  "attractions_bang_khae.csv": "บางแค",
  "attractions_thonburi.csv": "ธนบุรี",
  "attractions_bang_sue.csv": "บางซื่อ",
  "attractions_bang_na.csv": "บางนา",
  "attractions_bang_bon.csv": "บางบอน",
  "attractions_bueng_kum.csv": "บึ่งกุ่ม",




};

/** แยกที่อยู่กับเบอร์โทรออกจากช่อง contact เดิม (ตัดตรงคำว่า "โทร.") */
function splitContact(contact) {
  contact = (contact || "").trim();
  const match = contact.match(/โทร\.?\s*(.+)$/);
  if (match) {
    const phone = match[1].trim();
    const address = contact.slice(0, match.index).trim();
    return { address, phone };
  }
  return { address: contact, phone: "" };
}

/**
 * ไฟล์แต่ละเขตจาก data.bangkok.go.th ตั้งชื่อคอลัมน์ไม่เหมือนกัน
 * (เช่น เขตนึงใช้ name/type อีกเขตใช้ c_name/c_type) ฟังก์ชันนี้แปลงให้เป็นรูปแบบเดียวกัน
 * และถ้าไฟล์ไม่มีคอลัมน์ id เลย ให้ใช้ลำดับแถวในไฟล์แทน (เริ่ม 1)
 */
function normalizeRow(row, index) {
  const name = (row.name ?? row.c_name ?? "").trim();
  const type = (row.type ?? row.c_type ?? "").trim();
  const contact = row.contact ?? "";
  const googlemap = (row.googlemap ?? row.googlemap_url ?? "").trim();
  const sourceId = row.id ? parseInt(row.id, 10) : index + 1;
  return { sourceId, name, type, contact, googlemap };
}

// id ในแต่ละไฟล์ CSV นับ 1,2,3... ใหม่ทุกไฟล์ (ไม่ใช่เลข unique ทั้งเมือง)
// เก็บไว้ในคอลัมน์ source_id แทน ให้ MySQL สร้าง primary key ของตัวเอง (db_id)
// และกันข้อมูลซ้ำด้วย UNIQUE KEY (source_id, district)
const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS attractions (
    db_id INT AUTO_INCREMENT PRIMARY KEY,
    source_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(255),
    district VARCHAR(100),
    address TEXT,
    phone VARCHAR(255),
    googlemap_url VARCHAR(500),
    hours_text VARCHAR(255) DEFAULT NULL,   -- เติมเองภายหลัง (BKK ไม่มีข้อมูลนี้) //เติมแล้ว
    photo_url VARCHAR(500) DEFAULT NULL,    -- เติมเองภายหลัง (BKK ไม่มีข้อมูลนี้)
    UNIQUE KEY uniq_source_district (source_id, district)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
`;

const INSERT_SQL = `
INSERT INTO attractions (source_id, name, type, district, address, phone, googlemap_url)
VALUES (?, ?, ?, ?, ?, ?, ?)
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    type = VALUES(type),
    address = VALUES(address),
    phone = VALUES(phone),
    googlemap_url = VALUES(googlemap_url);
`;

async function loadDistrictFile(conn, filename, districtName) {
  const filePath = path.join(DATA_DIR, filename);
  const csvContent = fs.readFileSync(filePath, "utf-8");
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
  });

  for (let i = 0; i < records.length; i++) {
    const { sourceId, name, type, contact, googlemap } = normalizeRow(records[i], i);
    const { address, phone } = splitContact(contact);
    await conn.execute(INSERT_SQL, [sourceId, name, type, districtName, address, phone, googlemap]);
  }

  console.log(`  - เขต${districtName}: ${records.length} แถว (จาก ${filename})`);
}

async function main() {
  const conn = await mysql.createConnection(DB_CONFIG);
  await conn.query(CREATE_TABLE_SQL);

  console.log("กำลังโหลดข้อมูลจากโฟลเดอร์ data/ ...");
  for (const [filename, districtName] of Object.entries(DISTRICT_FILES)) {
    const filePath = path.join(DATA_DIR, filename);
    if (!fs.existsSync(filePath)) {
      console.warn(`  ! ไม่พบไฟล์ ${filename} ใน data/ ข้ามไปก่อน`);
      continue;
    }
    await loadDistrictFile(conn, filename, districtName);
  }

  console.log("โหลดข้อมูลเข้า MySQL สำเร็จทั้งหมด");
  await conn.end();
}

main().catch((err) => {
  console.error("เกิดข้อผิดพลาด:", err);
  process.exit(1);
});
