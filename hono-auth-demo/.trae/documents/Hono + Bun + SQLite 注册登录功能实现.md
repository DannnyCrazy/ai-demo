## 项目概述
在 `/d:/Code/github/ai-demo/hono-auth-demo/server` 目录下实现一个完整的用户注册登录系统，使用：
- **框架**: Hono (轻量级 Web 框架)
- **运行时**: Bun (高性能 JavaScript 运行时)
- **数据库**: Bun 内置 SQLite
- **ORM**: Prisma 7.2 (数据库操作)
- **认证**: JWT (JSON Web Token)

## 实施步骤

### 1. 项目初始化
- 创建 `package.json` 并配置 Bun 项目
- 设置 TypeScript 配置
- 创建项目基础目录结构

### 2. 依赖安装
```bash
bun add hono prisma@7.2 @prisma/client bcrypt jsonwebtoken
bun add -D @types/bcrypt @types/jsonwebtoken typescript
```

### 3. Prisma 数据库配置
- 初始化 Prisma 配置
- 创建 User 数据模型 (包含用户名、邮箱、密码哈希)
- 配置 SQLite 数据库连接
- 运行数据库迁移

### 4. 核心功能实现
- **用户注册 API** (`POST /api/auth/register`)
  - 输入验证 (邮箱格式、密码强度)
  - 密码哈希处理 (bcrypt)
  - 检查用户唯一性
  - 创建用户记录

- **用户登录 API** (`POST /api/auth/login`)
  - 验证用户凭据
  - 生成 JWT token
  - 返回用户信息和 token

- **JWT 中间件**
  - Token 验证和解析
  - 用户身份认证
  - 保护需要认证的 API 路由

### 5. 用户资料管理
- **获取用户信息** (`GET /api/user/profile`)
  - 需要 JWT 认证
  - 返回用户基本信息 (不包含密码)

### 6. 错误处理和安全
- 统一的错误响应格式
- 输入验证和清理
- 密码安全策略
- CORS 配置
- 环境变量管理

### 7. 项目结构
```
server/
├── package.json
├── tsconfig.json
├── .env
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── index.ts          # 主入口文件
│   ├── routes/
│   │   └── auth.ts       # 认证路由
│   ├── middleware/
│   │   └── auth.ts       # JWT 中间件
│   ├── utils/
│   │   ├── jwt.ts        # JWT 工具函数
│   │   └── validation.ts # 输入验证
│   └── types/
│       └── user.ts       # 类型定义
└── README.md
```

### 8. API 端点设计
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `GET /api/user/profile` - 获取用户信息 (需要认证)

## 技术特点
- 使用 Bun 的高性能特性
- Prisma 提供类型安全的数据库操作
- JWT 无状态认证机制
- 完善的错误处理和输入验证
- TypeScript 提供类型安全