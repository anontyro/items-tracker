import { FrontendApiKeyGuard } from "../common/frontend-api-key.guard";
import { ImagesController } from "./images.controller";
import { ImagesService } from "./images.service";
import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [ImagesController],
  providers: [ImagesService, FrontendApiKeyGuard],
})
export class ImagesModule {}
