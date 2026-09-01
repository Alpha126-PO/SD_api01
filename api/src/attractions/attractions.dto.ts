import { IsOptional, IsString } from 'class-validator';

// รับ query param ?district=...&category=...&openNow=true|false
// ตรงกับ contract ที่ทีมตกลงกันไว้ใน bruno/projectApi/Attractions code 200.yml
export class AttractionsQueryDto {
  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  openNow?: string;
}
