import Fastify from 'fastify'
import path from 'path'

const fastify = Fastify({
  logger: process.env.NODE_ENV === 'production' ? { level: 'warn' } : true
})

// Security Headers
await fastify.register(import('@fastify/helmet'), {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
})

// Rate Limiting
await fastify.register(import('@fastify/rate-limit'), {
  max: parseInt(process.env.RATE_LIMIT_MAX) || 1000,
  timeWindow: parseInt(process.env.RATE_LIMIT_WINDOW) || 900000 // 15 minutes
})

// CORS - Configurado via variáveis de ambiente
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000', 'http://localhost:3001', 'https://localhost:3000', 'https://localhost:3001']

await fastify.register(import('@fastify/cors'), {
  origin: allowedOrigins,
  credentials: true
})

// Static Files with Caching
await fastify.register(import('@fastify/static'), {
  root: path.join(process.cwd(), 'src/data/public'),
  prefix: '/exams/',
  setHeaders: (res, path) => {
    // Cache por 24 horas
    res.setHeader('Cache-Control', 'public, max-age=86400')
  }
})

// Routes
fastify.get('/', async (request, reply) => {
  return { message: 'ENEM API is running!' }
})

// Health check
fastify.get('/health', async (request, reply) => {
  return { status: 'OK', timestamp: new Date().toISOString() }
})

// Register routes
await fastify.register(import('./routes/questions.js'), { prefix: '/api' })

// Start server
const start = async () => {
  try {
    const PORT = process.env.PORT || 8000
    const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost'
    
    await fastify.listen({ port: parseInt(PORT), host: HOST })
    console.log(`🚀 Server is running on ${HOST}:${PORT}`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...')
  await fastify.close()
  process.exit(0)
})

start()