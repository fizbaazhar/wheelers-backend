import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';
import { SettingsService } from 'src/settings/settings.service';
import { UserType, UserRole } from 'src/users/users.schema';
import { DriverSignupDto } from './dto/driver-signup.dto';
import { AdminLoginDashboardDto } from './dto/admin-login-dashboard.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from 'src/users/users.schema';
import * as bcrypt from 'bcrypt';
import twilio from 'twilio';

@Injectable()
export class AuthService {
    private otpStore: Map<string, { otp: string; expires: number; driverData?: DriverSignupDto }> = new Map();
    private twilioClient: twilio.Twilio;

    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
        private settingsService: SettingsService,
        @InjectModel(User.name) private userModel: Model<User>,
    ) {
        this.twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    }

    async sendOtp(phoneNumber: string, isSignup: boolean): Promise<void> {
        const user = await this.usersService.findByPhone(phoneNumber);
        if (isSignup && user) {
            throw new BadRequestException('User already exists');
        }
        if (!isSignup && !user) {
            throw new NotFoundException('User not found');
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
        const expires = Date.now() + 5 * 60 * 1000; // 5 minutes expiration

        this.otpStore.set(phoneNumber, { otp, expires });

        // Skip sending SMS in development environment
        if (process.env.ENV === 'dev') {
            return;
        }

        await this.twilioClient.messages.create({
            body: `Your OTP is ${otp}. It expires in 5 minutes.`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: phoneNumber,
        });
    }

    async sendDriverSignupOtp(driverSignupDto: DriverSignupDto): Promise<void> {
        const user = await this.usersService.findByPhone(driverSignupDto.phoneNumber);
        if (user) {
            throw new BadRequestException('Driver already exists with this phone number');
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
        const expires = Date.now() + 5 * 60 * 1000; // 5 minutes expiration

        // Store driver data temporarily with OTP
        this.otpStore.set(driverSignupDto.phoneNumber, { 
            otp, 
            expires,
            driverData: driverSignupDto 
        });

        // Skip sending SMS in development environment
        if (process.env.ENV === 'dev') {
            return;
        }

        await this.twilioClient.messages.create({
            body: `Your OTP for driver signup is ${otp}. It expires in 5 minutes.`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: driverSignupDto.phoneNumber,
        });
    }

    async sendDriverLoginOtp(phoneNumber: string): Promise<void> {
        const user = await this.usersService.findByPhone(phoneNumber);
        if (!user) {
            throw new NotFoundException('Driver not found');
        }
        if (user.userType !== UserType.DRIVER) {
            throw new BadRequestException('This phone number is not registered as a driver');
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
        const expires = Date.now() + 5 * 60 * 1000; // 5 minutes expiration

        this.otpStore.set(phoneNumber, { otp, expires });

        // Skip sending SMS in development environment
        if (process.env.ENV === 'dev') {
            return;
        }

        await this.twilioClient.messages.create({
            body: `Your OTP for driver login is ${otp}. It expires in 5 minutes.`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: phoneNumber,
        });
    }

    async verifyOtp(phoneNumber: string, otp: string, isSignup: boolean): Promise<{ token: string }> {
        const stored = this.otpStore.get(phoneNumber);
        
        // In development environment, accept 123456 as valid OTP
        const isValidOtp = process.env.ENV === 'dev' ? 
            (otp === '123456' || (stored && stored.otp === otp && Date.now() <= stored.expires)) :
            (stored && stored.otp === otp && Date.now() <= stored.expires);
            
        if (!isValidOtp) {
            throw new BadRequestException('Invalid or expired OTP');
        }

        this.otpStore.delete(phoneNumber);

        let user = await this.usersService.findByPhone(phoneNumber);
        if (isSignup && !user) {
            user = await this.usersService.create(phoneNumber);
            try {
                await this.settingsService.getOrCreate((user as any)._id.toString());
            } catch (e) {
                // Swallow settings creation errors to not block signup
            }
        }

        if (!user) {
            throw new NotFoundException('User not found');
        }

        const payload = { sub: user.id, phoneNumber: user.phoneNumber };
        const jwtSecret = process.env.JWT_SECRET;
        return { token: await this.jwtService.signAsync(payload, { secret: jwtSecret }) };
    }

    async verifyDriverSignupOtp(phoneNumber: string, otp: string): Promise<{ token: string }> {
        const stored = this.otpStore.get(phoneNumber);
        
        // In development environment, accept 123456 as valid OTP
        const isValidOtp = process.env.ENV === 'dev' ? 
            (otp === '123456' || (stored && stored.otp === otp && Date.now() <= stored.expires)) :
            (stored && stored.otp === otp && Date.now() <= stored.expires);
            
        if (!isValidOtp) {
            throw new BadRequestException('Invalid or expired OTP');
        }

        // If using dev OTP (123456), we need to ensure stored data exists
        if (process.env.ENV === 'dev' && otp === '123456' && !stored) {
            throw new BadRequestException('Driver data not found. Please send OTP first.');
        }

        if (!stored || !stored.driverData) {
            throw new BadRequestException('Driver data not found');
        }

        this.otpStore.delete(phoneNumber);

        // Create driver user
        const driverData = stored.driverData;
        const newDriver = await this.usersService.create(phoneNumber);
        
        // Update driver with all required information
        const updatedDriver = await this.usersService.updateUserProfileById(
            (newDriver as any)._id.toString(),
            {
                fullName: driverData.fullName,
                email: driverData.email,
                gender: driverData.gender,
                cnic: driverData.cnic,
                userType: UserType.DRIVER,
                phoneVerified: true,
                memberSince: new Date(),
                lastActiveAt: new Date(),
            }
        );

        try {
            await this.settingsService.getOrCreate((updatedDriver as any)._id.toString());
        } catch (e) {
            // Swallow settings creation errors to not block signup
        }

        const payload = { sub: updatedDriver.id, phoneNumber: updatedDriver.phoneNumber };
        const jwtSecret = process.env.JWT_SECRET;
        return { token: await this.jwtService.signAsync(payload, { secret: jwtSecret }) };
    }

    async verifyDriverLoginOtp(phoneNumber: string, otp: string): Promise<{ token: string }> {
        const stored = this.otpStore.get(phoneNumber);
        
        // In development environment, accept 123456 as valid OTP
        const isValidOtp = process.env.ENV === 'dev' ? 
            (otp === '123456' || (stored && stored.otp === otp && Date.now() <= stored.expires)) :
            (stored && stored.otp === otp && Date.now() <= stored.expires);
            
        if (!isValidOtp) {
            throw new BadRequestException('Invalid or expired OTP');
        }

        this.otpStore.delete(phoneNumber);

        const user = await this.usersService.findByPhone(phoneNumber);
        if (!user) {
            throw new NotFoundException('Driver not found');
        }

        if (user.userType !== UserType.DRIVER) {
            throw new BadRequestException('This phone number is not registered as a driver');
        }

        // Update last active time
        await this.usersService.updateUserProfileById(
            (user as any)._id.toString(),
            { lastActiveAt: new Date() }
        );

        const payload = { sub: user.id, phoneNumber: user.phoneNumber };
        const jwtSecret = process.env.JWT_SECRET;
        return { token: await this.jwtService.signAsync(payload, { secret: jwtSecret }) };
    }

    async adminLoginDashboard(adminLoginDto: AdminLoginDashboardDto): Promise<{ token: string; user: any }> {
        const { email, password } = adminLoginDto;

        const user = await this.usersService.findByEmail(email);
        if (!user) {
            throw new UnauthorizedException('Invalid email or password');
        }

        if (user.role !== UserRole.ADMIN) {
            throw new UnauthorizedException('Access denied. Admin privileges required.');
        }

        if (!user.password) {
            throw new UnauthorizedException('Password not set. Please contact administrator.');
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid email or password');
        }

        if (user.status !== 'active') {
            throw new UnauthorizedException('Account is not active. Please contact administrator.');
        }

        await this.usersService.updateUserProfileById(
            (user as any)._id.toString(),
            { lastActiveAt: new Date() }
        );

        const payload = { 
            sub: (user as any)._id.toString(), 
            email: user.email,
            role: user.role 
        };
        const jwtSecret = process.env.JWT_SECRET;
        const token = await this.jwtService.signAsync(payload, { secret: jwtSecret });

        const { password: _, ...userWithoutPassword } = user.toObject();
        return { 
            token,
            user: userWithoutPassword
        };
    }
}
