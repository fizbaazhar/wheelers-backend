import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Rating, RatingDocument } from './schemas/rating.schema';
import { Ride } from '../websockets/schemas/ride.schema';
import { User } from '../users/users.schema';
import { RateDriverDto } from './dto/rate-driver.dto';
import { RateRiderDto } from './dto/rate-rider.dto';

@Injectable()
export class RatingsService {
  constructor(
    @InjectModel(Rating.name) private ratingModel: Model<RatingDocument>,
    @InjectModel(Ride.name) private rideModel: Model<Ride>,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  async rateDriver(riderId: string, rateDriverDto: RateDriverDto): Promise<Rating> {
    const { rideId, rating, comment } = rateDriverDto;

    const ride = await this.rideModel.findById(rideId).exec();
    if (!ride) {
      throw new NotFoundException('Ride not found');
    }

    if (ride.status !== 'completed') {
      throw new BadRequestException('Can only rate drivers for completed rides');
    }

    if (ride.passengerId !== riderId) {
      throw new BadRequestException('You can only rate drivers for your own rides');
    }

    const existingRating = await this.ratingModel.findOne({
      rideId,
      ratedById: riderId,
      ratingType: 'driver',
      isDeleted: false,
    }).exec();

    if (existingRating) {
      throw new ConflictException('You have already rated this driver for this ride');
    }

    const newRating = new this.ratingModel({
      rideId,
      ratedById: riderId,
      ratedToId: ride.driverId,
      rating,
      comment,
      ratingType: 'driver',
    });

    const savedRating = await newRating.save();

    await this.updateUserRating(ride.driverId);

    return savedRating;
  }

  async rateRider(driverId: string, rateRiderDto: RateRiderDto): Promise<Rating> {
    const { rideId, rating, comment } = rateRiderDto;

    const ride = await this.rideModel.findById(rideId).exec();
    if (!ride) {
      throw new NotFoundException('Ride not found');
    }

    if (ride.status !== 'completed') {
      throw new BadRequestException('Can only rate riders for completed rides');
    }

    if (ride.driverId !== driverId) {
      throw new BadRequestException('You can only rate riders for your own rides');
    }

    const existingRating = await this.ratingModel.findOne({
      rideId,
      ratedById: driverId,
      ratingType: 'rider',
      isDeleted: false,
    }).exec();

    if (existingRating) {
      throw new ConflictException('You have already rated this rider for this ride');
    }

    const newRating = new this.ratingModel({
      rideId,
      ratedById: driverId,
      ratedToId: ride.passengerId,
      rating,
      comment,
      ratingType: 'rider',
    });

    const savedRating = await newRating.save();

    await this.updateUserRating(ride.passengerId);

    return savedRating;
  }


  async getDriverRatings(driverId: string, limit: number = 20, skip: number = 0) {
    const ratings = await this.ratingModel
      .find({
        ratedToId: driverId,
        ratingType: 'driver',
        isDeleted: false,
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .exec();

    const ratingsWithUsers = await Promise.all(
      ratings.map(async (rating) => {
        const user = await this.userModel.findById(rating.ratedById).select('fullName profilePicture phoneNumber').exec();
        return {
          ...rating.toObject(),
          ratedBy: user ? {
            fullName: user.fullName,
            profilePicture: user.profilePicture,
            phoneNumber: user.phoneNumber,
          } : null,
        };
      })
    );

    const total = await this.ratingModel.countDocuments({
      ratedToId: driverId,
      ratingType: 'driver',
      isDeleted: false,
    }).exec();

    const avgRatingResult = await this.ratingModel.aggregate([
      {
        $match: {
          ratedToId: driverId,
          ratingType: 'driver',
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalRatings: { $sum: 1 },
        },
      },
    ]).exec();

    const averageRating = avgRatingResult.length > 0 
      ? Math.round(avgRatingResult[0].averageRating * 10) / 10 
      : 0;
    const totalRatings = avgRatingResult.length > 0 ? avgRatingResult[0].totalRatings : 0;

    return {
      ratings: ratingsWithUsers,
      averageRating,
      totalRatings,
      limit,
      skip,
    };
  }

  async getRiderRatings(riderId: string, limit: number = 20, skip: number = 0) {
    const ratings = await this.ratingModel
      .find({
        ratedToId: riderId,
        ratingType: 'rider',
        isDeleted: false,
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .exec();

    const ratingsWithUsers = await Promise.all(
      ratings.map(async (rating) => {
        const user = await this.userModel.findById(rating.ratedById).select('fullName profilePicture phoneNumber').exec();
        return {
          ...rating.toObject(),
          ratedBy: user ? {
            fullName: user.fullName,
            profilePicture: user.profilePicture,
            phoneNumber: user.phoneNumber,
          } : null,
        };
      })
    );

    const total = await this.ratingModel.countDocuments({
      ratedToId: riderId,
      ratingType: 'rider',
      isDeleted: false,
    }).exec();

    const avgRatingResult = await this.ratingModel.aggregate([
      {
        $match: {
          ratedToId: riderId,
          ratingType: 'rider',
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalRatings: { $sum: 1 },
        },
      },
    ]).exec();

    const averageRating = avgRatingResult.length > 0 
      ? Math.round(avgRatingResult[0].averageRating * 10) / 10 
      : 0;
    const totalRatings = avgRatingResult.length > 0 ? avgRatingResult[0].totalRatings : 0;

    return {
      ratings: ratingsWithUsers,
      averageRating,
      totalRatings,
      limit,
      skip,
    };
  }

  async getUserRatingSummary(userId: string, ratingType: 'driver' | 'rider') {
    if (!userId || typeof userId !== 'string') {
      throw new BadRequestException('Invalid user ID');
    }

    const avgRatingResult = await this.ratingModel.aggregate([
      {
        $match: {
          ratedToId: userId,
          ratingType,
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalRatings: { $sum: 1 },
          ratingDistribution: {
            $push: '$rating',
          },
        },
      },
    ]).exec();

    let totalRides = 0;
    if (ratingType === 'rider') {
      totalRides = await this.rideModel.countDocuments({
        passengerId: userId,
        status: 'completed',
      }).exec();
    } else if (ratingType === 'driver') {
      totalRides = await this.rideModel.countDocuments({
        driverId: userId,
        status: 'completed',
      }).exec();
    }

    if (avgRatingResult.length === 0) {
      return {
        averageRating: 0,
        totalRatings: 0,
        totalRides: totalRides,
        ratingDistribution: {
          5: 0,
          4: 0,
          3: 0,
          2: 0,
          1: 0,
        },
      };
    }

    const { averageRating, totalRatings, ratingDistribution } = avgRatingResult[0];
    const distribution = {
      5: 0,
      4: 0,
      3: 0,
      2: 0,
      1: 0,
    };

    if (ratingDistribution && Array.isArray(ratingDistribution)) {
      ratingDistribution.forEach((rating: number) => {
        if (rating >= 1 && rating <= 5) {
          distribution[rating as keyof typeof distribution]++;
        }
      });
    }

    const finalAverageRating = averageRating && !isNaN(averageRating) 
      ? Math.round(averageRating * 10) / 10 
      : 0;

    return {
      averageRating: finalAverageRating,
      totalRatings: totalRatings || 0,
      totalRides: totalRides,
      ratingDistribution: distribution,
    };
  }

  private async updateUserRating(userId: string): Promise<void> {
    const driverRatings = await this.ratingModel.aggregate([
      {
        $match: {
          ratedToId: userId,
          ratingType: 'driver',
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
        },
      },
    ]).exec();

    const riderRatings = await this.ratingModel.aggregate([
      {
        $match: {
          ratedToId: userId,
          ratingType: 'rider',
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
        },
      },
    ]).exec();

    let overallRating = 0;
    if (driverRatings.length > 0 && riderRatings.length > 0) {
      overallRating = (driverRatings[0].averageRating + riderRatings[0].averageRating) / 2;
    } else if (driverRatings.length > 0) {
      overallRating = driverRatings[0].averageRating;
    } else if (riderRatings.length > 0) {
      overallRating = riderRatings[0].averageRating;
    }

    await this.userModel.findByIdAndUpdate(
      userId,
      { 
        $set: { 
          rating: Math.round(overallRating * 10) / 10 
        } 
      }
    ).exec();
  }

  async hasRatedForRide(userId: string, rideId: string, ratingType: 'driver' | 'rider'): Promise<boolean> {
    const rating = await this.ratingModel.findOne({
      rideId,
      ratedById: userId,
      ratingType,
      isDeleted: false,
    }).exec();

    return !!rating;
  }
}

