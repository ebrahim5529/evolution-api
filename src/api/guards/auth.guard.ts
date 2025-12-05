import { InstanceDto } from '@api/dto/instance.dto';
import { prismaRepository } from '@api/server.module';
import { Auth, configService, Database } from '@config/env.config';
import { Logger } from '@config/logger.config';
import { ForbiddenException, UnauthorizedException } from '@exceptions';
import { NextFunction, Request, Response } from 'express';

const logger = new Logger('GUARD');

declare global {
  namespace Express {
    interface Request {
      saasUserId?: string;
      isGlobalAdmin?: boolean;
      authType?: 'global' | 'saas_user' | 'instance_token';
    }
  }
}

async function apikey(req: Request, _: Response, next: NextFunction) {
  const env = configService.get<Auth>('AUTHENTICATION').API_KEY;
  const key = req.get('apikey');
  const db = configService.get<Database>('DATABASE');

  if (!key) {
    throw new UnauthorizedException();
  }

  if (env.KEY === key) {
    req.isGlobalAdmin = true;
    req.authType = 'global';
    return next();
  }

  if (key.startsWith('evo_')) {
    try {
      const saasUser = await prismaRepository.saasUser.findUnique({
        where: { apiKey: key },
        include: { Subscription: true }
      });
      
      if (saasUser) {
        req.saasUserId = saasUser.id;
        req.isGlobalAdmin = saasUser.role === 'ADMIN';
        req.authType = 'saas_user';
        return next();
      }
    } catch (error) {
      logger.error(error);
    }
  }

  if ((req.originalUrl.includes('/instance/create') || req.originalUrl.includes('/instance/fetchInstances')) && !key) {
    throw new ForbiddenException('Missing global api key', 'The global api key must be set');
  }
  const param = req.params as unknown as InstanceDto;

  try {
    if (param?.instanceName) {
      const instance = await prismaRepository.instance.findUnique({
        where: { name: param.instanceName },
      });
      if (instance) {
        if (instance.token === key) {
          req.authType = 'instance_token';
          return next();
        }
        
        if (req.saasUserId && instance.userId === req.saasUserId) {
          return next();
        }
      }
    } else {
      if (req.originalUrl.includes('/instance/fetchInstances') && db.SAVE_DATA.INSTANCE) {
        const instanceByKey = await prismaRepository.instance.findFirst({
          where: { token: key },
        });
        if (instanceByKey) {
          req.authType = 'instance_token';
          return next();
        }
      }
    }
  } catch (error) {
    logger.error(error);
  }

  throw new UnauthorizedException();
}

export const authGuard = { apikey };
