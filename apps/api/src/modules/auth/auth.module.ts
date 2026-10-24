import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { FeatureGuard } from '../../common/guards/feature.guard';

@Module({
  controllers: [AuthController],
  providers: [AuthService, FeatureGuard],
  exports: [AuthService, FeatureGuard],
})
export class AuthModule {}
