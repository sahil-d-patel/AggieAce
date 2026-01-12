/**
 * Conversion Controller
 *
 * Handles HTTP requests for syllabus to calendar conversion
 *
 * @module controllers/conversion
 */

import { convertSyllabusToCalendar, calculateFileHash } from '../services/conversion.service.js';
import { uploadToGoogleDrive } from '../services/google-drive.service.js';
import { getAuthenticatedClient } from '../config/google.config.js';
import { findOrCreateUser, saveCalendarHistory, findCachedSyllabus } from '../services/database.service.js';
import { syllabusQueue, JobStatus } from '../services/queue.service.js';
import fs from 'fs/promises';
import axios from 'axios';

/**
 * Handle syllabus conversion request
 * First checks cache, then queues for processing if needed
 *
 * @route POST /api/conversion
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
export const convertSyllabus = async (req, res) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
        message: 'Please upload a PDF file'
      });
    }

    // Extract request data
    const {
      className,
      sectionNumber,
      semesterStart,
      semesterEnd,
      timezone,
      googleAccessToken
    } = req.body;

    console.log('Starting conversion for:', className, 'Section', sectionNumber);

    const pdfHash = await calculateFileHash(req.file.path);
    console.log(`PDF Hash: ${pdfHash}`);

    try {
      const cachedResult = await findCachedSyllabus(pdfHash);

      if (cachedResult) {
        console.log('Cache HIT! Returning cached result immediately');

        const outputFileName = `${className.replace(/[^a-zA-Z0-9]/g, '_')}_${sectionNumber}.ics`;

        // Save to user history if authenticated
        if (googleAccessToken) {
          await saveToUserHistory({
            googleAccessToken,
            className,
            sectionNumber,
            semesterStart,
            semesterEnd,
            timezone,
            pdfPath: req.file.path,
            icsContent: cachedResult.ics_file_content,
            downloadUrl: `/api/conversion/cached/${pdfHash}?filename=${encodeURIComponent(outputFileName)}`
          });
        }

        // Return cached result immediately
        return res.status(200).json({
          success: true,
          message: 'Syllabus converted successfully (from cache)',
          status: 'completed',
          data: {
            conversion: {
              fileName: outputFileName,
              downloadUrl: `/api/conversion/cached/${pdfHash}?filename=${encodeURIComponent(outputFileName)}`,
              outputPath: null,
              pdfPath: req.file.path,
              fromCache: true,
              pdfHash,
              metadata: { className, sectionNumber, semesterStart, semesterEnd, timezone }
            }
          }
        });
      }

      console.log('Cache MISS - Adding to processing queue...');
    } catch (cacheError) {
      console.warn('Cache lookup failed, proceeding with queue:', cacheError.message);
    }

    const jobInfo = syllabusQueue.addJob({
      pdfPath: req.file.path,
      className,
      sectionNumber,
      semesterStart,
      semesterEnd,
      timezone,
      pdfHash,
      googleAccessToken
    });

    console.log(`Job queued: ${jobInfo.jobId} (position: ${jobInfo.position})`);

    // Return queued status with job ID
    return res.status(202).json({
      success: true,
      message: jobInfo.position === 0
        ? 'Syllabus is being processed'
        : `Syllabus added to queue (${jobInfo.position} job(s) ahead)`,
      status: 'queued',
      data: {
        jobId: jobInfo.jobId,
        position: jobInfo.position,
        queueLength: jobInfo.queueLength,
        rateLimits: jobInfo.rateLimits
      }
    });

  } catch (error) {
    console.error('Conversion error:', error);

    // Clean up uploaded file on error
    if (req.file && req.file.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (cleanupError) {
        console.error('Failed to clean up file:', cleanupError);
      }
    }

    return res.status(500).json({
      success: false,
      error: 'Conversion failed',
      message: error.message || 'An error occurred during conversion'
    });
  }
};

/**
 * Helper function to save conversion to user history
 */
