import { FrontendApiKeyGuard } from "../common/frontend-api-key.guard";
import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { ProductsController } from "./products.controller";
import { ProductsService } from "./products.service";

@Module({
  imports: [PrismaModule],
  controllers: [ProductsController],
  providers: [ProductsService, FrontendApiKeyGuard],
})
export class ProductsModule {}
