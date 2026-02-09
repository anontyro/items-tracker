import { AppController } from "./app.controller";
import { ImagesModule } from "./images/images.module";
import { Module } from "@nestjs/common";
import { PriceHistoryModule } from "./price-history/price-history.module";
import { PrismaModule } from "./prisma/prisma.module";
import { ProductsModule } from "./products/products.module";

@Module({
  imports: [PrismaModule, PriceHistoryModule, ProductsModule, ImagesModule],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
