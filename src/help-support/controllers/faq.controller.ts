import { Controller, Get, Post, Param, Query, Body } from '@nestjs/common';
import { FAQService } from '../services/faq.service';
import { FAQCategory } from '../schemas/faq.schema';

@Controller('faqs')
export class FAQController {
  constructor(private readonly faqService: FAQService) {}

  @Get()
  async getAllFAQs(@Query('category') category?: FAQCategory) {
    let faqs;
    
    if (category) {
      faqs = await this.faqService.getFAQsByCategory(category);
    } else {
      faqs = await this.faqService.getAllFAQs();
    }

    return {
      message: 'FAQs retrieved successfully',
      faqs: faqs.map(faq => ({
        id: faq._id,
        question: faq.question,
        answer: faq.answer,
        category: faq.category,
        viewCount: faq.viewCount,
        helpfulCount: faq.helpfulCount,
        notHelpfulCount: faq.notHelpfulCount,
        createdAt: faq.createdAt
      }))
    };
  }

  @Get(':id')
  async getFAQById(@Param('id') id: string) {
    const faq = await this.faqService.getFAQById(id);

    if (!faq) {
      return {
        message: 'FAQ not found',
        faq: null
      };
    }

    return {
      message: 'FAQ retrieved successfully',
      faq: {
        id: faq._id,
        question: faq.question,
        answer: faq.answer,
        category: faq.category,
        viewCount: faq.viewCount,
        helpfulCount: faq.helpfulCount,
        notHelpfulCount: faq.notHelpfulCount,
        createdAt: faq.createdAt
      }
    };
  }

  @Post(':id/helpful')
  async markFAQHelpful(@Param('id') id: string, @Body() body: { isHelpful: boolean }) {
    const faq = await this.faqService.markFAQHelpful(id, body.isHelpful);

    if (!faq) {
      return {
        message: 'FAQ not found',
        faq: null
      };
    }

    return {
      message: 'FAQ feedback recorded successfully',
      faq: {
        id: faq._id,
        question: faq.question,
        helpfulCount: faq.helpfulCount,
        notHelpfulCount: faq.notHelpfulCount
      }
    };
  }
}
