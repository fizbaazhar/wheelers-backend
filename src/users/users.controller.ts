import { Controller, Get, Put, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';
import { User } from './users.schema';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  async getUserProfile(@Request() req): Promise<Partial<User>> {
    const user = await this.usersService.findById(req.user.userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    // Return only personal info fields, excluding sensitive data
    return {
      fullName: user.fullName,
      email: user.email,
      profilePicture: user.profilePicture,
      dateOfBirth: user.dateOfBirth,
      gender: user.gender,
      city: user.city,
      country: user.country,
      address: user.address,
      emergencyContactName: user.emergencyContactName,
      emergencyContactPhone: user.emergencyContactPhone,
      preferredLanguage: user.preferredLanguage,
      preferredCurrency: user.preferredCurrency,
      memberSince: user.memberSince,
      lastActiveAt: user.lastActiveAt,
    };
  }

  @Put('profile')
  async updateUserProfile(
    @Request() req,
    @Body() updateData: Partial<User>
  ): Promise<{ message: string; user: Partial<User> }> {
    const updatedUser = await this.usersService.updateUserProfileById(
      req.user.userId,
      updateData
    );
    
    return {
      message: 'Profile updated successfully',
      user: {
        fullName: updatedUser.fullName,
        email: updatedUser.email,
        profilePicture: updatedUser.profilePicture,
        dateOfBirth: updatedUser.dateOfBirth,
        gender: updatedUser.gender,
        city: updatedUser.city,
        country: updatedUser.country,
        address: updatedUser.address,
        emergencyContactName: updatedUser.emergencyContactName,
        emergencyContactPhone: updatedUser.emergencyContactPhone,
        preferredLanguage: updatedUser.preferredLanguage,
        preferredCurrency: updatedUser.preferredCurrency,
        memberSince: updatedUser.memberSince,
        lastActiveAt: updatedUser.lastActiveAt,
      }
    };
  }

  @Get('driver/profile')
  async getDriverProfile(@Request() req): Promise<{
    name: string;
    phoneNumber: string;
    email: string;
    cnic: string;
    gender: string;
    totalRides: number;
    rating: number;
  }> {
    return this.usersService.getDriverProfile(req.user.userId);
  }
}
