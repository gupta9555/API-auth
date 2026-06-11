import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  email: string;
  password: string;
  refreshToken?: string;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
    },
    refreshToken: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

// Hash password before saving
// mongoose v9 pre('save') with async — return promise instead of calling next()
UserSchema.pre('save', async function () {
  const doc = this as unknown as { isModified: (f: string) => boolean; password: string };
  if (!doc.isModified('password')) return;
  const salt = await bcrypt.genSalt(12);
  doc.password = await bcrypt.hash(doc.password, salt);
});

// Compare plain password with hashed
UserSchema.methods['comparePassword'] = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, (this as { password: string }).password);
};

export default mongoose.model<IUser>('User', UserSchema);
