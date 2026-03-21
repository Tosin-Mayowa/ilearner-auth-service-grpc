import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { ClientsModule, GrpcOptions } from '@nestjs/microservices';
import { JwtModule } from '@nestjs/jwt';


@Module({
 imports: [ 
   JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('jwt.secret'),
        signOptions: {
         expiresIn: config.getOrThrow('jwt.expiresIn') as any
        },
      }),
    }),
  // gRPC client for UserService $ and NotificationService
    ClientsModule.registerAsync([
      {
        name: 'USER_SERVICE',
        inject: [ConfigService],
        useFactory: (config: ConfigService):GrpcOptions =>  config.getOrThrow<GrpcOptions>('grpcClients.userService'),
      },
      {
        name: 'NOTIFICATION_SERVICE',
        inject: [ConfigService],
        useFactory: (config: ConfigService):GrpcOptions => config.getOrThrow<GrpcOptions>('grpcClients.notificationService'),
      }
    ])],

  providers: [AuthService]
})
export class AuthModule {}
