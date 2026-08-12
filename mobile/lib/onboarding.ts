import 'expo-sqlite/localStorage/install';

const ONBOARDING_COMPLETE_KEY = '@go-stream/onboarding-complete';

export function hasCompletedOnboarding() {
  return typeof localStorage !== 'undefined' && localStorage.getItem(ONBOARDING_COMPLETE_KEY) === 'true';
}

export function completeOnboarding() {
  localStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
}

export function resetOnboarding() {
  localStorage.removeItem(ONBOARDING_COMPLETE_KEY);
}
