import { SelectOption } from '../components/ui/CustomSelect';

/**
 * Complete list of all 55 Districts, Major Industrial Clusters, and Solar Growth Centers
 * in Madhya Pradesh (MP), organized by Metro Hubs, Growth Centers, and All Districts alphabetically.
 */
export const MP_CITIES: SelectOption[] = [
  // Top MP Tier-1 Solar Hubs
  { value: 'Indore', label: 'Indore', group: 'Madhya Pradesh (MP) — Major Metro Hubs', hint: 'Commercial & Malwa Solar Capital' },
  { value: 'Bhopal', label: 'Bhopal', group: 'Madhya Pradesh (MP) — Major Metro Hubs', hint: 'State Capital & Smart City' },
  { value: 'Jabalpur', label: 'Jabalpur', group: 'Madhya Pradesh (MP) — Major Metro Hubs', hint: 'Mahakoshal Regional Hub' },
  { value: 'Gwalior', label: 'Gwalior', group: 'Madhya Pradesh (MP) — Major Metro Hubs', hint: 'Gwalior-Chambal Industrial Hub' },
  { value: 'Ujjain', label: 'Ujjain', group: 'Madhya Pradesh (MP) — Major Metro Hubs', hint: 'Smart City & Renewable Zone' },

  // Key Commercial, Industrial & Solar Growth Clusters in MP
  { value: 'Pithampur', label: 'Pithampur', group: 'Madhya Pradesh (MP) — Industrial & Growth Hubs', hint: 'Automobile, Pharma & Solar SEZ (Dhar)' },
  { value: 'Mandideep', label: 'Mandideep', group: 'Madhya Pradesh (MP) — Industrial & Growth Hubs', hint: 'Heavy Industrial Cluster (Raisen)' },
  { value: 'Dewas', label: 'Dewas', group: 'Madhya Pradesh (MP) — Industrial & Growth Hubs', hint: 'Industrial Corridor & Wind/Solar Site' },
  { value: 'Nagda', label: 'Nagda', group: 'Madhya Pradesh (MP) — Industrial & Growth Hubs', hint: 'Chemical & Industrial Zone (Ujjain)' },
  { value: 'Singrauli', label: 'Singrauli', group: 'Madhya Pradesh (MP) — Industrial & Growth Hubs', hint: 'Energy Capital of India' },
  { value: 'Itarsi', label: 'Itarsi', group: 'Madhya Pradesh (MP) — Industrial & Growth Hubs', hint: 'Key Central Logistics & Railway Hub' },
  { value: 'Mhow', label: 'Mhow (Dr. Ambedkar Nagar)', group: 'Madhya Pradesh (MP) — Industrial & Growth Hubs', hint: 'Indore Metropolitan Suburb' },
  { value: 'Sanwer', label: 'Sanwer', group: 'Madhya Pradesh (MP) — Industrial & Growth Hubs', hint: 'Indore Agro-Industrial Belt' },
  { value: 'Bina', label: 'Bina', group: 'Madhya Pradesh (MP) — Industrial & Growth Hubs', hint: 'Refinery & Thermal/Solar Hub (Sagar)' },
  { value: 'Ganj Basoda', label: 'Ganj Basoda', group: 'Madhya Pradesh (MP) — Industrial & Growth Hubs', hint: 'Grain & Agro-Solar Hub (Vidisha)' },
  { value: 'Sendhwa', label: 'Sendhwa', group: 'Madhya Pradesh (MP) — Industrial & Growth Hubs', hint: 'Cotton & Solar Hub (Barwani)' },
  { value: 'Jaora', label: 'Jaora', group: 'Madhya Pradesh (MP) — Industrial & Growth Hubs', hint: 'Agri-Processing Hub (Ratlam)' },
  { value: 'Ashta', label: 'Ashta', group: 'Madhya Pradesh (MP) — Industrial & Growth Hubs', hint: 'Bhopal-Indore Corridor (Sehore)' },

  // All 55 Districts of Madhya Pradesh (Strict Alphabetical Order)
  { value: 'Agar Malwa', label: 'Agar Malwa', group: 'Madhya Pradesh (MP) — All 55 Districts' },
  { value: 'Alirajpur', label: 'Alirajpur', group: 'Madhya Pradesh (MP) — All 55 Districts' },
  { value: 'Anuppur', label: 'Anuppur', group: 'Madhya Pradesh (MP) — All 55 Districts' },
  { value: 'Ashoknagar', label: 'Ashoknagar', group: 'Madhya Pradesh (MP) — All 55 Districts' },
  { value: 'Balaghat', label: 'Balaghat', group: 'Madhya Pradesh (MP) — All 55 Districts' },
  { value: 'Barwani', label: 'Barwani', group: 'Madhya Pradesh (MP) — All 55 Districts' },
  { value: 'Betul', label: 'Betul', group: 'Madhya Pradesh (MP) — All 55 Districts' },
  { value: 'Bhind', label: 'Bhind', group: 'Madhya Pradesh (MP) — All 55 Districts' },
  { value: 'Bhopal', label: 'Bhopal', group: 'Madhya Pradesh (MP) — All 55 Districts' },
  { value: 'Burhanpur', label: 'Burhanpur', group: 'Madhya Pradesh (MP) — All 55 Districts' },
  { value: 'Chhatarpur', label: 'Chhatarpur', group: 'Madhya Pradesh (MP) — All 55 Districts' },
  { value: 'Chhindwara', label: 'Chhindwara', group: 'Madhya Pradesh (MP) — All 55 Districts' },
  { value: 'Damoh', label: 'Damoh', group: 'Madhya Pradesh (MP) — All 55 Districts' },
  { value: 'Datia', label: 'Datia', group: 'Madhya Pradesh (MP) — All 55 Districts' },
  { value: 'Dewas', label: 'Dewas', group: 'Madhya Pradesh (MP) — All 55 Districts' },
  { value: 'Dhar', label: 'Dhar', group: 'Madhya Pradesh (MP) — All 55 Districts' },
  { value: 'Dindori', label: 'Dindori', group: 'Madhya Pradesh (MP) — All 55 Districts' },
  { value: 'Guna', label: 'Guna', group: 'Madhya Pradesh (MP) — All 55 Districts' },
  { value: 'Gwalior', label: 'Gwalior', group: 'Madhya Pradesh (MP) — All 55 Districts' },
  { value: 'Harda', label: 'Harda', group: 'Madhya Pradesh (MP) — All 55 Districts' },
  { value: 'Hoshangabad', label: 'Hoshangabad (Narmadapuram)', group: 'Madhya Pradesh (MP) — All 55 Districts' },
  { value: 'Indore', label: 'Indore', group: 'Madhya Pradesh (MP) — All 55 Districts' },
  { value: 'Jabalpur', label: 'Jabalpur', group: 'Madhya Pradesh (MP) — All 55 Districts' },
  { value: 'Jhabua', label: 'Jhabua', group: 'Madhya Pradesh (MP) — All 55 Districts' },
  { value: 'Katni', label: 'Katni (Murwara)', group: 'Madhya Pradesh (MP) — All 55 Districts' },
  { value: 'Khandwa', label: 'Khandwa (East Nimar)', group: 'Madhya Pradesh (MP) — All 55 Districts' },
  { value: 'Khargone', label: 'Khargone (West Nimar)', group: 'Madhya Pradesh (MP) — All 55 Districts' },
  { value: 'Maihar', label: 'Maihar', group: 'Madhya Pradesh (MP) — All 55 Districts', hint: 'New District' },
  { value: 'Mandla', label: 'Mandla', group: 'Madhya Pradesh (MP) — All 55 Districts' },
  { value: 'Mandsaur', label: 'Mandsaur', group: 'Madhya Pradesh (MP) — All 55 Districts' },
  { value: 'Mauganj', label: 'Mauganj', group: 'Madhya Pradesh (MP) — All 55 Districts', hint: 'New District' },
  { value: 'Morena', label: 'Morena', group: 'Madhya Pradesh (MP) — All 55 Districts' },
  { value: 'Narsinghpur', label: 'Narsinghpur', group: 'Madhya Pradesh (MP) — All 55 Districts' },
  { value: 'Neemuch', label: 'Neemuch', group: 'Madhya Pradesh (MP) — All 55 Districts' },
  { value: 'Niwari', label: 'Niwari', group: 'Madhya Pradesh (MP) — All 55 Districts' },
  { value: 'Pandhurna', label: 'Pandhurna', group: 'Madhya Pradesh (MP) — All 55 Districts', hint: 'New District' },
  { value: 'Panna', label: 'Panna', group: 'Madhya Pradesh (MP) — All 55 Districts' },
  { value: 'Raisen', label: 'Raisen', group: 'Madhya Pradesh (MP) — All 55 Districts' },
  { value: 'Rajgarh', label: 'Rajgarh', group: 'Madhya Pradesh (MP) — All 55 Districts' },
  { value: 'Ratlam', label: 'Ratlam', group: 'Madhya Pradesh (MP) — All 55 Districts' },
  { value: 'Rewa', label: 'Rewa', group: 'Madhya Pradesh (MP) — All 55 Districts' },
  { value: 'Sagar', label: 'Sagar', group: 'Madhya Pradesh (MP) — All 55 Districts' },
  { value: 'Satna', label: 'Satna', group: 'Madhya Pradesh (MP) — All 55 Districts' },
  { value: 'Sehore', label: 'Sehore', group: 'Madhya Pradesh (MP) — All 55 Districts' },
  { value: 'Seoni', label: 'Seoni', group: 'Madhya Pradesh (MP) — All 55 Districts' },
  { value: 'Shahdol', label: 'Shahdol', group: 'Madhya Pradesh (MP) — All 55 Districts' },
  { value: 'Shajapur', label: 'Shajapur', group: 'Madhya Pradesh (MP) — All 55 Districts' },
  { value: 'Sheopur', label: 'Sheopur', group: 'Madhya Pradesh (MP) — All 55 Districts' },
  { value: 'Shivpuri', label: 'Shivpuri', group: 'Madhya Pradesh (MP) — All 55 Districts' },
  { value: 'Sidhi', label: 'Sidhi', group: 'Madhya Pradesh (MP) — All 55 Districts' },
  { value: 'Singrauli', label: 'Singrauli', group: 'Madhya Pradesh (MP) — All 55 Districts' },
  { value: 'Tikamgarh', label: 'Tikamgarh', group: 'Madhya Pradesh (MP) — All 55 Districts' },
  { value: 'Ujjain', label: 'Ujjain', group: 'Madhya Pradesh (MP) — All 55 Districts' },
  { value: 'Umaria', label: 'Umaria', group: 'Madhya Pradesh (MP) — All 55 Districts' },
  { value: 'Vidisha', label: 'Vidisha', group: 'Madhya Pradesh (MP) — All 55 Districts' },

  // Key Regional Neighbouring Hubs
  { value: 'Pune', label: 'Pune', group: 'Regional Hubs (Maharashtra)' },
  { value: 'Mumbai', label: 'Mumbai', group: 'Regional Hubs (Maharashtra)' },
  { value: 'Nagpur', label: 'Nagpur', group: 'Regional Hubs (Maharashtra)' },
  { value: 'Nashik', label: 'Nashik', group: 'Regional Hubs (Maharashtra)' },
  { value: 'Aurangabad', label: 'Aurangabad (Chhatrapati Sambhajinagar)', group: 'Regional Hubs (Maharashtra)' },
];

