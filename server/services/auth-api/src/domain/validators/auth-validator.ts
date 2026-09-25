import { AppError } from '@naija-bi/error-handling';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface RegisterInput {
  businessName?: string;
  email?: string;
  password?: string;
}

interface LoginInput {
  email?: string;
  password?: string;
}

// ✅ Best Practice: validate at the domain boundary and throw AppError with
// isCatastrophic=false — these are expected user-input problems, not bugs.
export function assertRegisterInputIsValid(
  input: RegisterInput
): asserts input is Required<RegisterInput> {
  if (!input.businessName || input.businessName.trim().length < 2) {
    throw new AppError('invalid-business-name', 'businessName is required (min 2 characters)', 400, false);
  }
  if (!input.email || !EMAIL_REGEX.test(input.email)) {
    throw new AppError('invalid-email', 'A valid email is required', 400, false);
  }
  if (!input.password || input.password.length < 8) {
    throw new AppError('weak-password', 'Password must be at least 8 characters', 400, false);
  }
}

export function assertLoginInputIsValid(input: LoginInput): asserts input is Required<LoginInput> {
  if (!input.email || !EMAIL_REGEX.test(input.email)) {
    throw new AppError('invalid-email', 'A valid email is required', 400, false);
  }
  if (!input.password) {
    throw new AppError('missing-password', 'Password is required', 400, false);
  }
}
