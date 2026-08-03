export type User = {
  id: string;
  email: string;
  phone?: string | null;
  type: 'individual' | 'company';
  firstName?: string | null;
  lastName?: string | null;
  kycStatus: 'pending' | 'verified' | 'rejected';
};

export type KycDocumentView = {
  id: string;
  type: 'identity_document' | 'proof_of_address';
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
};

export type KycStatus = {
  userId: string;
  status: 'pending' | 'verified' | 'rejected';
  reviewedAt?: string | null;
  rejectReason?: string | null;
  documents: KycDocumentView[];
};

export type Shop = {
  id: string;
  sellerId: string;
  name: string;
  description?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type Product = {
  id: string;
  shopId: string;
  name: string;
  price: string | number;
  photoKey?: string | null;
  qrPayload: string;
  qrCodeKey?: string;
};

export type SavingsInstallment = {
  id: string;
  goalId: string;
  sequence: number;
  dueDate: string;
  amount: string | number;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  paidAt?: string | null;
  payerName?: string | null;
  payerPhone?: string | null;
};

export type SavingsGoal = {
  id: string;
  userId: string;
  productId: string;
  mode: 'schedule' | 'flexi';
  targetAmount: string | number;
  savedAmount: string | number;
  status: 'active' | 'ready_for_withdrawal' | 'completed' | 'cancelled';
  ledgerAccountId: string;
  flexiStartsAt?: string | null;
  flexiEndsAt?: string | null;
  readyAt?: string | null;
  createdAt?: string;
  installments?: SavingsInstallment[];
  product?: Product & { shop?: { id: string; name: string; sellerId: string } };
  user?: Pick<User, 'id' | 'email' | 'phone' | 'firstName' | 'lastName'>;
  deposits?: Array<{
    id: string;
    amount: string | number;
    createdAt: string;
    installmentId?: string | null;
  }>;
};

export type PaymentLinkCreated = {
  id: string;
  token: string;
  installmentId: string;
  amount: string;
  status: string;
  expiresAt: string;
  publicUrl: string;
  ttlHours: number;
  mobileMoneyCollectionId?: string | null;
  collection?: {
    id: string;
    providerRef: string;
    status: string;
    ussdHint?: string | null;
    paymentUrl?: string;
    sandbox: boolean;
  };
};

export type NotificationItem = {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  metadata?: Record<string, unknown> | null;
  readAt?: string | null;
  createdAt: string;
};
