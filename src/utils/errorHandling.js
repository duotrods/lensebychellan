import { AUTH_ERRORS } from './constants';

export const getAuthErrorMessage = (errorCode) => {
  return AUTH_ERRORS[errorCode] || 'An unexpected error occurred';
};

export class AppError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.code = code;
    this.details = details;
    this.name = 'AppError';
  }
}
