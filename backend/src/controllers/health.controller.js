/**
 * Health Check Controller
 *
 * Provides health check endpoints for monitoring
 *
 * @module controllers/health
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Basic health check
 *
 * @route GET /api/health
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
export const healthCheck = async (req, res) => {
  const pythonExecutable = process.env.PYTHON_EXECUTABLE || 'python3';

  // Check Python availability
  const pythonCheck = await new Promise((resolve) => {
    const pythonProcess = spawn(pythonExecutable, ['--version']);
    let version = '';

    pythonProcess.stdout.on('data', (data) => {
      version += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      version += data.toString();
    });

    pythonProcess.on('close', (code) => {
      resolve({
        available: code === 0,
        version: version.trim()
      });
    });

    pythonProcess.on('error', () => {
      resolve({
        available: false,
        version: 'Not found'
      });
    });
  });

  return res.status(200).json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'AggieAce Backend',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    python: pythonCheck,
    features: {
      fileUpload: true,
      syllabusConversion: pythonCheck.available,
      googleDrive: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
    }
  });
};

export default {
  healthCheck
};
