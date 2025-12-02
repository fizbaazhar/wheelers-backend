import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminDashboardGuard } from '../auth/admin-dashboard.guard';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Ride } from '../websockets/schemas/ride.schema';
import { UsersService } from '../users/users.service';

@Controller('admin-dashboard/rides')
@UseGuards(AdminDashboardGuard)
export class RidesDashboardController {
  constructor(
    @InjectModel(Ride.name) private rideModel: Model<Ride>,
    private readonly usersService: UsersService,
  ) {}

  @Get()
  async getAllRides(
    @Query('limit') limit: string = '50',
    @Query('skip') skip: string = '0',
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    const limitNum = parseInt(limit, 10) || 50;
    const skipNum = parseInt(skip, 10) || 0;

    const query: any = {};

    if (status && status !== 'all') {
      if (status === 'completed' || status === 'cancelled') {
        query.status = status;
      }
    } else {
      query.status = { $in: ['completed', 'cancelled'] };
    }

    if (search) {
      query.$or = [
        { driverId: { $regex: search, $options: 'i' } },
        { passengerId: { $regex: search, $options: 'i' } },
        { 'pickupLocation.address': { $regex: search, $options: 'i' } },
        { 'destinationLocation.address': { $regex: search, $options: 'i' } },
      ];
    }

    const [rides, total] = await Promise.all([
      this.rideModel
        .find(query)
        .sort({ createdAt: -1 })
        .limit(limitNum)
        .skip(skipNum)
        .lean()
        .exec(),
      this.rideModel.countDocuments(query),
    ]);

    const ridesWithUserInfo = await Promise.all(
      rides.map(async (ride: any) => {
        const [driver, passenger] = await Promise.all([
          this.usersService.findById(ride.driverId),
          this.usersService.findById(ride.passengerId),
        ]);

        return {
          ...ride,
          id: ride._id.toString(),
          driver: driver
            ? {
                id: (driver as any)._id.toString(),
                fullName: driver.fullName,
                phoneNumber: driver.phoneNumber,
                email: driver.email,
              }
            : null,
          passenger: passenger
            ? {
                id: (passenger as any)._id.toString(),
                fullName: passenger.fullName,
                phoneNumber: passenger.phoneNumber,
                email: passenger.email,
              }
            : null,
        };
      }),
    );

    return {
      success: true,
      data: {
        rides: ridesWithUserInfo,
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
  async getRideStats() {
    const [totalRides, completedRides, cancelledRides] = await Promise.all([
      this.rideModel.countDocuments({ status: { $in: ['completed', 'cancelled'] } }),
      this.rideModel.countDocuments({ status: 'completed' }),
      this.rideModel.countDocuments({ status: 'cancelled' }),
    ]);

    const revenueResult = await this.rideModel.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$actualFare' } } },
    ]);

    const totalRevenue = revenueResult[0]?.total || 0;

    return {
      success: true,
      data: {
        totalRides,
        completedRides,
        cancelledRides,
        totalRevenue,
      },
    };
  }
}

