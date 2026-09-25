import { AppError } from '@naija-bi/error-handling';
import { assertLoginInputIsValid } from '../validators/auth-validator';
import { verifyPassword } from '../services/password-service';
import { issueTokenPair } from './issue-token-pair';
import * as businessRepository from '../../data-access/business-repository';
import type { AppConfig } from '../../config';

interface LoginInput {
  email?: string;
  password?: string;
}

// ✅ Best Practice: identical error for "no such email" and "wrong
// password" — never let a login endpoint reveal whether an email is registered.
export async function login(input: LoginInput, config: AppConfig) {
  assertLoginInputIsValid(input);
  const email = input.email.toLowerCase().trim();

  const business = await businessRepository.findByEmail(email);
  const passwordMatches = business
    ? await verifyPassword(input.password, business.passwordHash)
    : false;

  if (!business || !passwordMatches) {
    throw new AppError('invalid-credentials', 'Email or password is incorrect', 401, false);
  }

  const { accessToken, refreshToken } = await issueTokenPair(business, config);

  return {
    accessToken,
    refreshToken,
    businessId: business._id,
    businessName: business.businessName,
  };
}
