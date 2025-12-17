import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RidesController } from './rides.controller';
import { RidesDashboardController } from './rides-dashboard.controller';
import { WebsocketsModule } from '../websockets/websockets.module';
import { UsersModule } from '../users/users.module';
import { VehicleDetailsModule } from '../vehicle-details/vehicle-details.module';
import { Ride, RideSchema } from '../websockets/schemas/ride.schema';
import { AuthModule } from '../auth/auth.module';
import { ChatModule } from '../chat/chat.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    WebsocketsModule, 
    UsersModule,
    VehicleDetailsModule,
    ChatModule,
    forwardRef(() => AuthModule),
    JwtModule.register({
      secretOrPrivateKey: process.env.JWT_SECRET,
      signOptions: { expiresIn: '7d' },
    }),
    MongooseModule.forFeature([{ name: Ride.name, schema: RideSchema }])
  ],
  controllers: [RidesController, RidesDashboardController],
})
export class RidesModule {}
