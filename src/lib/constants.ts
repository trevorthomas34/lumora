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
  'Witty',
  'Empathetic',
  'Educational',
  'Inspirational',
  'Urgent',
] as const;

export const AGE_RANGES = [
  '18-24',
  '25-34',
  '35-44',
  '45-54',
  '55-64',
  '65+',
] as const;

export const GENDER_OPTIONS = [
  { value: 'all', label: 'All genders' },
  { value: 'primarily_men', label: 'Primarily men' },
  { value: 'primarily_women', label: 'Primarily women' },
] as const;

export const LOCATION_PRESETS = [
  'United States',
  'Canada',
  'United Kingdom',
  'Australia',
  'European Union',
  'Worldwide',
] as const;

export const US_STATE_PRESETS = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado',
  'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho',
  'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana',
  'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota',
  'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada',
  'New Hampshire', 'New Jersey', 'New Mexico', 'New York',
  'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon',
  'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
  'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
  'West Virginia', 'Wisconsin', 'Wyoming',
] as const;

export const US_CITIES_PRESETS = [
  'New York City', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix',
  'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose',
  'Austin', 'Jacksonville', 'Fort Worth', 'Columbus', 'Charlotte',
  'Indianapolis', 'San Francisco', 'Seattle', 'Denver', 'Nashville',
  'Oklahoma City', 'El Paso', 'Washington D.C.', 'Boston', 'Las Vegas',
  'Memphis', 'Louisville', 'Portland', 'Baltimore', 'Milwaukee',
  'Albuquerque', 'Tucson', 'Fresno', 'Sacramento', 'Atlanta',
  'Kansas City', 'Omaha', 'Colorado Springs', 'Raleigh', 'Long Beach',
  'Virginia Beach', 'Minneapolis', 'Tampa', 'New Orleans', 'Arlington',
  'Honolulu', 'Anaheim', 'Aurora', 'Corpus Christi', 'Riverside',
  'Lexington', 'St. Louis', 'Pittsburgh', 'Cincinnati', 'St. Paul',
  'Buffalo', 'Orlando', 'Baton Rouge', 'Reno', 'Durham', 'Madison',
  'Birmingham', 'Boise', 'Richmond', 'Spokane', 'Des Moines',
  'Scottsdale', 'Chandler', 'Fremont', 'Gilbert', 'San Bernardino',
  'Rochester', 'Norfolk', 'Miami', 'Detroit', 'Cleveland', 'Irvine',
  'Anchorage', 'Jersey City', 'Plano', 'Henderson', 'Lincoln',
  'Greensboro', 'St. Petersburg', 'Newark', 'Chula Vista', 'Laredo',
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
