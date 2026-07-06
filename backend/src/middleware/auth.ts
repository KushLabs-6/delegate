import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../config/db.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    username: string;
    isSystemAdmin: boolean;
  };
}

const JWT_SECRET = process.env.JWT_SECRET || 'local-development-secret-key-12345';

// Authenticate JWT token
export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = decoded as AuthenticatedRequest['user'];
    next();
  });
};

// Check if user has specific roles inside a business context
export const requireRole = (allowedRoles: string[]) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Check if user is System Admin, bypass business check
      if (req.user.isSystemAdmin) {
        return next();
      }

      // Find businessId from request (params, query, or body)
      const businessId = req.params.businessId || req.query.businessId as string || req.body.businessId;

      if (!businessId) {
        return res.status(400).json({ error: 'Business ID context is required for this action' });
      }

      // Query membership
      const membership = await prisma.businessMember.findUnique({
        where: {
          userId_businessId: {
            userId: req.user.id,
            businessId: businessId,
          },
        },
      });

      if (!membership) {
        return res.status(403).json({ error: 'You are not a member of this business' });
      }

      if (!allowedRoles.includes(membership.role)) {
        return res.status(403).json({ error: 'Insufficient permissions for this action' });
      }

      next();
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Authorization check failed' });
    }
  };
};

// Check if user is System Admin
export const requireSystemAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user || !req.user.isSystemAdmin) {
    return res.status(403).json({ error: 'System Administrator access required' });
  }
  next();
};
