export type KycPendingItem = {
  userId: string;
  email: string;
  phone?: string | null;
  type: string;
  firstName?: string | null;
  lastName?: string | null;
  companyName?: string | null;
  status: string;
  updatedAt: string;
  documents: Array<{
    id: string;
    type: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    uploadedAt: string;
  }>;
};

export type KycStatus = {
  userId: string;
  status: string;
  reviewedAt?: string | null;
  rejectReason?: string | null;
  documents: KycPendingItem['documents'];
};

export type LedgerAccount = {
  id: string;
  userId?: string | null;
  kind: string;
  createdAt: string;
  balance?: string | number;
  _count?: { entries: number };
};

export type LedgerEntry = {
  id: string;
  accountId: string;
  type: 'debit' | 'credit';
  amount: string | number;
  balanceAfter: string | number;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
};

export type DisputeListItem = {
  id: string;
  title: string;
  reason: string;
  status: string;
  subjectType: string;
  createdAt: string;
  openedBy?: {
    id: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
  };
  _count?: { messages: number; attachments: number };
};

export type DisputeDetail = DisputeListItem & {
  description: string;
  resolutionNote?: string | null;
  messages: Array<{
    id: string;
    authorId: string;
    body: string;
    createdAt: string;
  }>;
  attachments: Array<{
    id: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    createdAt: string;
  }>;
};
