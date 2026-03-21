// auth-service/src/auth/auth.service.ts
import {
  Injectable,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import {
  LoginRequest,
  RegisterRequest,
  RefreshTokenRequest,
  ValidateTokenRequest,
  LogoutRequest,
  VerifyEmailRequest,
  ResendVerificationCodeRequest,
  NotificationServiceGrpcClient,
  UserServiceGrpcClient,
  UserWithPasswordGrpcResponse,
  UserGrpcResponse,
} from './interfaces/grpc-client.interface';

import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { ClientGrpc } from '@nestjs/microservices';
import { RpcException } from '@nestjs/microservices';
import { Inject } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { status } from '@grpc/grpc-js';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { JwtPayload, RefreshTokenPayload } from './interfaces/jwt-payload.interface';
import { UserRole } from './enums/user-role.enum';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);
  private userService: UserServiceGrpcClient;
  private notificationService: NotificationServiceGrpcClient;

  constructor(
    @Inject('USER_SERVICE')
    private readonly userClient: ClientGrpc,

    @Inject('NOTIFICATION_SERVICE')
    private readonly notificationClient: ClientGrpc,

    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit() {
    this.userService =
      this.userClient.getService<UserServiceGrpcClient>('UserService');
    this.notificationService =
      this.notificationClient.getService<NotificationServiceGrpcClient>(
        'NotificationService',
      );
  }

  // ─── LOGIN ────────────────────────────────────────────────────────────────
  async login(request: LoginRequest) {
    const { email, password, ip_address, user_agent } = request;

    this.logger.log(`Login attempt for email: ${email}`);

    let user: UserWithPasswordGrpcResponse;

    try {
      user = await firstValueFrom(
        this.userService.findByEmail({ email }),
      );
    } catch (error) {
      if (error?.code === status.NOT_FOUND) {
        throw new RpcException({
          code: status.UNAUTHENTICATED,
          message: 'Invalid email or password',
        });
      }
      this.logger.error(`findByEmail failed: ${error.message}`);
      throw new RpcException({
        code: status.INTERNAL,
        message: 'Authentication service unavailable',
      });
    }

    // ── Check account is active ──────────────────────────────────────
    if (!user.is_active) {
      throw new RpcException({
        code: status.PERMISSION_DENIED,
        message: 'Account is deactivated. Please contact support.',
      });
    }

    // ── Check email is verified ──────────────────────────────────────
    if (!user.email_verified) {
      throw new RpcException({
        code: status.PERMISSION_DENIED,
        message: 'Email not verified. Please check your email for the 6 digit verification code.',
        // ↑ tells frontend to redirect to verification page
      });
    }

    // ── Validate password ────────────────────────────────────────────
    const passwordValid = await bcrypt.compare(password, user.password_hash);

    if (!passwordValid) {
      this.logger.warn(`Failed login attempt for: ${email}`);
      throw new RpcException({
        code: status.UNAUTHENTICATED,
        message: 'Invalid email or password',
      });
    }

    const tokens = await this.generateTokenPair(user);

    this.sendLoginAlertAsync(user, ip_address, user_agent);

    this.logger.log(`Login successful for user: ${user.id}`);

    return {
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expires_in: tokens.expiresIn,
      user: {
        id: user.id,
        email: user.email,
        firstname: user.firstname,
        lastname: user.lastname,
        role: user.role,
        is_active: user.is_active,
        email_verified: user.email_verified,
        ...(user.matric_no && { matric_no: user.matric_no }),
        ...(user.department_id && { department_id: user.department_id }),
        ...(user.course_id && { course_id: user.course_id }),
        ...(user.level && { level: user.level }),
      },
    };
  }

  // ─── REGISTER ─────────────────────────────────────────────────────────────
  async register(request: RegisterRequest) {
    const {
      firstname,
      lastname,
      email,
      password,
      role,
      matric_no,
      no_of_trials,
      is_active,
      department_id,
      course_id,
      level,
    } = request;

    this.logger.log(`Registration attempt for email: ${email}`);

    if (!firstname || firstname.trim().length < 3) {
      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message: 'Firstname must be at least 3 characters long',
      });
    }

    if (!lastname || lastname.trim().length < 3) {
      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message: 'Lastname must be at least 3 characters long',
      });
    }

    if (!email || !this.isValidEmail(email)) {
      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message: 'A valid email address is required',
      });
    }

    if (!password || password.length < 8) {
      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message: 'Password must be at least 8 characters long',
      });
    }

    const resolvedRole = role || 'USER_ROLE_STUDENT';

    if (resolvedRole === 'USER_ROLE_STUDENT') {
      if (!matric_no) {
        throw new RpcException({
          code: status.INVALID_ARGUMENT,
          message: 'Matric number is required for students',
        });
      }
      if (!level) {
        throw new RpcException({
          code: status.INVALID_ARGUMENT,
          message: 'Level is required for students',
        });
      }
      if (!department_id) {
        throw new RpcException({
          code: status.INVALID_ARGUMENT,
          message: 'Department ID is required for students',
        });
      }
      if (!course_id) {
        throw new RpcException({
          code: status.INVALID_ARGUMENT,
          message: 'Course ID is required for students',
        });
      }
    }

    if (resolvedRole === 'USER_ROLE_INSTRUCTOR') {
      if (!course_id) {
        throw new RpcException({
          code: status.INVALID_ARGUMENT,
          message: 'Course ID is required for instructors',
        });
      }
    }

    // ── Check email availability ─────────────────────────────────────
    try {
      const existingUser = await firstValueFrom(
        this.userService.findByEmail({ email }),
      );
      if (existingUser?.id) {
        throw new RpcException({
          code: status.ALREADY_EXISTS,
          message: 'An account with this email already exists',
        });
      }
    } catch (error) {
      if (error instanceof RpcException) throw error;
      if (error?.code === status.NOT_FOUND) {
        // email does not exist — good, continue
      } else {
        this.logger.error(`Email check failed: ${error.message}`);
        throw new RpcException({
          code: status.INTERNAL,
          message: 'Registration service temporarily unavailable',
        });
      }
    }

    const passwordHash = await bcrypt.hash(password, 12);

    let newUser: UserGrpcResponse;

    try {
      newUser = await firstValueFrom(
        this.userService.createUser({
          firstname,
          lastname,
          email,
          password_hash: passwordHash,
          is_active: is_active ?? true,
          role: resolvedRole,
          ...(matric_no && { matric_no }),
          ...(no_of_trials !== undefined && { no_of_trials }),
          ...(department_id && { department_id }),
          ...(course_id && { course_id }),
          ...(level && { level }),
        }),
      );
    } catch (error) {
      if (error instanceof RpcException) throw error;
      this.logger.error(`createUser failed: ${error.message}`);
      throw new RpcException({
        code: status.INTERNAL,
        message: 'Failed to create user account',
      });
    }

    // ── Generate and store 6 digit verification code ─────────────────
    const verificationCode = this.generateSixDigitCode();
    // ↑ generates e.g. '483920'

    const codeExpiry = new Date();
    codeExpiry.setMinutes(codeExpiry.getMinutes() + 10);
    // ↑ code expires in 10 minutes from now

    try {
      await firstValueFrom(
        this.userService.saveVerificationCode({
          user_id: newUser.id,
          code: verificationCode,
          expiry: codeExpiry.toISOString(),
          // ↑ pass as ISO string over gRPC
        }),
      );
    } catch (error) {
      // do not fail registration if code storage fails
      // user can request resend
      this.logger.error(`Failed to save verification code: ${error.message}`);
    }

  
    this.sendVerificationCodeEmailAsync(
      newUser,
      verificationCode,
      resolvedRole,
    );

    // ── Send role specific welcome email ─────────────────────────────
    this.sendRegistrationNotificationsAsync(newUser, resolvedRole);

    this.logger.log(`Registration successful for user: ${newUser.id}`);

    return {
      user_id: newUser.id,
      email: newUser.email,
      firstname: newUser.firstname,
      lastname: newUser.lastname,
      role: newUser.role,
      message:
        'Registration successful. A 6 digit verification code has been sent to your email.',
    };
  }

  // ─── VERIFY EMAIL ─────────────────────────────────────────────────────────
  async verifyEmail(request: VerifyEmailRequest) {
    const { email, code } = request;

    this.logger.log(`Email verification attempt for: ${email}`);

    // ── Step 1: Verify code in user-service ──────────────────────────
    let verifyResult: { user_id: string; email: string };

    try {
      verifyResult = await firstValueFrom(
        this.userService.verifyEmailCode({ email, code }),
     
      );
    } catch (error) {
      if (error instanceof RpcException) throw error;
    

      this.logger.error(`verifyEmailCode failed: ${error.message}`);
      throw new RpcException({
        code: status.INTERNAL,
        message: 'Verification service temporarily unavailable',
      });
    }

    // ── Step 2: Mark email as verified ──────────────────────────────
    try {
      await firstValueFrom(
        this.userService.markEmailVerified({
          user_id: verifyResult.user_id,
        }),
       
      );
    } catch (error) {
      this.logger.error(`markEmailVerified failed: ${error.message}`);
      throw new RpcException({
        code: status.INTERNAL,
        message: 'Failed to complete verification',
      });
    }

    this.logger.log(`Email verified for user: ${verifyResult.user_id}`);

    return {
      success: true,
      message: 'Email verified successfully. You can now login.',
    };
  }

  // ─── RESEND VERIFICATION CODE ─────────────────────────────────────────────
  async resendVerificationCode(request: ResendVerificationCodeRequest) {
    const { email } = request;

    this.logger.log(`Resend verification code for: ${email}`);

    // ── Step 1: Find user ────────────────────────────────────────────
    let user: UserWithPasswordGrpcResponse;

    try {
      user = await firstValueFrom(
        this.userService.findByEmail({ email }),
      );
    } catch (error) {
      if (error?.code === status.NOT_FOUND) {
        throw new RpcException({
          code: status.NOT_FOUND,
          message: 'No account found with this email address',
        });
      }
      throw new RpcException({
        code: status.INTERNAL,
        message: 'Service temporarily unavailable',
      });
    }

    // ── Step 2: Check if already verified ───────────────────────────
    if (user.email_verified) {
      throw new RpcException({
        code: status.ALREADY_EXISTS,
        message: 'Email is already verified. Please login.',
      });
    }

    // ── Step 3: Generate new code ────────────────────────────────────
    const verificationCode = this.generateSixDigitCode();

    const codeExpiry = new Date();
    codeExpiry.setMinutes(codeExpiry.getMinutes() + 10);
    // ↑ fresh 10 minute window from now
    // old code is replaced by new code

    try {
      await firstValueFrom(
        this.userService.saveVerificationCode({
          user_id: user.id,
          code: verificationCode,
          expiry: codeExpiry.toISOString(),
        }),
      );
    } catch (error) {
      this.logger.error(`Failed to save new verification code: ${error.message}`);
      throw new RpcException({
        code: status.INTERNAL,
        message: 'Failed to generate new verification code',
      });
    }

    // ── Step 4: Send new code email ──────────────────────────────────
    this.sendVerificationCodeEmailAsync(user, verificationCode, user.role);

    return {
      success: true,
      message: 'A new 6 digit verification code has been sent to your email.',
    };
  }

  // ─── VALIDATE TOKEN ───────────────────────────────────────────────────────
  async validateToken(request: ValidateTokenRequest) {
    try {
      const payload = this.jwtService.verify<JwtPayload>(request.token, {
        secret: this.configService.getOrThrow<string>('jwt.secret'),
      });
      return {
        valid: true,
        user_id: payload.sub,
        email: payload.email,
        roles: [payload.role],
      };
    } catch (error) {
      this.logger.warn(`Token validation failed: ${error.message}`);
      return {
        valid: false,
        user_id: '',
        email: '',
        roles: [],
      };
    }
  }

  // ─── REFRESH TOKEN ────────────────────────────────────────────────────────
  async refreshToken(request: RefreshTokenRequest) {
    let payload: RefreshTokenPayload;

    try {
      payload = this.jwtService.verify<RefreshTokenPayload>(
        request.refresh_token,
        {
          secret: this.configService.getOrThrow<string>('jwt.refreshSecret'),
        },
      );
    } catch (error) {
      this.logger.warn(`Refresh token verification failed: ${error.message}`);
      throw new RpcException({
        code: status.UNAUTHENTICATED,
        message: 'Invalid or expired refresh token. Please login again.',
      });
    }

    let user: UserGrpcResponse;

    try {
      user = await firstValueFrom(
        this.userService.findById({ id: payload.sub }),
      );
    } catch (error) {
      if (error?.code === status.NOT_FOUND) {
        throw new RpcException({
          code: status.UNAUTHENTICATED,
          message: 'User account no longer exists',
        });
      }
      throw new RpcException({
        code: status.INTERNAL,
        message: 'Failed to refresh token',
      });
    }

    if (!user.is_active) {
      throw new RpcException({
        code: status.PERMISSION_DENIED,
        message: 'Account is deactivated. Please contact support.',
      });
    }

    const tokens = await this.generateTokenPair(user);

    this.logger.log(`Token refreshed for user: ${user.id}`);

    return {
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expires_in: tokens.expiresIn,
    };
  }

  // ─── LOGOUT ───────────────────────────────────────────────────────────────
  async logout(request: LogoutRequest) {
    const { user_id, refresh_token } = request;

    try {
      const decoded = this.jwtService.decode<RefreshTokenPayload>(refresh_token);
      this.logger.log(
        `User ${user_id} logged out. Token ID: ${decoded?.tokenId}`,
      );
    } catch {
      this.logger.log(`User ${user_id} logged out`);
    }

    return { success: true };
  }

  // ─── PRIVATE HELPERS ──────────────────────────────────────────────────────

  private generateSixDigitCode(): string {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    // ↑ Math.random() produces 0 to 0.999...
    // * 900000 gives 0 to 899999.999
    // + 100000 gives 100000 to 999999.999
    // Math.floor removes decimal → 100000 to 999999
    // toString() converts to string → '100000' to '999999'
    // always 6 digits — never 5 digits or less
    return code;
  }

  private async generateTokenPair(
    user: UserGrpcResponse | UserWithPasswordGrpcResponse,
  ) {
    const jwtPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      firstname: user.firstname,
      lastname: user.lastname,
      role: user.role as UserRole,
      is_active: user.is_active,
      ...(user.matric_no && { matric_no: user.matric_no }),
      ...(user.department_id && { department_id: user.department_id }),
      ...(user.course_id && { course_id: user.course_id }),
      ...(user.level && { level: user.level }),
    };

    const refreshPayload: RefreshTokenPayload = {
      sub: user.id,
      tokenId: uuidv4(),
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(jwtPayload),
      this.jwtService.signAsync(refreshPayload, {
        secret: this.configService.getOrThrow<string>('jwt.refreshSecret'),
        expiresIn: this.configService.getOrThrow('jwt.refreshExpiresIn') as any,
      }),
    ]);

    return { accessToken, refreshToken, expiresIn: 900 };
  }

  private sendVerificationCodeEmailAsync(
    user: UserGrpcResponse | UserWithPasswordGrpcResponse,
    code: string,
    role: string,
  ): void {
    firstValueFrom(
      this.notificationService.sendEmailVerification({
        user_id: user.id,
        email: user.email,
        firstname: user.firstname,
        verification_code: code,
        // ↑ passing code not token now
        role,
      }),
    ).catch((err) => {
      this.logger.error(
        `Verification code email failed for ${user.email}: ${err.message}`,
      );
    });
  }

  private sendLoginAlertAsync(
    user: UserWithPasswordGrpcResponse,
    ipAddress?: string,
    userAgent?: string,
  ): void {
    firstValueFrom(
      this.notificationService.sendLoginAlert({
        user_id: user.id,
        email: user.email,
        firstname: user.firstname,
        ip_address: ipAddress || 'unknown',
        user_agent: userAgent || 'unknown',
        login_time: new Date().toISOString(),
      }),
    ).catch((err) => {
      this.logger.error(`Login alert failed: ${err.message}`);
    });
  }

  private sendRegistrationNotificationsAsync(
    user: UserGrpcResponse,
    role: string,
  ): void {
   

    const notifications: Promise<any>[] = [];

    switch (role) {
      case 'USER_ROLE_STUDENT':
        notifications.push(
          firstValueFrom(
            this.notificationService.sendStudentWelcomeEmail({
              user_id: user.id,
              email: user.email,
              firstname: user.firstname,
              lastname: user.lastname,
              matric_no: user.matric_no,
              level: user.level,
              department_id: user.department_id,
              course_id: user.course_id,
            }),
          ),
        );
        break;

      case 'USER_ROLE_INSTRUCTOR':
        notifications.push(
          firstValueFrom(
            this.notificationService.sendInstructorWelcomeEmail({
              user_id: user.id,
              email: user.email,
              firstname: user.firstname,
              lastname: user.lastname,
              course_id: user.course_id,
              department_id: user.department_id,
            }),
          ),
        );
        break;

      default:
        notifications.push(
          firstValueFrom(
            this.notificationService.sendWelcomeEmail({
              user_id: user.id,
              email: user.email,
              firstname: user.firstname,
              role,
            }),
          ),
        );
    }

    Promise.all(notifications).catch((err) => {
      this.logger.error(
        `Registration notifications failed for ${user.id}: ${err.message}`,
      );
    });
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
