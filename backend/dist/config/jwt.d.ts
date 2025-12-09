export interface JwtPayload {
    userId: string;
    username: string;
    role: string;
    departmentId?: string | null;
}
export interface TokenPair {
    accessToken: string;
    refreshToken: string;
}
export declare class JwtConfig {
    private static readonly ACCESS_TOKEN_SECRET;
    private static readonly REFRESH_TOKEN_SECRET;
    private static readonly ACCESS_TOKEN_EXPIRES_IN;
    private static readonly REFRESH_TOKEN_EXPIRES_IN;
    /**
     * 生成访问令牌
     */
    static generateAccessToken(payload: JwtPayload): string;
    /**
     * 生成刷新令牌
     */
    static generateRefreshToken(payload: JwtPayload): string;
    /**
     * 生成令牌对
     */
    static generateTokenPair(payload: JwtPayload): TokenPair;
    /**
     * 验证访问令牌
     */
    static verifyAccessToken(token: string): JwtPayload;
    /**
     * 验证刷新令牌
     */
    static verifyRefreshToken(token: string): JwtPayload;
    /**
     * 解码令牌（不验证）
     */
    static decodeToken(token: string): JwtPayload | null;
    /**
     * 检查令牌是否即将过期（30分钟内）
     */
    static isTokenExpiringSoon(token: string): boolean;
}
//# sourceMappingURL=jwt.d.ts.map