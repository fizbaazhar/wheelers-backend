import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserSettings } from '../models/settings.schema';
import { DriverProfileSettingsDto } from './dto/driver-profile-settings.dto';

@Injectable()
export class SettingsService {
  constructor(
    @InjectModel(UserSettings.name) private readonly settingsModel: Model<UserSettings>,
  ) {}

  async getOrCreate(userId: string): Promise<UserSettings> {
    let settings = await this.settingsModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .exec();
    if (!settings) {
      settings = await this.settingsModel.create({ userId: new Types.ObjectId(userId) });
    }
    return settings;
  }

  async updateBoolean(userId: string, key: string, value: boolean): Promise<UserSettings> {
    // Only allow updating boolean fields that exist on the schema
    const allowedKeys: Array<keyof UserSettings> = [
      'pushNotifications',
      'rideUpdates',
      'promotionsAndOffers',
      'securityAlerts',
      'emailNotifications',
      'smsNotifications',
      'darkMode',
      'shareLocationWithDrivers',
      'shareRideHistory',
      'allowAnalytics',
      'autoConfirmRides',
      'autoPay',
    ] as any;

    if (!allowedKeys.includes(key as any)) {
      throw new Error('Invalid boolean setting key');
    }

    const settings = await this.getOrCreate(userId);
    (settings as any)[key] = value;
    return settings.save();
  }

  async getDriverProfileSettings(userId: string): Promise<{
    pushNotifications: boolean;
    emailNotifications: boolean;
    smsNotifications: boolean;
    rideRequestAlerts: boolean;
    promotionalMessages: boolean;
    profileVisibleToCustomers: boolean;
    shareLiveLocation: boolean;
    showRatingToPublic: boolean;
    allowDataUsageAnalytics: boolean;
    darkMode: boolean;
  }> {
    const settings = await this.getOrCreate(userId);
    return {
      pushNotifications: settings.pushNotifications,
      emailNotifications: settings.emailNotifications,
      smsNotifications: settings.smsNotifications,
      rideRequestAlerts: settings.rideRequestAlerts,
      promotionalMessages: settings.promotionalMessages,
      profileVisibleToCustomers: settings.profileVisibleToCustomers,
      shareLiveLocation: settings.shareLiveLocation,
      showRatingToPublic: settings.showRatingToPublic,
      allowDataUsageAnalytics: settings.allowDataUsageAnalytics,
      darkMode: settings.darkMode,
    };
  }

  async updateDriverProfileSettings(
    userId: string,
    updateData: DriverProfileSettingsDto
  ): Promise<{
    pushNotifications: boolean;
    emailNotifications: boolean;
    smsNotifications: boolean;
    rideRequestAlerts: boolean;
    promotionalMessages: boolean;
    profileVisibleToCustomers: boolean;
    shareLiveLocation: boolean;
    showRatingToPublic: boolean;
    allowDataUsageAnalytics: boolean;
    darkMode: boolean;
  }> {
    const settings = await this.getOrCreate(userId);

    // Update only the fields that are provided
    if (updateData.pushNotifications !== undefined) {
      settings.pushNotifications = updateData.pushNotifications;
    }
    if (updateData.emailNotifications !== undefined) {
      settings.emailNotifications = updateData.emailNotifications;
    }
    if (updateData.smsNotifications !== undefined) {
      settings.smsNotifications = updateData.smsNotifications;
    }
    if (updateData.rideRequestAlerts !== undefined) {
      settings.rideRequestAlerts = updateData.rideRequestAlerts;
    }
    if (updateData.promotionalMessages !== undefined) {
      settings.promotionalMessages = updateData.promotionalMessages;
    }
    if (updateData.profileVisibleToCustomers !== undefined) {
      settings.profileVisibleToCustomers = updateData.profileVisibleToCustomers;
    }
    if (updateData.shareLiveLocation !== undefined) {
      settings.shareLiveLocation = updateData.shareLiveLocation;
    }
    if (updateData.showRatingToPublic !== undefined) {
      settings.showRatingToPublic = updateData.showRatingToPublic;
    }
    if (updateData.allowDataUsageAnalytics !== undefined) {
      settings.allowDataUsageAnalytics = updateData.allowDataUsageAnalytics;
    }
    if (updateData.darkMode !== undefined) {
      settings.darkMode = updateData.darkMode;
    }

    await settings.save();

    return {
      pushNotifications: settings.pushNotifications,
      emailNotifications: settings.emailNotifications,
      smsNotifications: settings.smsNotifications,
      rideRequestAlerts: settings.rideRequestAlerts,
      promotionalMessages: settings.promotionalMessages,
      profileVisibleToCustomers: settings.profileVisibleToCustomers,
      shareLiveLocation: settings.shareLiveLocation,
      showRatingToPublic: settings.showRatingToPublic,
      allowDataUsageAnalytics: settings.allowDataUsageAnalytics,
      darkMode: settings.darkMode,
    };
  }
}


