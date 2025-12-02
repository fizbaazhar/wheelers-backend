import { 
  Controller, 
  Post, 
  Get, 
  Body, 
  Param, 
  Query, 
  UseGuards, 
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RatingsService } from './ratings.service';
import { RateDriverDto } from './dto/rate-driver.dto';
import { RateRiderDto } from './dto/rate-rider.dto';

@Controller('ratings')
@UseGuards(JwtAuthGuard)
export class RatingsController {
  constructor(private readonly ratingsService: RatingsService) {}

  @Post('driver')
  @HttpCode(HttpStatus.CREATED)
  async rateDriver(
    @Request() req,
    @Body() rateDriverDto: RateDriverDto,
  ) {
    const userId = req.user?.userId || req.user?.id || req.user?.sub;
    
    if (!userId) {
      return {
        success: false,
        message: 'User not authenticated',
        error: 'User ID not found in token',
      };
    }

    try {
      const rating = await this.ratingsService.rateDriver(userId, rateDriverDto);
      return {
        success: true,
        message: 'Driver rated successfully',
        data: rating,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to rate driver',
        error: error.message,
      };
    }
  }

  @Post('rider')
  @HttpCode(HttpStatus.CREATED)
  async rateRider(
    @Request() req,
    @Body() rateRiderDto: RateRiderDto,
  ) {
    const userId = req.user?.userId || req.user?.id || req.user?.sub;
    
    if (!userId) {
      return {
        success: false,
        message: 'User not authenticated',
        error: 'User ID not found in token',
      };
    }

    try {
      const rating = await this.ratingsService.rateRider(userId, rateRiderDto);
      return {
        success: true,
        message: 'Rider rated successfully',
        data: rating,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to rate rider',
        error: error.message,
      };
    }
  }

  @Get('driver/:driverId')
  async getDriverRatings(
    @Param('driverId') driverId: string,
    @Query('limit') limit: string = '20',
    @Query('skip') skip: string = '0',
  ) {
    try {
      const result = await this.ratingsService.getDriverRatings(
        driverId,
        parseInt(limit, 10),
        parseInt(skip, 10),
      );
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to get driver ratings',
        error: error.message,
      };
    }
  }


  @Get('rider/:riderId')
  async getRiderRatings(
    @Param('riderId') riderId: string,
    @Query('limit') limit: string = '20',
    @Query('skip') skip: string = '0',
  ) {
    try {
      const result = await this.ratingsService.getRiderRatings(
        riderId,
        parseInt(limit, 10),
        parseInt(skip, 10),
      );
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to get rider ratings',
        error: error.message,
      };
    }
  }


  @Get('summary/:userId')
  async getRatingSummary(
    @Param('userId') userId: string,
    @Query('type') type: 'driver' | 'rider' = 'driver',
  ) {
    try {
      const summary = await this.ratingsService.getUserRatingSummary(userId, type);
      return {
        success: true,
        data: summary,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to get rating summary',
        error: error.message,
      };
    }
  }
  
  @Get('check/:rideId')
  async checkRatingStatus(
    @Request() req,
    @Param('rideId') rideId: string,
    @Query('type') type: 'driver' | 'rider' = 'driver',
  ) {
    const userId = req.user?.userId || req.user?.id || req.user?.sub;
    
    if (!userId) {
      return {
        success: false,
        message: 'User not authenticated',
        error: 'User ID not found in token',
      };
    }

    try {
      const hasRated = await this.ratingsService.hasRatedForRide(userId, rideId, type);
      return {
        success: true,
        data: {
          hasRated,
          rideId,
          ratingType: type,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to check rating status',
        error: error.message,
      };
    }
  }
}