/**
 * Standardized lead acquisition sources prominently featuring Company Data,
 * Self Generated, Inbound, WhatsApp, and Partner Channels.
 */
export const LEAD_SOURCES: SelectOption[] = [
  // Direct & Company Sources
  {
    value: 'company_data',
    label: 'Company Data (Cold Sheet / Database)',
    group: 'Company & Direct Outreach',
    hint: 'Central master database / Telecaller cold prospect sheet',
  },
  {
    value: 'self',
    label: 'Self Generated (Direct Staff Outreach)',
    group: 'Company & Direct Outreach',
    hint: 'Sales Executive / Telecaller personal network',
  },
  {
    value: 'inbound_call',
    label: 'Direct Helpline / Inbound Call',
    group: 'Company & Direct Outreach',
    hint: 'Customer dialed toll-free or sales office line',
  },
  {
    value: 'walk_in',
    label: 'Branch Office Walk-in',
    group: 'Company & Direct Outreach',
    hint: 'Walk-in customer inquiry at regional branch',
  },
  {
    value: 'referral',
    label: 'Customer Referral',
    group: 'Company & Direct Outreach',
    hint: 'Referred by existing solar plant client',
  },

  // Field & Channel Partner Channels
  {
    value: 'field_canvassing',
    label: 'Field Canvassing / Door-to-Door',
    group: 'Field & Partner Network',
    hint: 'Rooftop survey scout & local prospecting',
  },
  {
    value: 'channel_partner',
    label: 'Solar Ambassador / Channel Partner',
    group: 'Field & Partner Network',
    hint: 'Electrical contractor / Local dealer network',
  },
  {
    value: 'exhibition_expo',
    label: 'Kisan Mela / Agri & Solar Expo',
    group: 'Field & Partner Network',
    hint: 'Trade stall & expo lead capture',
  },

  // Digital & Performance Marketing
  {
    value: 'whatsapp',
    label: 'WhatsApp Direct Outreach',
    group: 'Digital Marketing & Ads',
    hint: 'Official WhatsApp Business click-to-chat',
  },
  {
    value: 'fb_ads',
    label: 'Facebook & Instagram Ads',
    group: 'Digital Marketing & Ads',
    hint: 'Meta Lead Gen campaigns',
  },
  {
    value: 'google_ads',
    label: 'Google Search Ads',
    group: 'Digital Marketing & Ads',
    hint: 'Google PPC High-Intent search leads',
  },
  {
    value: 'website',
    label: 'Official Website Portal',
    group: 'Digital Marketing & Ads',
    hint: 'Online savings calculator & website inquiry',
  },
  {
    value: 'print_media',
    label: 'Newspaper & Print Media',
    group: 'Digital Marketing & Ads',
    hint: 'Local newspaper pamphlets & hoarding ads',
  },
  {
    value: 'other',
    label: 'Other Miscellaneous Source',
    group: 'Other',
    hint: 'Unspecified external channel',
  },
];

