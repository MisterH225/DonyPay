import { apiRequest } from './client';
import type { SavingsGoal } from './types';

export function listGoals(userId: string) {
  return apiRequest<SavingsGoal[]>(`/savings-engine/users/${userId}/goals`);
}

export function getGoal(goalId: string) {
  return apiRequest<SavingsGoal>(`/savings-engine/goals/${goalId}`);
}

export function createGoal(input: {
  userId: string;
  productId: string;
  mode: 'schedule' | 'flexi';
  installments?: Array<{ dueDate: string; amount: number }>;
  flexiStartsAt?: string;
  flexiEndsAt?: string;
}) {
  return apiRequest<SavingsGoal>('/savings-engine/goals', {
    method: 'POST',
    body: JSON.stringify(input),
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
