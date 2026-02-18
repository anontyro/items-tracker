import { FrontendApiKeyGuard } from "../common/frontend-api-key.guard";
import { ImagesController } from "./images.controller";
import { ImagesService } from "./images.service";
import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { ScraperApiKeyGuard } from "../common/scraper-api-key.guard";

@Module({
  imports: [PrismaModule],
  controllers: [ImagesController],
  providers: [ImagesService, FrontendApiKeyGuard, ScraperApiKeyGuard],
})
export class ImagesModule {}
