import { GUARDRAILS } from '../constants';
import type { ActionLog } from '@/types';

export interface GuardrailCheck {
  allowed: boolean;
  reason: string;
}

export function checkBudgetIncrease(currentBudget: number, newBudget: number, monthlyBudgetCap: number | null): GuardrailCheck {
  if (newBudget <= currentBudget) return { allowed: true, reason: '' };

  const increasePercent = ((newBudget - currentBudget) / currentBudget) * 100;
  if (increasePercent > GUARDRAILS.MAX_DAILY_BUDGET_INCREASE_PERCENT) {
    return { allowed: false, reason: `Budget increase of ${increasePercent.toFixed(0)}% exceeds max ${GUARDRAILS.MAX_DAILY_BUDGET_INCREASE_PERCENT}%.` };
  }

  if (monthlyBudgetCap && newBudget * 30 > monthlyBudgetCap) {
    return { allowed: false, reason: `New daily budget $${newBudget.toFixed(2)} would exceed monthly cap $${monthlyBudgetCap.toFixed(2)}.` };
  }

  return { allowed: true, reason: '' };
}

export function checkChangeThrottle(entityId: string, recentActions: ActionLog[]): GuardrailCheck {
  const entityActions = recentActions.filter(a => a.entity_id === entityId);
  if (entityActions.length === 0) return { allowed: true, reason: '' };

  const hoursSince = (Date.now() - new Date(entityActions[0].created_at).getTime()) / (1000 * 60 * 60);
  if (hoursSince < GUARDRAILS.MIN_HOURS_BETWEEN_CHANGES) {
    return { allowed: false, reason: `Last change ${hoursSince.toFixed(1)}h ago. Min ${GUARDRAILS.MIN_HOURS_BETWEEN_CHANGES}h between changes.` };
  }

  return { allowed: true, reason: '' };
}

export function checkLearningPhase(entityCreatedAt: string): GuardrailCheck {
  const hours = (Date.now() - new Date(entityCreatedAt).getTime()) / (1000 * 60 * 60);
  if (hours < GUARDRAILS.LEARNING_PHASE_HOURS) {
    return { allowed: false, reason: `Entity in learning phase (${hours.toFixed(0)} of ${GUARDRAILS.LEARNING_PHASE_HOURS}h). Avoid changes.` };
  }
  return { allowed: true, reason: '' };
}
