// auth-service/src/auth/config/grpc-clients.config.ts
import { registerAs } from '@nestjs/config';
import { Transport } from '@nestjs/microservices';

export default registerAs('grpcClients', () => ({
  userService: {
    transport: Transport.GRPC,
    options: {
      package: 'user',
      protoPath: require.resolve(
        '@myapp/proto-contracts/proto/user/user.proto',
        
      ),
      url: process.env.USER_SERVICE_URL,
      loader: {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
      },
    },
  },

  notificationService: {
    transport: Transport.GRPC,
    options: {
      package: 'notification',
      protoPath: require.resolve(
        '@myapp/proto-contracts/proto/notification/notification.proto',
        
      ),
      url: process.env.NOTIFICATION_SERVICE_URL,
      loader: {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
      },
    },
  },
}));