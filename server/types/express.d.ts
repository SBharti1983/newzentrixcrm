/**
 * ZentrixCRM — Express Request Augmentation
 * Extends the Express Request type to include auth properties
 */

import { Request } from 'express';
import { Server as SocketIOServer } from 'socket.io';

export interface JwtPayload {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId: string;
  avatar?: string;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
  tenantId: string;
  io?: SocketIOServer;
}

/** For routes that may or may not have authentication */
export interface MaybeAuthenticatedRequest extends Request {
  user?: JwtPayload;
  tenantId?: string;
  io?: SocketIOServer;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      tenantId?: string;
      io?: SocketIOServer;
    }
  }
}
