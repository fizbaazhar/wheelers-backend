import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatThread, ChatThreadSchema } from '../models/chat-thread.schema';
import { ChatMessage, ChatMessageSchema } from '../models/chat-message.schema';
import { RideMessage, RideMessageSchema } from '../models/ride-message.schema';
import { Ride, RideSchema } from '../websockets/schemas/ride.schema';
import { WebsocketsModule } from '../websockets/websockets.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ChatThread.name, schema: ChatThreadSchema },
      { name: ChatMessage.name, schema: ChatMessageSchema },
      { name: RideMessage.name, schema: RideMessageSchema },
      { name: Ride.name, schema: RideSchema },
    ]),
    forwardRef(() => WebsocketsModule),
  ],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
