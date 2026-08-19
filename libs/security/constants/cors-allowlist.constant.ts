/**
 * Static CORS allowlist, always trusted in addition to whatever is loaded
 * dynamically from `ClientDetails`. Mirrors legacy `src/constants/corsList.js`.
 */
export const STATIC_CORS_ALLOWLIST: readonly string[] = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',

  'https://api.nexinev.com',

  'https://slns-web-app.vercel.app',
  'https://slns-cpo-dashboard.vercel.app',
  'https://slns-admin-dashboard.vercel.app',

  'https://csms.lekhaevsolutions.com',
  'https://cpo.lekhaevsolutions.com',
  'https://web.lekhaevsolutions.com',
  'https://fleet.lekhaevsolutions.com',

  'https://admin.nexinev.com',
  'https://testadmin.nexinev.com',

  'https://test-cms.evechos.com',
];
