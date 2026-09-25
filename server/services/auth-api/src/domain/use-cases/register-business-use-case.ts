import { AppError } from '@naija-bi/error-handling';
import { assertRegisterInputIsValid } from '../validators/auth-validator';
import { hashPassword } from '../services/password-service';
import { issueTokenPair } from './issue-token-pair';
import * as businessRepository from '../../data-access/business-repository';
import type { AppConfig } from '../../config';

interface RegisterInput {
  businessName?: string;
  email?: string;
  password?: string;
}

// ✅ Best Practice: registration issues a token pair immediately
// (auto-login) — one less round trip for a business signing up for the first time.
export async function registerBusiness(input: RegisterInput, config: AppConfig) {
  assertRegisterInputIsValid(input);
  const email = input.email.toLowerCase().trim();

  const existing = await businessRepository.findByEmail(email);
  if (existing) {
    throw new AppError('email-already-registered', 'An account with this email already exists', 409, false);
  }

  const passwordHash = await hashPassword(input.password, config.bcryptSaltRounds);
  const business = await businessRepository.save({
    businessName: input.businessName.trim(),
    email,
    passwordHash,
    createdAt: new Date(),
  });

  const { accessToken, refreshToken } = await issueTokenPair(business, config);

  return {
    accessToken,
    refreshToken,
    businessId: business._id,
    businessName: business.businessName,
  };
}
