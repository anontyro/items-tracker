import { AppController } from "./app.controller";
import { ImagesModule } from "./images/images.module";
import { Module } from "@nestjs/common";
import { PriceHistoryModule } from "./price-history/price-history.module";
import { PrismaModule } from "./prisma/prisma.module";
import { ProductsModule } from "./products/products.module";
import { ScrapeStatusModule } from "./scrape-status/scrape-status.module";

@Module({
  imports: [
    PrismaModule,
    PriceHistoryModule,
    ProductsModule,
    ImagesModule,
    ScrapeStatusModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
