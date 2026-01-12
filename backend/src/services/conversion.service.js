/**
 * Conversion Service
 *
 * Business logic for converting syllabus PDFs to iCalendar files
 * Handles Python script execution and file management
 *
 * @module services/conversion
 */

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { createReadStream, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { findCachedSyllabus, saveSyllabusCache } from './database.service.js';
import { convertDocxToPdf, isWordDocument, isLibreOfficeAvailable } from './document-conversion.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Calculate SHA-256 hash of a file
 *
 * @param {string} filePath - Path to the file
 * @returns {Promise<string>} SHA-256 hash as hex string
 */
export const calculateFileHash = (filePath) => {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = createReadStream(filePath);

    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', (err) => reject(err));
  });
};

/**
 * Convert syllabus PDF to iCalendar format
 * Uses SHA-256 hash caching to avoid reprocessing identical syllabi
 *
 * @param {Object} params - Conversion parameters
 * @param {string} params.pdfPath - Path to the uploaded PDF file
 * @param {string} params.className - Name of the class
 * @param {string} params.sectionNumber - Section number
 * @param {string} params.semesterStart - Semester start date (MM/DD/YYYY)
 * @param {string} params.semesterEnd - Semester end date (MM/DD/YYYY)
 * @param {string} params.timezone - Timezone for the calendar
 * @returns {Promise<Object>} Conversion result with output file path
 * @throws {Error} If conversion fails
 */
