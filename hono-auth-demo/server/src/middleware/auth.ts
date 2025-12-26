import type { Context, Next } from 'hono'
import { verifyToken } from '../utils/jwt.js'

export interface AuthContext extends Context {
  user?: {
    userId: string
    email: string
  }
}

export const authMiddleware = async (c: AuthContext, next: Next) => {
  try {
    const authHeader = c.req.header('Authorization')
    
    if (!authHeader) {
      return c.json({ error: '未提供认证令牌' }, 401)
    }

    const token = authHeader.replace('Bearer ', '')
    
    if (!token) {
      return c.json({ error: '令牌格式错误' }, 401)
    }

    const payload = verifyToken(token)
    c.user = payload
    
    await next()
  } catch (error) {
    return c.json({ error: '无效的认证令牌' }, 401)
  }
}