async function saveToUserHistory({
  googleAccessToken,
  className,
  sectionNumber,
  semesterStart,
  semesterEnd,
  timezone,
  pdfPath,
  icsContent,
  downloadUrl
}) {
  try {
    const googleUserResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${googleAccessToken}`
      }
    });

    const googleUser = googleUserResponse.data;

    const user = await findOrCreateUser({
      googleId: googleUser.id,
      email: googleUser.email,
      name: googleUser.name
    });

    const [startMonth, startDay, startYear] = semesterStart.split('/');
    const [endMonth, endDay, endYear] = semesterEnd.split('/');
    const dbStartDate = `${startYear}-${startMonth.padStart(2, '0')}-${startDay.padStart(2, '0')}`;
    const dbEndDate = `${endYear}-${endMonth.padStart(2, '0')}-${endDay.padStart(2, '0')}`;

    await saveCalendarHistory({
      userId: user.id,
      courseName: className,
      sectionNumber,
      semesterStart: dbStartDate,
      semesterEnd: dbEndDate,
      timezone,
      icsFilePath: downloadUrl,
      icsFileContent: icsContent,
      pdfFilePath: pdfPath
    });

    console.log('Calendar saved to user history');
  } catch (dbError) {
    console.error('Failed to save to database:', dbError);
  }
}

/**
 * Get job status and result
 *
 * @route GET /api/conversion/status/:jobId
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
export const getJobStatus = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { googleAccessToken } = req.query;

    if (!jobId) {
      return res.status(400).json({
        success: false,
        error: 'Missing job ID',
        message: 'Job ID is required'
      });
    }

    const jobStatus = syllabusQueue.getJobStatus(jobId);

    if (!jobStatus) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
        message: 'Job ID not found or has expired'
      });
    }

    if (jobStatus.status === JobStatus.COMPLETED && jobStatus.result) {
      const result = jobStatus.result;

      if (googleAccessToken && result) {
        const job = syllabusQueue.jobs.get(jobId);
        if (job && job.params.googleAccessToken) {
          let icsContent;
          if (result.fromCache) {
            const cachedResult = await findCachedSyllabus(result.pdfHash);
            icsContent = cachedResult?.ics_file_content || '';
          } else if (result.outputPath) {
            try {
              icsContent = await fs.readFile(result.outputPath, 'utf-8');
            } catch (e) {
              icsContent = '';
            }
          }

          if (icsContent) {
            await saveToUserHistory({
              googleAccessToken: job.params.googleAccessToken,
              className: job.params.className,
              sectionNumber: job.params.sectionNumber,
              semesterStart: job.params.semesterStart,
              semesterEnd: job.params.semesterEnd,
              timezone: job.params.timezone,
              pdfPath: job.params.pdfPath,
              icsContent,
              downloadUrl: result.downloadUrl
            });
          }
        }
      }

      return res.status(200).json({
        success: true,
        message: result.fromCache
          ? 'Syllabus converted successfully (from cache)'
          : 'Syllabus converted successfully',
        status: 'completed',
        data: {
          conversion: {
            fileName: result.outputFileName,
            downloadUrl: result.downloadUrl,
            outputPath: result.outputPath,
            pdfPath: syllabusQueue.jobs.get(jobId)?.params?.pdfPath,
            fromCache: result.fromCache || false,
            pdfHash: result.pdfHash,
            metadata: result.metadata
          }
        }
      });
    }

    if (jobStatus.status === JobStatus.FAILED) {
      return res.status(200).json({
        success: false,
        message: 'Conversion failed',
        status: 'failed',
        error: jobStatus.error?.message || 'An error occurred during conversion',
        data: {
          jobId: jobStatus.jobId
        }
      });
    }

    return res.status(200).json({
      success: true,
      message: jobStatus.status === JobStatus.PROCESSING
        ? 'Syllabus is being processed'
        : `In queue (${jobStatus.position} job(s) ahead)`,
      status: jobStatus.status,
      data: {
        jobId: jobStatus.jobId,
        position: jobStatus.position,
        queueLength: jobStatus.queueLength,
        rateLimits: jobStatus.rateLimits
      }
    });

  } catch (error) {
    console.error('Error getting job status:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to get job status'
    });
  }
};

/**
 * Get queue statistics
 *
 * @route GET /api/conversion/queue/stats
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
export const getQueueStats = async (req, res) => {
  try {
    const stats = syllabusQueue.getQueueStats();
    return res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting queue stats:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to get queue statistics'
    });
  }
};

/**
 * Handle manual Google Drive upload
 *
 * @route POST /api/conversion/save-to-drive
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
export const saveToDrive = async (req, res) => {
  try {
    const {
      googleAccessToken,
      pdfPath,
      icsPath,
      folderName,
      metadata
    } = req.body;

    if (!googleAccessToken) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'Please sign in with Google first'
      });
    }

    if (!pdfPath || !icsPath) {
      return res.status(400).json({
        success: false,
        error: 'Missing file paths',
        message: 'PDF and ICS file paths are required'
      });
    }

    console.log('Starting manual Google Drive upload...');
    console.log('Folder name:', folderName || 'AggieAce');

    const auth = getAuthenticatedClient({ access_token: googleAccessToken });

    const driveResult = await uploadToGoogleDrive(
      auth,
      pdfPath,
      icsPath,
      metadata,
      folderName
    );

    console.log('Files uploaded successfully to Google Drive');

    return res.status(200).json({
      success: true,
      message: 'Files saved to Google Drive successfully',
      data: driveResult
    });

  } catch (error) {
    console.error('Google Drive upload error:', error);

    return res.status(500).json({
      success: false,
      error: 'Upload failed',
      message: error.message || 'Failed to upload to Google Drive'
    });
  }
};

/**
 * Serve cached .ics file directly from database
 *
 * @route GET /api/conversion/cached/:hash
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
export const serveCachedIcs = async (req, res) => {
  try {
    const { hash } = req.params;
    const { filename } = req.query;

    if (!hash || hash.length !== 64) {
      return res.status(400).json({
        success: false,
        error: 'Invalid hash',
        message: 'A valid SHA-256 hash is required'
      });
    }

    const cachedResult = await findCachedSyllabus(hash);

    if (!cachedResult) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'No cached calendar found for this hash'
      });
    }

    const downloadFilename = filename || `calendar_${hash.substring(0, 8)}.ics`;
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);

    return res.send(cachedResult.ics_file_content);

  } catch (error) {
    console.error('Error serving cached ICS:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to retrieve cached calendar'
    });
  }
};

export default {
  convertSyllabus,
  saveToDrive,
  serveCachedIcs,
  getJobStatus,
  getQueueStats
};
