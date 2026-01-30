export const ROLES = {
  AGENT1: 'agent1',
  AGENT2: 'agent2',
  ACCOUNT: 'account',
  ADMIN: 'admin',
};

export const BOOKING_STATUS = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  PENDING_VERIFICATION: 'pending_verification',
  ACCOUNT_VERIFIED: 'account_verified',
  ADMIN_VERIFIED: 'admin_verified',
  BILLED: 'billed',
  PAID: 'paid',
};

export const SECTOR_TYPES = {
  ONE_WAY: 'one_way',
  ROUND_TRIP: 'round_trip',
  MULTIPLE: 'multiple',
};

export const PAYMENT_TYPES = {
  FULL_PAYMENT: 'full_payment',
  INSTALLMENTS: 'installments',
};

export const PAYMENT_MODES = {
  CASH: 'cash',
  CHEQUE: 'cheque',
  CREDIT_CARD: 'credit_card',
  UPI: 'upi',
  BANK_TRANSFER: 'bank_transfer',
};

export const MODIFICATION_TYPES = {
  DATE_CHANGE: 'date_change',
  FLIGHT_CHANGE: 'flight_change',
  CANCELLATION: 'cancellation',
};