/**
 * Helper to retrieve a human-friendly formatted label and badge color classes for a lead source.
 */
export function formatLeadSource(source?: string): { label: string; badgeClass: string } {
  const s = (source || '').toLowerCase().trim();
  switch (s) {
    case 'company_data':
    case 'company_database':
    case 'company':
      return {
        label: 'Company Data',
        badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
      };
    case 'self':
    case 'self_generated':
      return {
        label: 'Self Generated',
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
      };
    case 'whatsapp':
    case 'whatsapp_direct':
      return {
        label: 'WhatsApp',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      };
    case 'referral':
      return {
        label: 'Referral',
        badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
      };
    case 'walk_in':
      return {
        label: 'Walk-in',
        badgeClass: 'bg-teal-50 text-teal-700 border-teal-200',
      };
    case 'inbound_call':
      return {
        label: 'Helpline Call',
        badgeClass: 'bg-cyan-50 text-cyan-700 border-cyan-200',
      };
    case 'field_canvassing':
      return {
        label: 'Canvassing',
        badgeClass: 'bg-orange-50 text-orange-700 border-orange-200',
      };
    case 'channel_partner':
      return {
        label: 'Partner',
        badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      };
    case 'fb_ads':
    case 'facebook_ads':
      return {
        label: 'Facebook Ads',
        badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
      };
    case 'google_ads':
      return {
        label: 'Google Ads',
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
      };
    case 'website':
      return {
        label: 'Website',
        badgeClass: 'bg-slate-50 text-slate-700 border-slate-200',
      };
    default:
      return {
        label: source ? source.replace(/_/g, ' ') : 'Unassigned',
        badgeClass: 'bg-slate-50 text-slate-600 border-slate-200',
      };
  }
}
