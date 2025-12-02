import { Body, Controller, Get, Put, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SettingsService } from './settings.service';
import { DriverProfileSettingsDto } from './dto/driver-profile-settings.dto';

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  async getSettings(@Request() req) {
    const settings = await this.settingsService.getOrCreate(req.user.userId);
    return { message: 'User settings retrieved', settings };
  }

  @Put()
  async updateSetting(
    @Request() req,
    @Body() body: { key: string; value: boolean },
  ) {
    const updated = await this.settingsService.updateBoolean(req.user.userId, body.key, body.value);
    return { message: 'User settings updated', settings: updated };
  }

  @Get('driver/profile')
  async getDriverProfileSettings(@Request() req) {
    const settings = await this.settingsService.getDriverProfileSettings(req.user.userId);
    return {
      message: 'Driver profile settings retrieved successfully',
      settings
    };
  }

  @Put('driver/profile')
  async updateDriverProfileSettings(
    @Request() req,
    @Body() updateData: DriverProfileSettingsDto
  ) {
    const settings = await this.settingsService.updateDriverProfileSettings(
      req.user.userId,
      updateData
    );
    return {
      message: 'Driver profile settings updated successfully',
      settings
    };
  }
}


