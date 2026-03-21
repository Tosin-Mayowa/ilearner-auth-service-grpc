// auth-service/src/auth/interfaces/jwt-payload.interface.ts
import { UserRole } from "../enums/user-role.enum";

export interface JwtPayload {
  sub: string;

  iat?: number;

  exp?: number;

  email: string;

  firstname: string;

  lastname: string;

  role: UserRole;

  matric_no?: string;

  department_id?: string;

  course_id?: string;

  level?: string;

  is_active: boolean;
}

export interface RefreshTokenPayload {
  sub: string;

  tokenId: string;

  iat?: number;
  exp?: number;
}
