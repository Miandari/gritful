/**
 * Challenge state utilities for determining active status and grace period
 */

export type ChallengeState =
  | 'upcoming'      // Challenge hasn't started yet
  | 'active'        // Challenge is within normal duration
  | 'grace_period'  // Challenge ended but within grace period
  | 'archived'      // Challenge is fully ended (past grace period)
  | 'ongoing';      // Ongoing challenge with no end date

export interface ChallengeStateResult {
  state: ChallengeState;
  isEntryAllowed: boolean;
  daysInGracePeriod: number | null;
  gracePeriodEndsAt: Date | null;
  daysRemainingInGrace: number | null;
}

export interface ChallengeForStateCheck {
  starts_at: string;
  ends_at: string | null;
  grace_period_days?: number | null;
  ended_at?: string | null;
}

/**
 * Determine the current state of a challenge
 * @param challenge - Challenge object with date fields
 * @param referenceDate - Date to check against (defaults to today)
 * @returns ChallengeStateResult with state and entry allowance
 */
export function getChallengeState(
  challenge: ChallengeForStateCheck,
  referenceDate: Date = new Date()
): ChallengeStateResult {
  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);

  const startDate = new Date(challenge.starts_at);
  startDate.setHours(0, 0, 0, 0);

  // Handle ongoing challenges (no end date and not manually ended)
  if (challenge.ends_at === null && !challenge.ended_at) {
    return {
      state: 'ongoing',
      isEntryAllowed: today >= startDate,
      daysInGracePeriod: null,
      gracePeriodEndsAt: null,
      daysRemainingInGrace: null,
    };
  }

  // Determine effective end date (ended_at for manually ended ongoing, otherwise ends_at)
  const effectiveEndDateStr = challenge.ended_at
    ? challenge.ended_at.split('T')[0]
    : challenge.ends_at;

  if (!effectiveEndDateStr) {
    return {
      state: 'ongoing',
      isEntryAllowed: today >= startDate,
      daysInGracePeriod: null,
      gracePeriodEndsAt: null,
      daysRemainingInGrace: null,
    };
  }

  const endDate = new Date(effectiveEndDateStr);
  endDate.setHours(0, 0, 0, 0);

  const gracePeriodDays = challenge.grace_period_days ?? 7;
  const gracePeriodEndDate = new Date(endDate);
  gracePeriodEndDate.setDate(gracePeriodEndDate.getDate() + gracePeriodDays);

  // Check if challenge hasn't started yet
  if (today < startDate) {
    return {
      state: 'upcoming',
      isEntryAllowed: false,
      daysInGracePeriod: null,
      gracePeriodEndsAt: null,
      daysRemainingInGrace: null,
    };
  }

  // Check if within normal active period (including the last day)
  if (today <= endDate) {
    return {
      state: 'active',
      isEntryAllowed: true,
      daysInGracePeriod: null,
      gracePeriodEndsAt: gracePeriodDays > 0 ? gracePeriodEndDate : null,
      daysRemainingInGrace: null,
    };
  }

  // Check if within grace period
  if (today <= gracePeriodEndDate && gracePeriodDays > 0) {
    const daysInGrace = Math.ceil(
      (today.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const daysRemaining = Math.ceil(
      (gracePeriodEndDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    return {
      state: 'grace_period',
      isEntryAllowed: true,
      daysInGracePeriod: daysInGrace,
      gracePeriodEndsAt: gracePeriodEndDate,
      daysRemainingInGrace: daysRemaining,
    };
  }

  // Challenge is fully archived (past grace period)
  return {
    state: 'archived',
    isEntryAllowed: false,
    daysInGracePeriod: null,
    gracePeriodEndsAt: null,
    daysRemainingInGrace: null,
  };
}

/**
 * Check if a challenge should appear in the Active tab
 * (active, grace_period, or ongoing)
 */
export function isActiveChallenge(challenge: ChallengeForStateCheck): boolean {
  const { state } = getChallengeState(challenge);
  return state === 'active' || state === 'grace_period' || state === 'ongoing';
}

/**
 * Check if a challenge should appear in the History tab
 * (archived only - past grace period)
 */
export function isHistoryChallenge(challenge: ChallengeForStateCheck): boolean {
  const { state } = getChallengeState(challenge);
  return state === 'archived';
}
