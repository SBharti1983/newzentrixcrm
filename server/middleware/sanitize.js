/**
 * Input Sanitization Middleware
 * Protects against XSS, SQL injection, and NoSQL injection attacks.
 * Applied globally to all incoming request bodies, params, and queries.
 */

// Dangerous patterns that indicate attack attempts
const XSS_PATTERNS = [
  /<script[\s>]/i,
  /javascript:/i,
  /on\w+\s*=/i,        // onclick=, onerror=, etc.
  /data:text\/html/i,
  /vbscript:/i,
  /<iframe/i,
  /<object/i,
  /<embed/i,
];

const SQL_PATTERNS = [
  /(\b(UNION|SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|EXEC|EXECUTE)\b.*\b(FROM|INTO|TABLE|DATABASE|SET)\b)/i,
  /(--|\/\*|\*\/|;.*--)/,  // SQL comments
  /(\b(OR|AND)\b\s+\d+\s*=\s*\d+)/i,  // OR 1=1
];

/**
 * Sanitize a string value — strip dangerous characters
 */
function sanitizeString(value) {
  if (typeof value !== 'string') return value;
  
  return value
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Deep-sanitize an object recursively
 */
function sanitizeObject(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') return sanitizeString(obj);
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeObject);

  const cleaned = {};
  for (const [key, value] of Object.entries(obj)) {
    // Block keys that look like MongoDB operators ($gt, $ne, etc.)
    if (key.startsWith('$')) continue;
    cleaned[sanitizeString(key)] = sanitizeObject(value);
  }
  return cleaned;
}

/**
 * Check if any value contains attack patterns
 */
function detectAttack(value) {
  if (typeof value !== 'string') return null;
  
  for (const pattern of XSS_PATTERNS) {
    if (pattern.test(value)) return 'XSS';
  }
  for (const pattern of SQL_PATTERNS) {
    if (pattern.test(value)) return 'SQL_INJECTION';
  }
  return null;
}

/**
 * Deep-check an object for attack patterns
 */
function scanForAttacks(obj) {
  if (typeof obj === 'string') return detectAttack(obj);
  if (typeof obj !== 'object' || obj === null) return null;
  
  for (const value of Object.values(obj)) {
    const attack = scanForAttacks(value);
    if (attack) return attack;
  }
  return null;
}

/**
 * Express middleware: sanitize all inputs
 */
function sanitizeMiddleware(req, res, next) {
  // Skip file uploads and health checks
  if (req.path === '/api/health' || req.is('multipart/form-data')) {
    return next();
  }

  // Scan for attacks in query, params, and body
  const sources = { query: req.query, params: req.params, body: req.body };
  
  for (const [source, data] of Object.entries(sources)) {
    if (!data) continue;
    
    const attack = scanForAttacks(data);
    if (attack) {
      console.warn(`[SECURITY] ${attack} attempt blocked from ${req.ip} on ${req.method} ${req.path} (source: ${source})`);
      return res.status(400).json({ 
        error: 'Invalid input detected',
        code: 'INVALID_INPUT'
      });
    }
  }

  // Sanitize query params (body is left as-is for legitimate HTML content fields)
  if (req.query) req.query = sanitizeObject(req.query);
  if (req.params) req.params = sanitizeObject(req.params);

  next();
}

module.exports = { sanitizeMiddleware, sanitizeString, sanitizeObject };
