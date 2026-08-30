import { Module } from "@nestjs/common";
import { AttractionsController } from "./attractions.controller";
import { AttractionsService } from "./attractions.service";

@Module({
  controllers: [AttractionsController],
  providers: [AttractionsService],
})
export class AttractionsModule {}
