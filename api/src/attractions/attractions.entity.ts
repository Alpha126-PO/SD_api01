import { Entity, Column, PrimaryColumn } from 'typeorm';

// ผูกกับตาราง attractions ใน schema BkkData (คอลัมน์ตามที่ load_to_mysql.js สร้างไว้)
@Entity('attractions')
export class AttractionEntity {
  @PrimaryColumn({ name: 'db_id' })
  id: number;

  @Column({ name: 'source_id' })
  sourceId: number;

  @Column({ name: 'name' })
  name: string;

  @Column({ name: 'type' })
  type: string;

  @Column({ name: 'district' })
  district: string;

  @Column({ name: 'address', type: 'text' })
  address: string;

  @Column({ name: 'phone' })
  phone: string;

  @Column({ name: 'googlemap_url' })
  googlemapUrl: string;

  @Column({ name: 'hours_text', nullable: true })
  hoursText: string | null;

  @Column({ name: 'photo_url', nullable: true })
  photoUrl: string | null;
}
