import jwt, { SignOptions } from 'jsonwebtoken';

export interface JwtPayload {
  userId: string;  // 修改为string以匹配User.id类型
  username: string;
  role: string;
  departmentId?: string | null;  // 修改为string以匹配Department.id类型
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export class JwtConfig {
  private static readonly ACCESS_TOKEN_SECRET: string = process.env.JWT_SECRET || 'your-secret-key';
  private static readonly REFRESH_TOKEN_SECRET: string = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';
  private static readonly ACCESS_TOKEN_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || '7d';
  private static readonly REFRESH_TOKEN_EXPIRES_IN: string = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

  /**
   * 生成访问令牌
   */
  static generateAccessToken(payload: JwtPayload): string {
    // 使用非常长的token有效期，避免频繁过期
    // 开发环境：365天，生产环境：使用配置的时间（默认7天）
    const expiresIn: string = process.env.NODE_ENV === 'development' ? '365d' : this.ACCESS_TOKEN_EXPIRES_IN;

    console.log('[JWT] 生成访问令牌，有效期:', expiresIn, '环境:', process.env.NODE_ENV);

    return jwt.sign(payload, this.ACCESS_TOKEN_SECRET, {
      expiresIn,
      issuer: 'crm-system',
      audience: 'crm-users'
    } as SignOptions);
  }

  /**
   * 生成刷新令牌
   */
  static generateRefreshToken(payload: JwtPayload): string {
    // 开发环境使用更长的刷新token有效期
    const expiresIn: string = process.env.NODE_ENV === 'development' ? '90d' : this.REFRESH_TOKEN_EXPIRES_IN;

    return jwt.sign(payload, this.REFRESH_TOKEN_SECRET, {
      expiresIn,
      issuer: 'crm-system',
      audience: 'crm-users'
    } as SignOptions);
  }

  /**
   * 生成令牌对
   */
  static generateTokenPair(payload: JwtPayload): TokenPair {
    return {
      accessToken: this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken(payload)
    };
  }

  /**
   * 验证访问令牌
   */
  static verifyAccessToken(token: string): JwtPayload {
    try {
      console.log('[JWT] 开始验证访问令牌');
      console.log('[JWT] Token前50字符:', token.substring(0, 50));
      console.log('[JWT] 使用的密钥:', this.ACCESS_TOKEN_SECRET.substring(0, 20) + '...');

      const payload = jwt.verify(token, this.ACCESS_TOKEN_SECRET, {
        issuer: 'crm-system',
        audience: 'crm-users'
      }) as JwtPayload;

      console.log('[JWT] Token验证成功，用户ID:', payload.userId);
      return payload;
    } catch (error) {
      console.error('[JWT] Token验证失败:', error);
      if (error instanceof Error) {
        console.error('[JWT] 错误详情:', error.message);
      }
      throw new Error('Invalid access token: ' + (error instanceof Error ? error.message : '未知错误'));
    }
  }

  /**
   * 验证刷新令牌
   */
  static verifyRefreshToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, this.REFRESH_TOKEN_SECRET, {
        issuer: 'crm-system',
        audience: 'crm-users'
      }) as JwtPayload;
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  /**
   * 解码令牌（不验证）
   */
  static decodeToken(token: string): JwtPayload | null {
    try {
      return jwt.decode(token) as JwtPayload;
    } catch (error) {
      return null;
    }
  }

  /**
   * 检查令牌是否即将过期（30分钟内）
   */
  static isTokenExpiringSoon(token: string): boolean {
    try {
      const decoded = jwt.decode(token) as any;
      if (!decoded || !decoded.exp) return true;

      const expirationTime = decoded.exp * 1000; // 转换为毫秒
      const currentTime = Date.now();
      const thirtyMinutes = 30 * 60 * 1000; // 30分钟

      return (expirationTime - currentTime) < thirtyMinutes;
    } catch (error) {
      return true;
    }
  }
}
