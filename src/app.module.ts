import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { HelpSupportModule } from './help-support/help-support.module';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { SavedPlacesModule } from './saved-places/saved-places.module';
import { SettingsModule } from './settings/settings.module';
import { NotificationsModule } from './notifications/notifications.module';
import { WebsocketsModule } from './websockets/websockets.module';
import { VehicleDetailsModule } from './vehicle-details/vehicle-details.module';
import { RidesModule } from './rides/rides.module';
import { ChatModule } from './chat/chat.module';
import { VerificationModule } from './verification/verification.module';
import { RatingsModule } from './ratings/ratings.module';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    HelpSupportModule,
    SavedPlacesModule,
    SettingsModule,
    NotificationsModule,
    WebsocketsModule,
    VehicleDetailsModule,
    RidesModule,
    ChatModule,
    VerificationModule,
    RatingsModule,
    ConfigModule.forRoot(),
    MongooseModule.forRoot(
      process.env.MONGODB_URI ?? (() => { throw new Error('MONGODB_URI is not defined'); })()
    ),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