export async function convertSyllabusToCalendar(
  pdfPath,
  className,
  sectionNumber,
  semesterStart,
  semesterEnd,
  timezone,
  userId = null
) {
  let convertedPdfPath = null;

  try {
    // Calculate SHA-256 hash of ORIGINAL file (before any conversion)
    const originalFileHash = await calculateFileHash(pdfPath);

    // Convert DOCX to PDF if needed
    let processingPath = pdfPath;
    if (isWordDocument(pdfPath)) {
      if (!isLibreOfficeAvailable()) {
        throw new Error('DOCX conversion is not available. LibreOffice is not installed.');
      }

      console.log('DOCX file detected, converting to PDF...');
      convertedPdfPath = await convertDocxToPdf(pdfPath, path.dirname(pdfPath));
      processingPath = convertedPdfPath;
      console.log(`Using converted PDF: ${processingPath}`);
    }

    console.log('Calculating SHA-256 hash of syllabus...');
    const pdfHash = await calculateFileHash(originalFilePath);
    console.log(`File Hash: ${pdfHash}`);

    try {
      const cachedResult = await findCachedSyllabus(pdfHash);

      if (cachedResult) {
        console.log('Cache HIT! Found previously processed syllabus');

        // Generate filename for download (no file written to disk)
        const outputFileName = `${className.replace(/[^a-zA-Z0-9]/g, '_')}_${sectionNumber}.ics`;

        // Return URL to database-served endpoint (no file written)
        console.log(`Serving from database cache (no file written)`);

        return {
          success: true,
          outputPath: null, // No file on disk
          outputFileName,
          downloadUrl: `/api/conversion/cached/${pdfHash}?filename=${encodeURIComponent(outputFileName)}`,
          fromCache: true,
          pdfHash,
          metadata: {
            className,
            sectionNumber,
            semesterStart,
            semesterEnd,
            timezone
          }
        };
      }

      console.log('Cache MISS - Processing syllabus with LLM...');
    } catch (cacheError) {
      console.warn('Cache lookup failed, proceeding with LLM:', cacheError.message);
    }

    const outputFileName = `${className.replace(/[^a-zA-Z0-9]/g, '_')}_${sectionNumber}_${uuidv4()}.ics`;
    const outputPath = path.join(outputDir, outputFileName);

    const pythonExecutable = process.env.PYTHON_EXECUTABLE || 'python3';
    const args = [
      pythonScript,
      '--pdf', processingPath,
      '--class-name', className,
      '--section', sectionNumber,
      '--start-date', semesterStart,
      '--end-date', semesterEnd,
      '--timezone', timezone,
      '--output', outputPath
    ];

    console.log('Executing Python script:', pythonExecutable, args.join(' '));

    return new Promise((resolve, reject) => {
      const pythonProcess = spawn(pythonExecutable, args, {
        env: {
          ...process.env, // Pass all environment variables including GEMINI_API_KEY and GEMINI_MODEL
        }
      });

      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        console.log('Python stdout:', output);
      });

      pythonProcess.stderr.on('data', (data) => {
        const output = data.toString();
        stderr += output;
        console.error('Python stderr:', output);
      });

      pythonProcess.on('close', async (code) => {
        if (code !== 0) {
          console.error(`Python script exited with code ${code}`);
          console.error('stderr:', stderr);

          try {
            await fs.unlink(pdfPath);
          } catch (err) {
            console.error('Failed to delete uploaded file:', err);
          }

          reject(new Error(`Conversion failed: ${stderr || 'Unknown error'}`));
          return;
        }

        try {
          await fs.access(outputPath);
        } catch (err) {
          reject(new Error('Conversion completed but output file not found'));
          return;
        }

        console.log('Conversion successful:', outputPath);

        try {
          const icsContent = await fs.readFile(outputPath, 'utf-8');
          await saveSyllabusCache({
            sha256Hash: pdfHash,
            icsFilePath: outputPath,
            icsFileContent: icsContent
          });
          console.log('Saved to cache with hash:', pdfHash);
        } catch (cacheError) {
          console.warn('Failed to save to cache:', cacheError.message);
        }

        resolve({
          success: true,
          outputPath,
          outputFileName,
          downloadUrl: `/downloads/${outputFileName}`,
          fromCache: false,
          pdfHash,
          metadata: {
            className,
            sectionNumber,
            semesterStart,
            semesterEnd,
            timezone
          }
        });
      });

      pythonProcess.on('error', (err) => {
        console.error('Failed to start Python process:', err);
        reject(new Error(`Failed to execute Python script: ${err.message}`));
      });
    }).finally(async () => {
      // Clean up converted PDF file if it was created
      if (convertedPdfPath) {
        try {
          await fs.unlink(convertedPdfPath);
          console.log(`Cleaned up converted PDF: ${path.basename(convertedPdfPath)}`);
        } catch (err) {
          console.warn(`Failed to delete converted PDF: ${err.message}`);
        }
      }
    });
  } catch (conversionError) {
    // Clean up converted PDF on error
    if (convertedPdfPath) {
      try {
        await fs.unlink(convertedPdfPath);
      } catch (err) {
        console.warn(`Failed to delete converted PDF during error cleanup: ${err.message}`);
      }
    }
    throw conversionError;
  }
};

/**
 * Clean up old files from uploads and outputs directories
 *
 * @param {number} maxAgeHours - Maximum age of files in hours (default: 24)
 * @returns {Promise<Object>} Cleanup statistics
 */
export const cleanupOldFiles = async (maxAgeHours = 24) => {
  const uploadsDir = path.join(__dirname, '../../uploads');
  const outputsDir = path.join(__dirname, '../../outputs');

  const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
  const now = Date.now();

  let deletedCount = 0;

  const cleanDirectory = async (dir) => {
    try {
      const files = await fs.readdir(dir);

      for (const file of files) {
        if (file === '.gitkeep') continue;

        const filePath = path.join(dir, file);
        const stats = await fs.stat(filePath);

        if (now - stats.mtimeMs > maxAgeMs) {
          await fs.unlink(filePath);
          deletedCount++;
          console.log(`Deleted old file: ${file}`);
        }
      }
    } catch (err) {
      console.error(`Error cleaning directory ${dir}:`, err);
    }
  };

  await cleanDirectory(uploadsDir);
  await cleanDirectory(outputsDir);

  return {
    success: true,
    deletedCount,
    maxAgeHours
  };
};

export default {
  convertSyllabusToCalendar,
  cleanupOldFiles,
  calculateFileHash
};
