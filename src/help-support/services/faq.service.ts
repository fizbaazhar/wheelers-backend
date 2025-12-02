import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FAQ, FAQCategory } from '../schemas/faq.schema';

@Injectable()
export class FAQService {
  constructor(
    @InjectModel(FAQ.name) private faqModel: Model<FAQ>
  ) {}

  async getAllFAQs(): Promise<FAQ[]> {
    return this.faqModel
      .find({ isActive: true })
      .sort({ category: 1, createdAt: -1 })
      .exec();
  }

  async getFAQsByCategory(category: FAQCategory): Promise<FAQ[]> {
    return this.faqModel
      .find({ category, isActive: true })
      .sort({ createdAt: -1 })
      .exec();
  }

  async getFAQById(id: string): Promise<FAQ | null> {
    const faq = await this.faqModel.findById(id).exec();
    if (faq) {
      // Increment view count
      await this.faqModel.findByIdAndUpdate(id, { $inc: { viewCount: 1 } }).exec();
    }
    return faq;
  }

  async createFAQ(question: string, answer: string, category: FAQCategory): Promise<FAQ> {
    const faq = new this.faqModel({
      question,
      answer,
      category,
      isActive: true,
      viewCount: 0,
      helpfulCount: 0,
      notHelpfulCount: 0
    });

    return faq.save();
  }

  async markFAQHelpful(id: string, isHelpful: boolean): Promise<FAQ | null> {
    const updateField = isHelpful ? 'helpfulCount' : 'notHelpfulCount';
    return this.faqModel
      .findByIdAndUpdate(
        id,
        { $inc: { [updateField]: 1 } },
        { new: true }
      )
      .exec();
  }

  async seedFAQs(): Promise<void> {
    const existingFAQs = await this.faqModel.countDocuments();
    if (existingFAQs > 0) {
      console.log('FAQs already exist, skipping seed');
      return;
    }

    const faqs = [
      {
        question: 'How do I cancel a ride?',
        answer: 'To cancel a ride, go to your active ride and tap the "Cancel Ride" button. You can cancel within the first 2 minutes without any charges. After that, cancellation fees may apply.',
        category: FAQCategory.RIDES
      },
      {
        question: 'How do I add money to my wallet?',
        answer: 'You can add money to your wallet by going to the Wallet section in the app and selecting "Add Money". You can use credit/debit cards, bank transfers, or digital payment methods.',
        category: FAQCategory.PAYMENT
      },
      {
        question: 'What safety measures are in place?',
        answer: 'We have 24/7 safety monitoring, driver background checks, real-time ride tracking, emergency button, and ride sharing with trusted contacts. All drivers are verified and vehicles are inspected regularly.',
        category: FAQCategory.SAFETY
      },
      {
        question: 'How is the fare calculated?',
        answer: 'Fare is calculated based on distance, time, demand, and base fare. You can see the estimated fare before booking. Surge pricing may apply during peak hours or high demand.',
        category: FAQCategory.PRICING
      },
      {
        question: 'How do I update my profile information?',
        answer: 'Go to Profile > Edit Profile to update your personal information, emergency contacts, and preferences. Make sure to keep your information up to date for safety and service purposes.',
        category: FAQCategory.ACCOUNT
      }
    ];

    await this.faqModel.insertMany(faqs);
    console.log('FAQs seeded successfully');
  }
}
