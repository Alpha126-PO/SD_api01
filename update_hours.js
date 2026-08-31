
const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");
const mysql = require("mysql2/promise");

const DB_CONFIG = {
  socketPath: "/tmp/mysql.sock",
  user: "root",
  password: "224818",
  database: "bkk_tourism",
  charset: "utf8mb4_unicode_ci",
};

const HOURS_FILE = path.join(__dirname, "data", "hours_supplement.csv");

const UPDATE_SQL = `
UPDATE attractions
SET hours_text = ?
WHERE district = ? AND name = ?
`;

async function main() {
  if (!fs.existsSync(HOURS_FILE)) {
    console.error(`ไม่พบไฟล์ ${HOURS_FILE} — เอา hours_supplement.csv ไปวางในโฟลเดอร์ data/ ก่อนนะ`);
    process.exit(1);
  }

  const csvContent = fs.readFileSync(HOURS_FILE, "utf-8");
  const records = parse(csvContent, { columns: true, skip_empty_lines: true });

  const conn = await mysql.createConnection(DB_CONFIG);

  let updated = 0;
  let skippedNoMatch = 0;
  let skippedNoData = 0;

  for (const row of records) {
    const district = (row.district || "").trim();
    const name = (row.name || "").trim();
    const hours = (row.hours_text || "").trim();

    // ข้ามแถวที่ยังไม่พบข้อมูลเวลา (ไม่เขียนทับด้วยคำว่า "ไม่พบข้อมูล" ลงตาราง
    // ปล่อยเป็น NULL ไว้ ฝั่ง API จะจัดการแสดงเป็น "ไม่ระบุเวลาเปิด-ปิด" เองอยู่แล้ว)
    if (!hours || hours === "ไม่พบข้อมูล") {
      skippedNoData++;
      continue;
    }

    const [result] = await conn.execute(UPDATE_SQL, [hours, district, name]);
    if (result.affectedRows > 0) {
      updated++;
    } else {
      skippedNoMatch++;
      console.warn(`  ! ไม่พบแถวที่ตรงกันในตาราง: [${district}] ${name}`);
    }
  }

  console.log(`อัปเดตเวลาเปิด-ปิดสำเร็จ: ${updated} แถว`);
  console.log(`ยังไม่มีข้อมูลเวลา (ข้ามไว้): ${skippedNoData} แถว`);
  if (skippedNoMatch > 0) {
    console.log(`ไม่เจอชื่อ/เขตที่ตรงกันในตาราง (ตรวจชื่อดูอีกที): ${skippedNoMatch} แถว`);
  }

  await conn.end();
}

main().catch((err) => {
  console.error("เกิดข้อผิดพลาด:", err);
  process.exit(1);
});
