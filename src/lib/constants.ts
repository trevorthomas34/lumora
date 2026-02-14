export const APP_NAME = 'LumoraAI';
export const APP_DESCRIPTION = 'Ads that run themselves';

export const BUSINESS_GOALS = [
  { value: 'leads', label: 'Generate Leads', description: 'Get form submissions, calls, or sign-ups' },
  { value: 'purchases', label: 'Drive Purchases', description: 'Increase online sales and revenue' },
  { value: 'bookings', label: 'Get Bookings', description: 'Fill your calendar with appointments' },
  { value: 'traffic', label: 'Drive Traffic', description: 'Bring more visitors to your website' },
] as const;

export const BRAND_TONES = [
  'Professional',
  'Friendly',
  'Bold',
  'Casual',
  'Authoritative',
  'Playful',
  'Luxurious',
  'Down-to-earth',
] as const;

export const GUARDRAILS = {
  MAX_DAILY_BUDGET_INCREASE_PERCENT: 20,
  MAX_SINGLE_CHANGE_PERCENT: 30,
  MIN_HOURS_BETWEEN_CHANGES: 6,
  LEARNING_PHASE_HOURS: 72,
  MIN_CONVERSIONS_FOR_OPTIMIZATION: 10,
  FREQUENCY_CAP_WARNING: 3.0,
  CTR_DECLINE_THRESHOLD_PERCENT: 20,
} as const;

export const PLATFORMS = {
  meta: { name: 'Meta', icon: 'facebook', color: '#1877F2' },
  google_ads: { name: 'Google Ads', icon: 'search', color: '#4285F4' },
  google_drive: { name: 'Google Drive', icon: 'hard-drive', color: '#0F9D58' },
} as const;

export const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
  { href: '/campaigns', label: 'Campaigns', icon: 'Megaphone' },
  { href: '/brand-brief', label: 'Brand Brief', icon: 'FileText' },
  { href: '/assets', label: 'Assets', icon: 'Image' },
  { href: '/performance', label: 'Performance', icon: 'BarChart3' },
  { href: '/recommendations', label: 'Recommendations', icon: 'Lightbulb' },
  { href: '/action-log', label: 'Action Log', icon: 'ScrollText' },
  { href: '/settings', label: 'Settings', icon: 'Settings' },
] as const;
