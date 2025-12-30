import { Hono } from 'hono'
import bcrypt from 'bcrypt'
import prisma from '../lib/prisma.js'
import { generateToken } from '../utils/jwt.js'
import { registerSchema, loginSchema } from '../utils/validation.js'
import type { AuthResponse } from '../types/user.js'

const auth = new Hono()

// 注册用户
auth.post('/register', async (c) => {
  try {
    const body = await c.req.json()
    
    // 验证输入
    const validation = registerSchema.safeParse(body)
    if (!validation.success) {
      return c.json({ 
        error: '输入验证失败', 
        details: validation.error.errors 
      }, 400)
    }

    const { username, email, password } = validation.data

    // 检查用户是否已存在
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { username }
        ]
      }
    })

    if (existingUser) {
      return c.json({ 
        error: '用户已存在', 
        message: '邮箱或用户名已被使用' 
      }, 409)
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10)

    // 创建用户
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword
      }
    })

    // 生成 JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email
    })

    const response: AuthResponse = {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt
      },
      token
    }

    return c.json(response, 201)
  } catch (error) {
    console.error('注册错误:', error)
    return c.json({ 
      error: '服务器内部错误', 
      message: '注册失败，请稍后重试' 
    }, 500)
  }
})

// 用户登录
auth.post('/login', async (c) => {
  try {
    const body = await c.req.json()
    
    // 验证输入
    const validation = loginSchema.safeParse(body)
    if (!validation.success) {
      return c.json({ 
        error: '输入验证失败', 
        details: validation.error.errors 
      }, 400)
    }

    const { email, password } = validation.data

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      return c.json({ 
        error: '认证失败', 
        message: '邮箱或密码错误' 
      }, 401)
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return c.json({ 
        error: '认证失败', 
        message: '邮箱或密码错误' 
      }, 401)
    }

    // 生成 JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email
    })

    const response: AuthResponse = {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt
      },
      token
    }

    return c.json(response, 200)
  } catch (error) {
    console.error('登录错误:', error)
    return c.json({ 
      error: '服务器内部错误', 
      message: '登录失败，请稍后重试' 
    }, 500)
  }
})

export default auth