import { Injectable } from '@nestjs/common';
import { FAQService } from '../services/faq.service';

@Injectable()
export class FAQSeeder {
  constructor(private readonly faqService: FAQService) {}

  async seedFAQs(): Promise<void> {
    try {
      await this.faqService.seedFAQs();
      console.log('FAQ seeding completed successfully');
    } catch (error) {
      console.error('Error seeding FAQs:', error);
      throw error;
    }
  }
}
