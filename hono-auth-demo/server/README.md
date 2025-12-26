# Hono + Bun + SQLite 注册登录系统

基于 Hono 框架、Bun 运行时、SQLite 数据库和 Prisma ORM 的用户认证系统。

## 功能特性

- ✅ 用户注册
- ✅ 用户登录
- ✅ JWT 认证
- ✅ 用户信息获取
- ✅ 密码加密存储
- ✅ 输入验证
- ✅ 错误处理

## 技术栈

- **框架**: Hono
- **运行时**: Bun
- **数据库**: SQLite (Bun 内置)
- **ORM**: Prisma 7.2
- **认证**: JWT
- **验证**: Zod
- **加密**: bcrypt

## 快速开始

### 安装依赖
```bash
bun install
```

### 配置数据库
```bash
bun run db:generate
bun run db:push
```

### 启动服务
```bash
bun run dev
```

## API 文档

### 注册用户
**POST** `/api/auth/register`

请求体:
```json
{
  "username": "testuser",
  "email": "test@example.com",
  "password": "password123"
}
```

### 用户登录
**POST** `/api/auth/login`

请求体:
```json
{
  "email": "test@example.com",
  "password": "password123"
}
```

### 获取用户信息
**GET** `/api/user/profile`

Headers:
```
Authorization: Bearer <token>
```

## 环境变量

创建 `.env` 文件:
```
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-secret-key"
PORT=3000
```