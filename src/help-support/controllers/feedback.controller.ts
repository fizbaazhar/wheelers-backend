import { Controller, Get, Post, Body, UseGuards, Request, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { FeedbackService } from '../services/feedback.service';
import { FeedbackType, FeedbackStatus } from '../schemas/feedback.schema';

@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async createOrUpdateFeedback(
    @Request() req,
    @Body() createFeedbackDto: {
      message: string;
      rating?: number;
      type?: FeedbackType;
      subject?: string;
    }
  ) {
    const feedback = await this.feedbackService.createOrUpdateFeedback(
      req.user.userId, // Using actual user ID from database
      createFeedbackDto.message,
      createFeedbackDto.rating,
      createFeedbackDto.type || FeedbackType.GENERAL_FEEDBACK,
      createFeedbackDto.subject
    );

    return {
      message: 'Feedback submitted successfully',
      feedback: {
        id: feedback._id,
        message: feedback.message,
        rating: feedback.rating,
        type: feedback.type,
        subject: feedback.subject,
        status: feedback.status,
        createdAt: feedback.createdAt,
        updatedAt: feedback.updatedAt
      }
    };
  }

  @Get('my-feedback')
  @UseGuards(JwtAuthGuard)
  async getUserFeedback(@Request() req) {
    const feedback = await this.feedbackService.getUserFeedback(
      req.user.userId // Using actual user ID from database
    );

    if (!feedback) {
      return {
        message: 'No feedback found for user',
        feedback: null
      };
    }

    return {
      message: 'User feedback retrieved successfully',
      feedback: {
        id: feedback._id,
        message: feedback.message,
        rating: feedback.rating,
        type: feedback.type,
        subject: feedback.subject,
        status: feedback.status,
        adminResponse: feedback.adminResponse,
        createdAt: feedback.createdAt,
        updatedAt: feedback.updatedAt
      }
    };
  }

  @Get('all')
  async getAllFeedback(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('type') type?: FeedbackType,
    @Query('status') status?: FeedbackStatus
  ) {
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const result = await this.feedbackService.getAllFeedback(
      pageNum,
      limitNum,
      type,
      status
    );

    return {
      message: 'All feedback retrieved successfully',
      ...result,
      feedback: result.feedback.map(item => ({
        id: item._id,
        message: item.message,
        rating: item.rating,
        type: item.type,
        subject: item.subject,
        status: item.status,
        adminResponse: item.adminResponse,
        userId: item.userId,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt
      }))
    };
  }

  @Get('stats')
  async getFeedbackStats() {
    const stats = await this.feedbackService.getFeedbackStats();

    return {
      message: 'Feedback statistics retrieved successfully',
      stats
    };
  }
}
