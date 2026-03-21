import { PickType } from "@nestjs/mapped-types";
import { RegisterUserDto } from "./register.dto";



export class LoginDto extends PickType(RegisterUserDto, ['email', 'password'] ) {}  