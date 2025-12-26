import app from './src/index.js'

const port = parseInt(process.env.PORT || '3001')

console.log(`🚀 服务器启动中...`)

// 测试数据库连接
try {
  await prisma.$connect()
  console.log('✅ 数据库连接成功')
} catch (error) {
  console.error('❌ 数据库连接失败:', error)
  process.exit(1)
}

// 启动服务器
const server = Bun.serve({
  port,
  fetch: app.fetch,
})

console.log(`🚀 服务器运行在 http://localhost:${server.port}`)