import { Module } from '@nestjs/common';

import { AuthController } from './auth/auth.controller';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config/';
import jwtConfig from './auth/config/jwt.config';
import grpcClientsConfig from './auth/config/grpc-clients.config';
import { validationSchema } from './auth/config/env.validation';

@Module({
  imports: [ConfigModule.forRoot({
    isGlobal: true,
    envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
    load: [grpcClientsConfig,jwtConfig],
    validationSchema: validationSchema,
  }), AuthModule],
  controllers: [AuthController],
  providers: [],
})
export class AppModule {}
