import { Module, forwardRef } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from 'src/users/users.module';
import { SettingsModule } from 'src/settings/settings.module';
import { JwtStrategy } from './jwt.strategy';
import { AdminDashboardGuard } from './admin-dashboard.guard';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/users/users.schema';

@Module({
  imports: [
    forwardRef(() => UsersModule),
    SettingsModule,
    PassportModule,
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    JwtModule.register({
      secretOrPrivateKey: process.env.JWT_SECRET,
      signOptions: { expiresIn: '7d' }, // Adjust as needed
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, AdminDashboardGuard],
  exports: [AuthService, AdminDashboardGuard]
})
export class AuthModule {}
