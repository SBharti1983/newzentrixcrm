import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Application } from 'express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ZentrixCRM API',
      version: '1.0.0',
      description: `
## Enterprise Real Estate CRM API

ZentrixCRM is a full-featured CRM platform for Indian real estate businesses.

### Authentication
All protected endpoints require a Bearer token in the Authorization header:
\`\`\`
Authorization: Bearer <your_jwt_token>
\`\`\`

### Rate Limiting
- **5000 requests** per 15-minute window per IP

### Base URL
- Production: \`https://zentrixcrmindia-production.up.railway.app/api\`
- Local: \`http://localhost:5050/api\`
      `,
      contact: {
        name: 'ZentrixCRM Support',
        email: 'support@zentrixcrm.com'
      }
    },
    servers: [
      { url: '/api', description: 'API Base' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Unauthorized' }
          }
        },
        Lead: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            name: { type: 'string', example: 'Rahul Sharma' },
            phone: { type: 'string', example: '+919876543210' },
            email: { type: 'string', example: 'rahul@example.com' },
            source: { type: 'string', example: '99acres' },
            status: { type: 'string', example: 'new' },
            budget: { type: 'string', example: '50L-1Cr' },
            project_interest: { type: 'string', example: 'Skyline Towers' },
            assigned_to: { type: 'integer', example: 5 },
            created_at: { type: 'string', format: 'date-time' }
          }
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            name: { type: 'string', example: 'Priya Patel' },
            email: { type: 'string', example: 'priya@company.com' },
            role: { type: 'string', enum: ['super_admin', 'admin', 'sales_manager', 'team_leader', 'agent'] },
            is_active: { type: 'boolean', example: true }
          }
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', example: 'admin@company.com' },
            password: { type: 'string', example: 'password123' }
          }
        },
        LoginResponse: {
          type: 'object',
          properties: {
            token: { type: 'string' },
            refreshToken: { type: 'string' },
            user: { $ref: '#/components/schemas/User' }
          }
        },
        HealthResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'ok' },
            services: {
              type: 'object',
              properties: {
                db: { type: 'boolean', example: true },
                redis: { type: 'boolean', example: true }
              }
            },
            environment: { type: 'string', example: 'production' },
            timestamp: { type: 'string', format: 'date-time' }
          }
        }
      }
    },
    security: [{ bearerAuth: [] }],
    paths: {
      '/health': {
        get: {
          tags: ['System'],
          summary: 'Health check',
          description: 'Returns server, database, and Redis status',
          security: [],
          responses: {
            200: { description: 'Server healthy', content: { 'application/json': { schema: { $ref: '#/components/schemas/HealthResponse' } } } },
            503: { description: 'Service degraded' }
          }
        }
      },
      '/auth/login': {
        post: {
          tags: ['Authentication'],
          summary: 'Login',
          description: 'Authenticate with email and password to receive JWT tokens',
          security: [],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } }
          },
          responses: {
            200: { description: 'Login successful', content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginResponse' } } } },
            401: { description: 'Invalid credentials' }
          }
        }
      },
      '/auth/refresh': {
        post: {
          tags: ['Authentication'],
          summary: 'Refresh token',
          description: 'Exchange a refresh token for a new access token',
          security: [],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', properties: { refreshToken: { type: 'string' } } } } }
          },
          responses: {
            200: { description: 'New token issued' },
            401: { description: 'Invalid refresh token' }
          }
        }
      },
      '/leads': {
        get: {
          tags: ['Leads'],
          summary: 'List leads',
          description: 'Get all leads with pagination, filtering, and search',
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
            { name: 'status', in: 'query', schema: { type: 'string' } },
            { name: 'search', in: 'query', schema: { type: 'string' } },
            { name: 'source', in: 'query', schema: { type: 'string' } },
            { name: 'assigned_to', in: 'query', schema: { type: 'integer' } }
          ],
          responses: {
            200: { description: 'Leads list with pagination' },
            401: { description: 'Unauthorized' }
          }
        },
        post: {
          tags: ['Leads'],
          summary: 'Create lead',
          description: 'Create a new lead entry',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Lead' } } }
          },
          responses: {
            201: { description: 'Lead created' },
            400: { description: 'Validation error' }
          }
        }
      },
      '/leads/{id}': {
        get: {
          tags: ['Leads'],
          summary: 'Get lead by ID',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { 200: { description: 'Lead details' }, 404: { description: 'Not found' } }
        },
        put: {
          tags: ['Leads'],
          summary: 'Update lead',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { 200: { description: 'Lead updated' } }
        },
        delete: {
          tags: ['Leads'],
          summary: 'Delete lead',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { 200: { description: 'Lead deleted' } }
        }
      },
      '/dashboard': {
        get: {
          tags: ['Dashboard'],
          summary: 'Dashboard stats',
          description: 'Get aggregated dashboard statistics based on user role',
          responses: { 200: { description: 'Dashboard data' } }
        }
      },
      '/users': {
        get: {
          tags: ['Users'],
          summary: 'List users',
          description: 'Get all users in the tenant (admin only)',
          responses: { 200: { description: 'Users list' } }
        }
      },
      '/calls': {
        get: {
          tags: ['Telephony'],
          summary: 'Call records',
          description: 'Get call history with recordings',
          responses: { 200: { description: 'Call records' } }
        }
      },
      '/analytics': {
        get: {
          tags: ['Analytics'],
          summary: 'Analytics data',
          description: 'Get performance analytics and reports',
          responses: { 200: { description: 'Analytics data' } }
        }
      },
      '/notifications': {
        get: {
          tags: ['Notifications'],
          summary: 'Get notifications',
          description: 'Get user notifications with read/unread status',
          responses: { 200: { description: 'Notifications list' } }
        }
      }
    }
  },
  apis: [] // We define paths inline above
};

export function setupSwagger(app: Application) {
  const specs = swaggerJsdoc(options);
  
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(specs, {
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info .title { font-size: 2rem; font-weight: 800; }
    `,
    customSiteTitle: 'ZentrixCRM API Documentation',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true
    }
  }));

  // JSON spec endpoint
  app.get('/api/docs.json', (req, res) => res.json(specs));
  
  console.log('✅ Swagger API docs available at /api/docs');
}

