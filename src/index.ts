import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import campaignRoutes from './routes/campaigns';
import healthRoutes from './routes/health';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Allowed origins for CORS
const allowedOrigins = [
  'https://email-jpgg.onrender.com',
  'https://emailb.onrender.com',
  'http://localhost:3000',
  'http://localhost:5000',
];

// Add FRONTEND_URL from env if provided
if (process.env.FRONTEND_URL) {
  // Clean up the URL in case it has issues
  const cleanUrl = process.env.FRONTEND_URL.replace(/^http:\/\/https:\/\//, 'https://');
  allowedOrigins.push(cleanUrl);
}

// Security middleware
app.use(helmet());
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      // Allow all origins in production for now to debug
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later.' }
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/campaigns', campaignRoutes);
app.use('/api/health', healthRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Bulk Email API Server',
    version: '1.0.0',
    status: 'running'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📧 Bulk Email API ready at http://localhost:${PORT}`);
});

export default app;
