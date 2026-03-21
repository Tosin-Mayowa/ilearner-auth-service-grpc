// auth-service/src/auth/interfaces/grpc-client.interface.ts
import { Observable } from 'rxjs';

export interface UserServiceGrpcClient {
  // ─── existing methods — keep all of these ─────────────────────────
  findByEmail(data: { email: string }): Observable<UserWithPasswordGrpcResponse>;
  findById(data: { id: string }): Observable<UserGrpcResponse>;
  findByMatricNo(data: { matric_no: string }): Observable<UserGrpcResponse>;
  findByDepartmentId(data: FindByDepartmentIdRequest): Observable<UserListGrpcResponse>;
  // ↑ duplicate removed — only one findByDepartmentId now
  findByCourseId(data: FindByCourseIdRequest): Observable<UserListGrpcResponse>;
  findActiveUsers(data: FindActiveUsersRequest): Observable<UserListGrpcResponse>;
  findByRole(data: { role: string }): Observable<UserListGrpcResponse>;
  findByDepartmentAndRole(data: FindByDepartmentAndRoleRequest): Observable<UserListGrpcResponse>;
  findByCourseAndRole(data: FindByCourseAndRoleRequest): Observable<UserListGrpcResponse>;
  createUser(data: CreateUserGrpcRequest): Observable<UserGrpcResponse>;
  updateUser(data: UpdateUserGrpcRequest): Observable<UpdateUserResponse>;
  deleteUser(data: DeleteUserGrpcRequest): Observable<DeleteUserResponse>;
  updatePassword(data: UpdateUserPasswordGrpcRequest): Observable<UpdateUserPasswordResponse>;

  
  saveVerificationCode(data: SaveVerificationCodeRequest): Observable<{ success: boolean; message: string }>;


  verifyEmailCode(data: VerifyEmailCodeRequest): Observable<VerifyEmailCodeResponse>;
 

  markEmailVerified(data: { user_id: string }): Observable<{ success: boolean; message: string }>;

}


export interface SaveVerificationCodeRequest {
  user_id: string;
  code: string;
  expiry: string;
  // ↑ ISO date string — e.g. '2024-03-20T10:15:00.000Z'
}

export interface VerifyEmailCodeRequest {
  email: string;
  code: string;
}

export interface VerifyEmailCodeResponse {
  user_id: string;
  email: string;
}

// ─── Keep all existing interfaces below ──────────────────────────────────────

export interface UserListGrpcResponse {
  users: UserGrpcResponse[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface FindByCourseAndRoleRequest {
  course_id: string;
  role: string;
  page?: number;
  page_size?: number;
}

export interface FindByDepartmentAndRoleRequest {
  department_id: string;
  role: string;
  page?: number;
  page_size?: number;
}

export interface FindByDepartmentIdRequest {
  department_id: string;
  page?: number;
  page_size?: number;
}

export interface FindByCourseIdRequest {
  course_id: string;
  page?: number;
  page_size?: number;
}

export interface FindActiveUsersRequest {
  is_active: boolean;
  page?: number;
  page_size?: number;
}

export interface UserGrpcResponse {
  id: string;
  firstname: string;
  lastname: string;
  email: string;
  role: string;
  is_active: boolean;
  email_verified: boolean;
  // ↑ added — needed to check during login
  matric_no?: string;
  department_id?: string;
  course_id?: string;
  level?: string;
  no_of_trials?: number;
}

export interface UserWithPasswordGrpcResponse {
  id: string;
  firstname: string;
  lastname: string;
  email: string;
  password_hash: string;
  role: string;
  is_active: boolean;
  email_verified: boolean;
  // ↑ added — auth-service checks this during login
  matric_no?: string;
  department_id?: string;
  course_id?: string;
  level?: string;
  no_of_trials?: number;
}

export interface UpdateUserGrpcRequest {
  id: string;
  firstname?: string;
  lastname?: string;
  email?: string;
  is_active?: boolean;
  role?: string;
  matric_no?: string;
  no_of_trials?: number;
  department_id?: string;
  course_id?: string;
  level?: string;
}

export interface UpdateUserResponse {
  id: string;
  firstname: string;
  lastname: string;
  email: string;
  is_active: boolean;
  role: string;
  matric_no?: string;
  no_of_trials?: number;
  department_id?: string;
  course_id?: string;
  level?: string;
}

export interface CreateUserGrpcRequest {
  firstname: string;
  lastname: string;
  email: string;
  password_hash: string;
  is_active: boolean;
  role: string;
  matric_no?: string;
  no_of_trials?: number;
  department_id?: string;
  course_id?: string;
  level?: string;
}

export interface NotificationServiceGrpcClient {
  sendWelcomeEmail(data: any): Observable<any>;
  sendStudentWelcomeEmail(data: any): Observable<any>;
  sendInstructorWelcomeEmail(data: any): Observable<any>;
  sendEmailVerification(data: any): Observable<any>;
  sendLoginAlert(data: any): Observable<any>;
  sendAccountStatusEmail(data: any): Observable<any>;
  sendPasswordReset(data: any): Observable<any>;
  sendSms(data: any): Observable<any>;
}

export interface LoginRequest {
  email: string;
  password: string;
  ip_address?: string;
  user_agent?: string;
}

export interface RegisterRequest {
  firstname: string;
  lastname: string;
  email: string;
  password: string;
  role?: string;
  matric_no?: string;
  no_of_trials?: number;
  is_active?: boolean;
  department_id?: string;
  course_id?: string;
  level?: string;
}

export interface ValidateTokenRequest {
  token: string;
}

export interface DeleteUserGrpcRequest {
  id: string;
}

export interface UpdateUserPasswordGrpcRequest {
  id: string;
  new_password_hash: string;
}

export interface DeleteUserResponse {
  success: boolean;
  message: string;
}

export interface UpdateUserPasswordResponse {
  success: boolean;
  message: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface LogoutRequest {
  user_id: string;
  refresh_token: string;
}

// ─── NEW auth request interfaces ──────────────────────────────────────────────

export interface VerifyEmailRequest {
  email: string;
  code: string;
}

export interface ResendVerificationCodeRequest {
  email: string;
}