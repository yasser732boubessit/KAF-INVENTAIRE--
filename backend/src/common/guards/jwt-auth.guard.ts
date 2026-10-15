import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Missing Authorization Header (Bearer Token required)');
    }

    const [bearer, token] = authHeader.split(' ');
    if (bearer !== 'Bearer' || !token) {
      throw new UnauthorizedException('Invalid Authorization format. Expected: Bearer <token>');
    }

    const secret = process.env.JWT_SECRET || 'kaf_inventaire_secure_jwt_secret_change_in_prod';
    try {
      const decoded = jwt.verify(token, secret);
      request.user = decoded;
      return true;
    } catch (err: any) {
      throw new UnauthorizedException(`JWT verification failed: ${err.message}`);
    }
  }
}
