import { Module } from '@nestjs/common';
import { ModuleCourseService } from './module-course.service';
import { ModuleCourseController } from './module-course.controller';

@Module({
  controllers: [ModuleCourseController],
  providers: [ModuleCourseService],
})
export class ModuleCourseModule {}
