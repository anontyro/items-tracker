import { Module } from "@nestjs/common";
import { PriceHistoryController } from "./price-history.controller";
import { PriceHistoryService } from "./price-history.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [PriceHistoryController],
  providers: [PriceHistoryService],
})
export class PriceHistoryModule {}
