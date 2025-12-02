import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { WebsocketsGateway } from './websockets.gateway';
import { WebsocketsService } from './websockets.service';
import { ChatMessage, ChatMessageSchema } from './schemas/chat-message.schema';
import { UserLocation, UserLocationSchema } from './schemas/user-location.schema';
import { Ride, RideSchema } from './schemas/ride.schema';
import { RideMessage, RideMessageSchema } from '../models/ride-message.schema';
import { ChatModule } from '../chat/chat.module';
import { VehicleDetailsModule } from '../vehicle-details/vehicle-details.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ChatMessage.name, schema: ChatMessageSchema },
      { name: UserLocation.name, schema: UserLocationSchema },
      { name: Ride.name, schema: RideSchema },
      { name: RideMessage.name, schema: RideMessageSchema },
    ]),
    JwtModule.register({
      secretOrPrivateKey: process.env.JWT_SECRET,
      signOptions: { expiresIn: '7d' },
    }),
    forwardRef(() => ChatModule),
    VehicleDetailsModule,
  ],
  providers: [WebsocketsGateway, WebsocketsService],
  exports: [WebsocketsGateway, WebsocketsService],
})
export class WebsocketsModule {}
