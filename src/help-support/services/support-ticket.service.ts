import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { SupportTicket, TicketStatus, TicketPriority, TicketCategory } from '../schemas/support-ticket.schema';

@Injectable()
export class SupportTicketService {
  constructor(
    @InjectModel(SupportTicket.name) private supportTicketModel: Model<SupportTicket>
  ) {}

  async createSupportTicket(
    userId: string,
    subject: string,
    description: string,
    category?: TicketCategory
  ): Promise<SupportTicket> {
    const ticketNumber = this.generateTicketNumber();
    
    const supportTicket = new this.supportTicketModel({
      userId: userId,
      subject,
      description,
      category: category || TicketCategory.GENERAL,
      ticketNumber,
      status: TicketStatus.PENDING,
      priority: TicketPriority.MEDIUM,
      messages: [{
        message: description,
        senderId: userId,
        isFromUser: true,
        createdAt: new Date()
      }]
    });

    return supportTicket.save();
  }

  async getUserSupportTickets(userId: string): Promise<SupportTicket[]> {
    return this.supportTicketModel
      .find({ userId: userId })
      .sort({ createdAt: -1 })
      .exec();
  }

  async getSupportTicketById(ticketId: string, userId: string): Promise<SupportTicket | null> {
    return this.supportTicketModel
      .findOne({ 
        _id: new Types.ObjectId(ticketId),
        userId: userId
      })
      .exec();
  }

  async addMessageToTicket(
    ticketId: string,
    userId: string,
    message: string
  ): Promise<SupportTicket | null> {
    return this.supportTicketModel
      .findOneAndUpdate(
        { 
          _id: new Types.ObjectId(ticketId),
          userId: userId
        },
        {
          $push: {
            messages: {
              message,
              senderId: userId,
              isFromUser: true,
              createdAt: new Date()
            }
          }
        },
        { new: true }
      )
      .exec();
  }

  private generateTicketNumber(): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `TKT-${timestamp.slice(-6)}-${random}`;
  }
}
