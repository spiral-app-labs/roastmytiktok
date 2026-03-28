export const BYPASS_COOKIE_NAME = 'rmt_bypass';
export const BYPASS_ENTRY_PATH = '/bypass';
export const BYPASS_SUCCESS_PATH = '/dashboard';

export function hasBypassAccess(value: string | undefined) {
  return value === '1';
}
