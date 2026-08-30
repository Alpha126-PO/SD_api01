import { Module } from "@nestjs/common";
import { AttractionsModule } from "./attractions/attractions.module";

@Module({
  imports: [AttractionsModule],
})
export class AppModule {}
