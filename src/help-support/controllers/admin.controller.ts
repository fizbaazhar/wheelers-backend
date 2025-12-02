import { Controller, Post } from '@nestjs/common';
import { FAQSeeder } from '../seeders/faq.seeder';

@Controller('admin')
export class AdminController {
  constructor(private readonly faqSeeder: FAQSeeder) {}

  @Post('seed-faqs')
  async seedFAQs() {
    try {
      await this.faqSeeder.seedFAQs();
      return {
        message: 'FAQs seeded successfully',
        success: true
      };
    } catch (error) {
      return {
        message: 'Error seeding FAQs',
        error: error.message,
        success: false
      };
    }
  }
}
