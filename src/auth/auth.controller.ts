// auth-service/src/auth/auth.controller.ts
import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { AuthService } from './auth.service';
import type {
  LoginRequest,
  RegisterRequest,
  ValidateTokenRequest,
  RefreshTokenRequest,
  LogoutRequest,
  VerifyEmailRequest,
  ResendVerificationCodeRequest,
} from './interfaces/grpc-client.interface';


@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @GrpcMethod('AuthService', 'Login')
  async login(request: LoginRequest) {
    return this.authService.login(request);
  }

  @GrpcMethod('AuthService', 'Register')
  async register(request: RegisterRequest) {
    return this.authService.register(request);
  }

  @GrpcMethod('AuthService', 'ValidateToken')
  async validateToken(request: ValidateTokenRequest) {
    return this.authService.validateToken(request);
  }

  @GrpcMethod('AuthService', 'RefreshToken')
  async refreshToken(request: RefreshTokenRequest) {
    return this.authService.refreshToken(request);
  }


  @GrpcMethod('AuthService', 'Logout')
  async logout(request: LogoutRequest) {
    return this.authService.logout(request);
  }
  
   @GrpcMethod('AuthService', 'VerifyEmail')
  async verifyEmail(request: VerifyEmailRequest) {
    return this.authService.verifyEmail(request);
  }

  @GrpcMethod('AuthService', 'ResendVerificationCode')
  async resendVerificationCode(request: ResendVerificationCodeRequest) {
    return this.authService.resendVerificationCode(request);
  }
}