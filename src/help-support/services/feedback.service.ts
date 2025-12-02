import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Feedback, FeedbackType, FeedbackStatus } from '../schemas/feedback.schema';

@Injectable()
export class FeedbackService {
  constructor(
    @InjectModel(Feedback.name) private feedbackModel: Model<Feedback>
  ) {}

  async createOrUpdateFeedback(
    userId: string,
    message: string,
    rating?: number,
    type: FeedbackType = FeedbackType.GENERAL_FEEDBACK,
    subject?: string
  ): Promise<Feedback> {
    const feedbackData = {
      userId: new Types.ObjectId(userId),
      message,
      rating,
      type,
      subject,
      status: FeedbackStatus.PENDING
    };

    return this.feedbackModel.findOneAndUpdate(
      { userId: new Types.ObjectId(userId) },
      feedbackData,
      { 
        new: true, 
        upsert: true, 
        runValidators: true 
      }
    ).exec();
  }

  async getUserFeedback(userId: string): Promise<Feedback | null> {
    return this.feedbackModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .exec();
  }

  async getAllFeedback(
    page: number = 1,
    limit: number = 10,
    type?: FeedbackType,
    status?: FeedbackStatus
  ): Promise<{ feedback: Feedback[]; total: number; page: number; totalPages: number }> {
    const filter: any = {};
    if (type) filter.type = type;
    if (status) filter.status = status;

    const skip = (page - 1) * limit;
    
    const [feedback, total] = await Promise.all([
      this.feedbackModel
        .find(filter)
        .populate('userId', 'fullName email phoneNumber')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.feedbackModel.countDocuments(filter)
    ]);

    return {
      feedback,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  async getFeedbackById(id: string): Promise<Feedback | null> {
    return this.feedbackModel
      .findById(id)
      .populate('userId', 'fullName email phoneNumber')
      .exec();
  }

  async updateFeedbackStatus(
    id: string,
    status: FeedbackStatus,
    adminResponse?: string,
    reviewedBy?: string
  ): Promise<Feedback | null> {
    const updateData: any = { status };
    
    if (adminResponse) updateData.adminResponse = adminResponse;
    if (reviewedBy) updateData.reviewedBy = reviewedBy;
    if (status === FeedbackStatus.REVIEWED) updateData.reviewedAt = new Date();

    return this.feedbackModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();
  }

  async getFeedbackStats(): Promise<{
    total: number;
    averageRating: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
  }> {
    const [total, ratingStats, typeStats, statusStats] = await Promise.all([
      this.feedbackModel.countDocuments(),
      this.feedbackModel.aggregate([
        { $match: { rating: { $exists: true, $ne: null } } },
        { $group: { _id: null, averageRating: { $avg: '$rating' } } }
      ]),
      this.feedbackModel.aggregate([
        { $group: { _id: '$type', count: { $sum: 1 } } }
      ]),
      this.feedbackModel.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ])
    ]);

    const averageRating = ratingStats.length > 0 ? ratingStats[0].averageRating : 0;
    const byType = typeStats.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});
    const byStatus = statusStats.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    return {
      total,
      averageRating: Math.round(averageRating * 100) / 100,
      byType,
      byStatus
    };
  }
}
