import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './users.schema';
import { Ride } from '../websockets/schemas/ride.schema';

@Injectable()
export class UsersService {
    constructor(
        @InjectModel(User.name) private userModel: Model<User>,
        @InjectModel(Ride.name) private rideModel: Model<Ride>
    ) {}
    
    async findByPhone(phoneNumber: string): Promise<User | null> {
        return this.userModel.findOne({ phoneNumber }).exec();
    }

    async findByEmail(email: string): Promise<User | null> {
        return this.userModel.findOne({ email }).exec();
    }

    async findById(userId: string): Promise<User | null> {
        return this.userModel.findById(userId).exec();
    }

    async create(phoneNumber: string): Promise<User> {
        const newUser = new this.userModel({ phoneNumber });
        return newUser.save();
    }

    async updateUserProfile(phoneNumber: string, updateData: Partial<User>): Promise<User> {
        // Update lastActiveAt when profile is updated
        const updatedData = {
            ...updateData,
            lastActiveAt: new Date(),
        };

        const updatedUser = await this.userModel
            .findOneAndUpdate(
                { phoneNumber },
                { $set: updatedData },
                { new: true, runValidators: true }
            )
            .exec();

        if (!updatedUser) {
            throw new Error('User not found');
        }

        return updatedUser;
    }

    async updateUserProfileById(userId: string, updateData: Partial<User>): Promise<User> {
        // Update lastActiveAt when profile is updated
        const updatedData = {
            ...updateData,
            lastActiveAt: new Date(),
        };

        const updatedUser = await this.userModel
            .findByIdAndUpdate(
                userId,
                { $set: updatedData },
                { new: true, runValidators: true }
            )
            .exec();

        if (!updatedUser) {
            throw new Error('User not found');
        }

        return updatedUser;
    }

    async getDriverProfile(driverId: string): Promise<{
        name: string;
        phoneNumber: string;
        email: string;
        cnic: string;
        gender: string;
        totalRides: number;
        rating: number;
        todayEarnings: number;
        totalEarnings: number;
    }> {
        const driver = await this.userModel.findById(driverId).exec();
        if (!driver) {
            throw new Error('Driver not found');
        }

        const completedRides = await this.rideModel.find({ 
            driverId: driverId, 
            status: 'completed' 
        }).exec();

        const totalRides = completedRides.length;

        const totalEarnings = completedRides.reduce((sum, ride) => {
            return sum + (Number(ride.actualFare) || 0);
        }, 0);

        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const todayEarnings = completedRides
            .filter(ride => {
                const rideDate = new Date(ride.updatedAt || ride.createdAt);
                return rideDate >= startOfToday;
            })
            .reduce((sum, ride) => {
                return sum + (Number(ride.actualFare) || 0);
            }, 0);

        return {
            name: driver.fullName || '',
            phoneNumber: driver.phoneNumber,
            email: driver.email || '',
            cnic: driver.cnic || '',
            gender: driver.gender || '',
            totalRides: totalRides,
            rating: driver.rating || 0,
            todayEarnings,
            totalEarnings
        };
    }
}
