/**
 * Device and Location Parser Utility
 * Parses user-agent strings and network request headers to identify device type,
 * operating system, browser, IP address, and geographic location.
 */

export interface ParsedDeviceInfo {
  deviceName: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  os: string;
  ipAddress: string;
  location: string;
}

export function parseDeviceAndLocation(
  ip: string,
  userAgent: string,
  headers: Record<string, any> = {},
): ParsedDeviceInfo {
  const ua = userAgent || '';

  // 1. Detect Device Type
  let deviceType: 'desktop' | 'mobile' | 'tablet' = 'desktop';
  if (/ipad|tablet|(android(?!.*mobile))/i.test(ua)) {
    deviceType = 'tablet';
  } else if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) {
    deviceType = 'mobile';
  }

  // 2. Detect Operating System
  let os = 'Unknown OS';
  if (/windows nt 10/i.test(ua)) os = 'Windows 11/10';
  else if (/windows nt/i.test(ua)) os = 'Windows';
  else if (/macintosh|mac os x/i.test(ua)) os = 'macOS';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
  else if (/linux/i.test(ua)) os = 'Linux';

  // 3. Detect Browser
  let browser = 'Unknown Browser';
  if (/edg/i.test(ua)) browser = 'Microsoft Edge';
  else if (/opr|opera/i.test(ua)) browser = 'Opera';
  else if (/chrome|crios/i.test(ua)) browser = 'Google Chrome';
  else if (/firefox|fxios/i.test(ua)) browser = 'Mozilla Firefox';
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Apple Safari';

  // Extract version if available
  const versionMatch = ua.match(/(chrome|safari|firefox|edg|opr)\/(\d+)/i);
  const version = versionMatch ? ` ${versionMatch[2]}` : '';
  const browserLabel = `${browser}${version}`;
  const deviceName = `${browserLabel} on ${os}`;

  // 4. Resolve IP & Location
  let cleanIp = (ip || '').replace(/^::ffff:/, '').trim();
  if (!cleanIp || cleanIp === '::1') cleanIp = '127.0.0.1';

  let location = 'India';

  // Extract from Cloudflare / AWS / Vercel geo headers if forwarded
  const headerCity = headers['cf-ipcity'] || headers['x-vercel-ip-city'] || headers['x-city'];
  const headerRegion = headers['cf-region'] || headers['x-vercel-ip-country-region'] || headers['x-region'];
  const headerCountry = headers['cf-ipcountry'] || headers['x-vercel-ip-country'] || headers['x-country'] || 'IN';

  if (headerCity) {
    location = `${headerCity}, ${headerRegion || ''} ${headerCountry}`.replace(/\s+,/, ',').trim();
  } else if (cleanIp === '127.0.0.1' || cleanIp.startsWith('192.168.') || cleanIp.startsWith('10.')) {
    location = 'Pune, Maharashtra, India (HQ Network)';
  } else {
    // Standard default for Kyros Solar enterprise headquarters in Maharashtra
    location = 'Maharashtra, India';
  }

  return {
    deviceName,
    deviceType,
    browser: browserLabel,
    os,
    ipAddress: cleanIp,
    location,
  };
}
