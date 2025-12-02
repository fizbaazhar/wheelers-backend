import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { DriverSignupDto } from './dto/driver-signup.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { AdminLoginDashboardDto } from './dto/admin-login-dashboard.dto';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) {}

  @Post('signup')
  async signup(@Body('phoneNumber') phoneNumber: string) {
    await this.authService.sendOtp(phoneNumber, true);
    return { message: 'OTP sent for signup' };
  }

  @Post('verify-signup')
  async verifySignup(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto.phoneNumber, dto.otp, true);
  }

  @Post('login')
  async login(@Body('phoneNumber') phoneNumber: string) {
    await this.authService.sendOtp(phoneNumber, false);
    return { message: 'OTP sent for login' };
  }

  @Post('verify-login')
  async verifyLogin(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto.phoneNumber, dto.otp, false);
  }

  // Driver endpoints
  @Post('driver/signup')
  async driverSignup(@Body() driverSignupDto: DriverSignupDto) {
    await this.authService.sendDriverSignupOtp(driverSignupDto);
    return { message: 'OTP sent for driver signup' };
  }

  @Post('driver/verify-signup')
  async verifyDriverSignup(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyDriverSignupOtp(dto.phoneNumber, dto.otp);
  }

  @Post('driver/login')
  async driverLogin(@Body('phoneNumber') phoneNumber: string) {
    await this.authService.sendDriverLoginOtp(phoneNumber);
    return { message: 'OTP sent for driver login' };
  }

  @Post('driver/verify-login')
  async verifyDriverLogin(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyDriverLoginOtp(dto.phoneNumber, dto.otp);
  }

  @Post('admin-dashboard/login')
  async adminLoginDashboard(@Body() adminLoginDto: AdminLoginDashboardDto) {
    return this.authService.adminLoginDashboard(adminLoginDto);
  }

  // Example protected route
  @UseGuards(AuthGuard('jwt'))
  @Post('protected')
  protected() {
    return { message: 'This is a protected route' };
  }
}
