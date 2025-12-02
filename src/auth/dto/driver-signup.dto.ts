import { IsString, IsEmail, IsNotEmpty, IsPhoneNumber } from 'class-validator';

export class DriverSignupDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @IsString()
  @IsNotEmpty()
  gender: string;

  @IsString()
  @IsNotEmpty()
  cnic: string;
}
