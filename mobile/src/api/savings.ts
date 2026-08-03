import { apiRequest } from './client';
import type { SavingsGoal } from './types';

export function listGoals(_userId?: string) {
  return apiRequest<SavingsGoal[]>('/savings-engine/users/me/goals');
}

export function listSellerGoals(_sellerId?: string) {
  return apiRequest<SavingsGoal[]>('/savings-engine/sellers/me/goals');
}

export function getGoal(goalId: string) {
  return apiRequest<SavingsGoal>(`/savings-engine/goals/${goalId}`);
}

export function createGoal(input: {
  productId: string;
  mode: 'schedule' | 'flexi';
  userId?: string;
  installments?: Array<{ dueDate: string; amount: number }>;
  flexiStartsAt?: string;
  flexiEndsAt?: string;
}) {
  const { userId: _userId, ...body } = input;
  return apiRequest<SavingsGoal>('/savings-engine/goals', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function recordDeposit(
  goalId: string,
  input: { amount: number; installmentId?: string },
) {
  return apiRequest<SavingsGoal>(`/savings-engine/goals/${goalId}/deposits`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function confirmHandover(goalId: string, _sellerId?: string) {
  return apiRequest<SavingsGoal>(
    `/savings-engine/goals/${goalId}/confirm-handover`,
    { method: 'POST' },
  );
}
