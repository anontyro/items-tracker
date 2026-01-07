import { AppController } from "./app.controller";
import { Module } from "@nestjs/common";
import { PriceHistoryModule } from "./price-history/price-history.module";

@Module({
  imports: [PriceHistoryModule],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
