"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JwtConfig = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
class JwtConfig {
    /**
     * 生成访问令牌
     */
    static generateAccessToken(payload) {
        // 使用非常长的token有效期，避免频繁过期
        // 开发环境：365天，生产环境：使用配置的时间（默认7天）
        const expiresIn = process.env.NODE_ENV === 'development' ? '365d' : this.ACCESS_TOKEN_EXPIRES_IN;
        // 仅开发环境输出日志
        if (process.env.NODE_ENV === 'development') {
            console.log('[JWT] 生成访问令牌，有效期:', expiresIn);
        }
        return jsonwebtoken_1.default.sign(payload, this.ACCESS_TOKEN_SECRET, {
            expiresIn,
            issuer: 'crm-system',
            audience: 'crm-users'
        });
    }
    /**
     * 生成刷新令牌
     */
    static generateRefreshToken(payload) {
        // 开发环境使用更长的刷新token有效期
        const expiresIn = process.env.NODE_ENV === 'development' ? '90d' : this.REFRESH_TOKEN_EXPIRES_IN;
        return jsonwebtoken_1.default.sign(payload, this.REFRESH_TOKEN_SECRET, {
            expiresIn,
            issuer: 'crm-system',
            audience: 'crm-users'
        });
    }
    /**
     * 生成令牌对
     */
    static generateTokenPair(payload) {
        return {
            accessToken: this.generateAccessToken(payload),
            refreshToken: this.generateRefreshToken(payload)
        };
    }
    /**
     * 验证访问令牌
     */
    static verifyAccessToken(token) {
        try {
            const payload = jsonwebtoken_1.default.verify(token, this.ACCESS_TOKEN_SECRET, {
                issuer: 'crm-system',
                audience: 'crm-users'
            });
            return payload;
        }
        catch (error) {
            // 仅在开发环境输出错误详情
            if (process.env.NODE_ENV === 'development') {
                console.error('[JWT] Token验证失败:', error instanceof Error ? error.message : '未知错误');
            }
            throw new Error('Invalid access token');
        }
    }
    /**
     * 验证刷新令牌
     */
    static verifyRefreshToken(token) {
        try {
            return jsonwebtoken_1.default.verify(token, this.REFRESH_TOKEN_SECRET, {
                issuer: 'crm-system',
                audience: 'crm-users'
            });
        }
        catch (error) {
            throw new Error('Invalid refresh token');
        }
    }
    /**
     * 解码令牌（不验证）
     */
    static decodeToken(token) {
        try {
            return jsonwebtoken_1.default.decode(token);
        }
        catch (error) {
            return null;
        }
    }
    /**
     * 检查令牌是否即将过期（30分钟内）
     */
    static isTokenExpiringSoon(token) {
        try {
            const decoded = jsonwebtoken_1.default.decode(token);
            if (!decoded || !decoded.exp)
                return true;
            const expirationTime = decoded.exp * 1000; // 转换为毫秒
            const currentTime = Date.now();
            const thirtyMinutes = 30 * 60 * 1000; // 30分钟
            return (expirationTime - currentTime) < thirtyMinutes;
        }
        catch (error) {
            return true;
        }
    }
}
exports.JwtConfig = JwtConfig;
JwtConfig.ACCESS_TOKEN_SECRET = process.env.JWT_SECRET || 'crm-secret-key';
JwtConfig.REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';
JwtConfig.ACCESS_TOKEN_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
JwtConfig.REFRESH_TOKEN_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';
//# sourceMappingURL=jwt.js.map