import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';

const execAsync = promisify(exec);

let libreOfficeAvailable = false;
let libreOfficePath = null;

/**
 * Detect LibreOffice installation on system
 * @returns {Promise<boolean>} Whether LibreOffice is installed
 */
export async function checkLibreOfficeInstalled() {
  const possiblePaths = [
    '/usr/bin/soffice',
    '/usr/bin/libreoffice',
    '/Applications/LibreOffice.app/Contents/MacOS/soffice',
    'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
    process.env.LIBREOFFICE_PATH
  ].filter(Boolean);

  for (const testPath of possiblePaths) {
    if (existsSync(testPath)) {
      libreOfficePath = testPath;
      libreOfficeAvailable = true;
      console.log(`✓ LibreOffice found at: ${testPath}`);
      return true;
    }
  }

  // Try command-line detection
  try {
    await execAsync('soffice --version');
    libreOfficePath = 'soffice';
    libreOfficeAvailable = true;
    console.log('✓ LibreOffice found in PATH');
    return true;
  } catch (error) {
    console.warn('⚠ LibreOffice not found. DOCX conversion will not be available.');
    console.warn('  Install LibreOffice from: https://www.libreoffice.org/download/');
    libreOfficeAvailable = false;
    return false;
  }
}

/**
 * Get LibreOffice binary path
 * @returns {string|null} Path to LibreOffice executable
 */
export function getLibreOfficePath() {
  return libreOfficePath;
}

/**
 * Check if LibreOffice is available
 * @returns {boolean}
 */
export function isLibreOfficeAvailable() {
  return libreOfficeAvailable;
}

/**
 * Convert DOCX file to PDF using LibreOffice headless mode
 * @param {string} docxPath - Full path to DOCX file
 * @param {string} outputDir - Directory to save converted PDF
 * @returns {Promise<string>} Path to converted PDF file
 */
export async function convertDocxToPdf(docxPath, outputDir) {
  if (!libreOfficeAvailable) {
    throw new Error('LibreOffice is not installed. Cannot convert DOCX to PDF.');
  }

  const timeout = parseInt(process.env.LIBREOFFICE_TIMEOUT || '30000');
  const basename = path.basename(docxPath, path.extname(docxPath));
  const expectedPdfPath = path.join(outputDir, `${basename}.pdf`);

  try {
    console.log(`Converting DOCX to PDF: ${docxPath}`);

    // LibreOffice command: --headless --convert-to pdf --outdir <dir> <file>
    const command = `"${libreOfficePath}" --headless --convert-to pdf --outdir "${outputDir}" "${docxPath}"`;

    const { stdout, stderr } = await execAsync(command, { timeout });

    if (stderr && !stderr.includes('Warning')) {
      console.warn('LibreOffice stderr:', stderr);
    }

    // Check if PDF was created
    if (!existsSync(expectedPdfPath)) {
      throw new Error(`Conversion failed: PDF not found at ${expectedPdfPath}`);
    }

    console.log(`✓ Converted to PDF: ${expectedPdfPath}`);
    return expectedPdfPath;
  } catch (error) {
    if (error.killed) {
      throw new Error(`DOCX conversion timed out after ${timeout}ms`);
    }
    throw new Error(`Failed to convert DOCX to PDF: ${error.message}`);
  }
}

/**
 * Check if file is a Word document
 * @param {string} filePath - Path to file
 * @returns {boolean}
 */
export function isWordDocument(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return ext === '.docx' || ext === '.doc';
}
