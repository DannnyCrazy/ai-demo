import { Hono } from 'hono'
import { cors } from 'hono/cors'
import auth from './routes/auth.js'
import { authMiddleware } from './middleware/auth.js'
import prisma from './lib/prisma.js'

const app = new Hono()

// CORS 配置
app.use('/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length'],
  maxAge: 600,
  credentials: true,
}))

// 健康检查
app.get('/health', (c) => {
  return c.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'hono-auth-server'
  })
})

// 认证路由
app.route('/api/auth', auth)

// 需要认证的用户信息路由
app.get('/api/user/profile', authMiddleware, async (c) => {
  try {
    const userId = c.user?.userId
    
    if (!userId) {
      return c.json({ error: '用户信息无效' }, 401)
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
        updatedAt: true
      }
    })

    if (!user) {
      return c.json({ error: '用户不存在' }, 404)
    }

    return c.json({ user })
  } catch (error) {
    console.error('获取用户信息错误:', error)
    return c.json({ 
      error: '服务器内部错误', 
      message: '获取用户信息失败' 
    }, 500)
  }
})

// 404 处理
app.notFound((c) => {
  return c.json({ 
    error: '页面不存在',
    message: '请求的接口不存在'
  }, 404)
})

// 全局错误处理
app.onError((err, c) => {
  console.error('服务器错误:', err)
  return c.json({ 
    error: '服务器内部错误',
    message: '服务器处理请求时发生错误'
  }, 500)
})

export default app