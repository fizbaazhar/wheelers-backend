import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { AdminDashboardGuard } from '../auth/admin-dashboard.guard';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './users.schema';

@Controller('admin-dashboard/users')
@UseGuards(AdminDashboardGuard)
export class UsersDashboardController {
  constructor(
    private readonly usersService: UsersService,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  @Get()
  async getAllUsers(
    @Query('limit') limit: string = '50',
    @Query('skip') skip: string = '0',
    @Query('role') role?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    const limitNum = parseInt(limit, 10) || 50;
    const skipNum = parseInt(skip, 10) || 0;

    const query: any = {};

    if (role !== 'admin') {
      query.role = { $ne: 'admin' };
    }

    if (role && role !== 'all') {
      query.role = role;
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phoneNumber: { $regex: search, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.userModel
        .find(query)
        .sort({ createdAt: -1 })
        .limit(limitNum)
        .skip(skipNum)
        .lean()
        .exec(),
      this.userModel.countDocuments(query),
    ]);

    const usersWithoutPassword = users.map((user: any) => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });

    return {
      success: true,
      data: {
        users: usersWithoutPassword,
        pagination: {
          total,
          limit: limitNum,
          skip: skipNum,
          hasMore: skipNum + limitNum < total,
        },
      },
    };
  }

  @Get('stats')
  async getUserStats() {
    const [totalUsers, activeUsers, drivers, riders] = await Promise.all([
      this.userModel.countDocuments({ role: { $ne: 'admin' } }),
      this.userModel.countDocuments({ role: { $ne: 'admin' }, status: 'active' }),
      this.userModel.countDocuments({ userType: 'driver', role: { $ne: 'admin' } }),
      this.userModel.countDocuments({ userType: 'user', role: { $ne: 'admin' } }),
    ]);

    return {
      success: true,
      data: {
        totalUsers,
        activeUsers,
        drivers,
        riders,
      },
    };
  }
}

