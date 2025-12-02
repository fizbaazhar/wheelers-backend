import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../users/users.service';
import { User } from '../users/users.schema';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(private usersService: UsersService) {
        const jwtSecret = process.env.JWT_SECRET;

        if (!jwtSecret) {
            throw new Error('JWT_SECRET environment variable is not set');
        }
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: jwtSecret,
        });
    }

    async validate(payload: any) {
        if (payload.email && payload.role) {
            const user: User | null = await this.usersService.findByEmail(payload.email);
            if (!user) {
                return null;
            }
            return { 
                id: (user as any)._id.toString(), 
                userId: (user as any)._id.toString(),
                email: user.email,
                role: user.role
            };
        }

        const user: User | null = await this.usersService.findByPhone(payload.phoneNumber);
        if (!user) {
            return null;
        }
        return { 
            id: (user as any)._id.toString(), 
            userId: (user as any)._id.toString(),
            phoneNumber: payload.phoneNumber 
        };
    }
}