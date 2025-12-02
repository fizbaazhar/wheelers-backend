import * as mongoose from 'mongoose';
import * as bcrypt from 'bcrypt';
import { config } from 'dotenv';
import { User, UserRole, UserStatus, UserSchema } from '../users/users.schema';

config();

async function createAdmin() {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MONGO_URI environment variable is not set');
    }

    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@wheelers.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const adminName = process.env.ADMIN_NAME || 'Admin User';
    const adminPhone = process.env.ADMIN_PHONE || '+1234567890';

    let UserModel;
    try {
      UserModel = mongoose.model('User');
    } catch {
      UserModel = mongoose.model('User', UserSchema);
    }

    const existingAdmin = await UserModel.findOne({ email: adminEmail }).exec();

    if (existingAdmin) {
      console.log('Admin user already exists. Updating password...');
      
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      
      await UserModel.updateOne(
        { email: adminEmail },
        {
          $set: {
            password: hashedPassword,
            role: UserRole.ADMIN,
            status: UserStatus.ACTIVE,
            fullName: adminName,
            phoneNumber: adminPhone,
            emailVerified: true,
            phoneVerified: true,
          }
        }
      ).exec();
      
      console.log('Admin user updated successfully!');
      console.log(`Email: ${adminEmail}`);
      console.log(`Password: ${adminPassword}`);
    } else {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);

      const adminUser = new UserModel({
        email: adminEmail,
        password: hashedPassword,
        phoneNumber: adminPhone,
        fullName: adminName,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        phoneVerified: true,
        memberSince: new Date(),
        lastActiveAt: new Date(),
      });

      await adminUser.save();
      console.log('Admin user created successfully!');
      console.log(`Email: ${adminEmail}`);
      console.log(`Password: ${adminPassword}`);
    }

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
}

createAdmin();

