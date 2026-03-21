import { IsBoolean, IsEmail, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, MinLength, ValidateIf} from "class-validator";
import { Type} from "class-transformer";
import { UserRole } from "src/auth/enums/user-role.enum";



export class RegisterUserDto {
@IsString()
@IsNotEmpty()
@MinLength(3,{message:"Firstname must be at least 3 characters long"})
firstname:string;

@IsString()
@IsNotEmpty()
@MinLength(3,{message:"Firstname must be at least 3 characters long"})
lastname:string;

 //  Conditional Validation: Required ONLY if role is 'student'
  @IsString()
  @ValidateIf((object, value) => object.role === 'student')
  @IsNotEmpty({ message: "Matric Number is required for students" })
  matricNo?: string;

@IsString()
@IsEmail()
@IsNotEmpty()
email:string;

@IsString()
@IsNotEmpty()
@MinLength(8,{message:"Password must be at least 8 characters long"})
password:string;

@IsInt({message:"No of trials must be an integer"})
@IsOptional()
noOfTrials?:number;

@IsBoolean()
@IsOptional()
@Type(() => Boolean)
isActive?:boolean;

@IsEnum(UserRole, { message: "Role must be 'student' or 'instructor' or 'admin' " })
@IsOptional()
role?: UserRole;

  //  Store only departmentId
  @ValidateIf(o => o.role === UserRole.STUDENT)
  @IsString()
  @IsNotEmpty({ message: "Level is required for students" })
  level?: string;
  
  @ValidateIf(o => o.role === UserRole.STUDENT)
  @IsString()
  @IsNotEmpty({ message: "Department ID is required for students" })
  departmentId?: string;

  //  Store only courseId
  @ValidateIf(o => 
    o.role === UserRole.STUDENT || 
    o.role === UserRole.INSTRUCTOR
  )
  @IsString()
  @IsNotEmpty({ message: "Course ID is required for students and instructors" })
  courseId?: string;


}