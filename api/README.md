# BKK Attractions API

NestJS API สำหรับฟีเจอร์แนะนำสถานที่ท่องเที่ยว อ่านข้อมูลจากตาราง `attractions`
ใน MySQL (schema `BkkData`) ผ่าน TypeORM

## วิธีติดตั้งและรัน

1. ติดตั้ง dependencies
   npm install

2. คัดลอก .env.example เป็น .env แล้วกรอกค่าให้ตรงกับเครื่องตัวเอง
   cp .env.example .env

3. รัน
   npm start

4. ทดสอบที่เบราว์เซอร์
   http://localhost:3000/attractions
   http://localhost:3000/attractions/districts
