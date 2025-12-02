import { Controller, Get, Post, Body, UseGuards, Request, Param } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { SupportTicketService } from '../services/support-ticket.service';
import { TicketCategory } from '../schemas/support-ticket.schema';

@Controller('support-tickets')
@UseGuards(JwtAuthGuard)
export class SupportTicketController {
  constructor(private readonly supportTicketService: SupportTicketService) {}

  @Post()
  async createSupportTicket(
    @Request() req,
    @Body() createTicketDto: {
      subject: string;
      description: string;
      category?: TicketCategory;
    }
  ) {
    const ticket = await this.supportTicketService.createSupportTicket(
      req.user.userId, // Using actual user ID from database
      createTicketDto.subject,
      createTicketDto.description,
      createTicketDto.category
    );

    return {
      message: 'Support ticket created successfully',
      ticket: {
        id: ticket._id,
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
        description: ticket.description,
        category: ticket.category,
        status: ticket.status,
        priority: ticket.priority,
        createdAt: ticket.createdAt
      }
    };
  }

  @Get()
  async getUserSupportTickets(@Request() req) {
    const tickets = await this.supportTicketService.getUserSupportTickets(
      req.user.userId // Using actual user ID from database
    );

    return {
      message: 'Support tickets retrieved successfully',
      tickets: tickets.map(ticket => ({
        id: ticket._id,
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
        description: ticket.description,
        category: ticket.category,
        status: ticket.status,
        priority: ticket.priority,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt
      }))
    };
  }

  @Get(':id')
  async getSupportTicketById(@Request() req, @Param('id') id: string) {
    const ticket = await this.supportTicketService.getSupportTicketById(
      id,
      req.user.userId // Using actual user ID from database
    );

    if (!ticket) {
      return {
        message: 'Support ticket not found',
        ticket: null
      };
    }

    return {
      message: 'Support ticket retrieved successfully',
      ticket: {
        id: ticket._id,
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
        description: ticket.description,
        category: ticket.category,
        status: ticket.status,
        priority: ticket.priority,
        messages: ticket.messages,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt
      }
    };
  }

  @Post(':id/messages')
  async addMessageToTicket(
    @Request() req,
    @Param('id') id: string,
    @Body() messageDto: { message: string }
  ) {
    const ticket = await this.supportTicketService.addMessageToTicket(
      id,
      req.user.userId, // Using actual user ID from database
      messageDto.message
    );

    if (!ticket) {
      return {
        message: 'Support ticket not found or access denied',
        ticket: null
      };
    }

    return {
      message: 'Message added to support ticket successfully',
      ticket: {
        id: ticket._id,
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
        status: ticket.status,
        messages: ticket.messages,
        updatedAt: ticket.updatedAt
      }
    };
  }
}
