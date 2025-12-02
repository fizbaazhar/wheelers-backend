import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from '../users/users.module';

// Schemas
import { SupportTicket, SupportTicketSchema } from './schemas/support-ticket.schema';
import { FAQ, FAQSchema } from './schemas/faq.schema';
import { Feedback, FeedbackSchema } from './schemas/feedback.schema';

// Services
import { SupportTicketService } from './services/support-ticket.service';
import { FAQService } from './services/faq.service';
import { FeedbackService } from './services/feedback.service';

// Controllers
import { SupportTicketController } from './controllers/support-ticket.controller';
import { FAQController } from './controllers/faq.controller';
import { FeedbackController } from './controllers/feedback.controller';
import { AdminController } from './controllers/admin.controller';

// Seeders
import { FAQSeeder } from './seeders/faq.seeder';

@Module({
  imports: [
    UsersModule,
    MongooseModule.forFeature([
      { name: SupportTicket.name, schema: SupportTicketSchema },
      { name: FAQ.name, schema: FAQSchema },
      { name: Feedback.name, schema: FeedbackSchema },
    ]),
  ],
  controllers: [
    SupportTicketController,
    FAQController,
    FeedbackController,
    AdminController,
  ],
  providers: [
    SupportTicketService,
    FAQService,
    FeedbackService,
    FAQSeeder,
  ],
  exports: [
    SupportTicketService,
    FAQService,
    FeedbackService,
    FAQSeeder,
  ],
})
export class HelpSupportModule {}
