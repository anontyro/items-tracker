import { AppController } from "./app.controller";
import { Module } from "@nestjs/common";
import { PriceHistoryModule } from "./price-history/price-history.module";
import { PrismaModule } from "./prisma/prisma.module";

@Module({
  imports: [PrismaModule, PriceHistoryModule],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
