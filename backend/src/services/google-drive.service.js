/**
 * Google Drive Service
 *
 * Handles Google Drive API interactions including:
 * - Folder creation
 * - File uploads
 * - Permission management
 *
 * @module services/google-drive
 */

import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

/**
 * Get or create AggieAce folder in Google Drive
 *
 * @param {OAuth2Client} auth - Authenticated OAuth2 client
 * @returns {Promise<string>} Folder ID
 */
export const getOrCreateAggieAceFolder = async (auth) => {
  const drive = google.drive({ version: 'v3', auth });

  // Search for existing AggieAce folder
  const response = await drive.files.list({
    q: "name='AggieAce' and mimeType='application/vnd.google-apps.folder' and trashed=false",
    fields: 'files(id, name)',
    spaces: 'drive'
  });

  if (response.data.files && response.data.files.length > 0) {
    console.log('Found existing AggieAce folder:', response.data.files[0].id);
    return response.data.files[0].id;
  }

  // Create new AggieAce folder
  const folderMetadata = {
    name: 'AggieAce',
    mimeType: 'application/vnd.google-apps.folder'
  };

  const folder = await drive.files.create({
    requestBody: folderMetadata,
    fields: 'id'
  });

  console.log('Created new AggieAce folder:', folder.data.id);
  return folder.data.id;
};

/**
 * Upload file to Google Drive
 *
 * @param {OAuth2Client} auth - Authenticated OAuth2 client
 * @param {string} filePath - Path to the file to upload
 * @param {string} fileName - Name for the file in Drive
 * @param {string} mimeType - MIME type of the file
 * @param {string} folderId - Parent folder ID
 * @returns {Promise<Object>} Upload result with file ID and web view link
 */
export const uploadFileToDrive = async (auth, filePath, fileName, mimeType, folderId) => {
  const drive = google.drive({ version: 'v3', auth });

  const fileMetadata = {
    name: fileName,
    parents: [folderId]
  };

  const media = {
    mimeType: mimeType,
    body: fs.createReadStream(filePath)
  };

  const response = await drive.files.create({
    requestBody: fileMetadata,
    media: media,
    fields: 'id, name, webViewLink, webContentLink'
  });

  console.log('Uploaded file to Drive:', response.data.name, response.data.id);

  return {
    fileId: response.data.id,
    fileName: response.data.name,
    webViewLink: response.data.webViewLink,
    webContentLink: response.data.webContentLink
  };
};

/**
 * Get or create a folder in Google Drive by path (supports nested folders).
 *
 * This function iteratively finds or creates each folder in the provided path,
 * correctly handling searches in the root directory and nested folders.
 *
 * @param {OAuth2Client} auth - Authenticated OAuth2 client.
 * @param {string} folderPath - Path to the folder (e.g., "School/Syllabi" or "AggieAce").
 * @returns {Promise<string>} Folder ID of the final folder in the path.
 */
export const getOrCreateFolder = async (auth, folderPath = 'AggieAce') => {
  const drive = google.drive({ version: 'v3', auth });

  // Sanitize the path and split into individual folder names
  const folderNames = folderPath.split('/').map(name => name.trim()).filter(Boolean);

  if (folderNames.length === 0) {
    folderNames.push('AggieAce'); // Default to 'AggieAce' if path is empty
  }

  // Start the process from the root of "My Drive"
  let parentId = 'root';

  // Sequentially process each folder in the path
  for (const folderName of folderNames) {
    const escapedFolderName = folderName.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

    const query = `name = '${escapedFolderName}' and mimeType = 'application/vnd.google-apps.folder' and '${parentId}' in parents and trashed = false`;

    console.log(`Searching for folder "${folderName}" inside parent "${parentId}"`);
    console.log(`   Query: ${query}`);

    const response = await drive.files.list({
      q: query,
      fields: 'files(id, name)',
      spaces: 'drive',
      pageSize: 1 // We only need to find one, so this is more efficient.
    });

    if (response.data.files && response.data.files.length > 0) {
      // Folder was found, use its ID as the parent for the next folder in the path
      const foundFolder = response.data.files[0];
      parentId = foundFolder.id;
      console.log(`Found existing folder "${foundFolder.name}": ${parentId}`);
    } else {
      // Folder was not found, so create it inside the current parent
      console.log(`Folder "${folderName}" not found. Creating it...`);
      const folderMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentId] // The parent is the ID from the previous step
      };

      const folder = await drive.files.create({
        requestBody: folderMetadata,
        fields: 'id, name'
      });

      // Use the new folder's ID as the parent for the next iteration
      parentId = folder.data.id;
      console.log(`Created new folder "${folder.data.name}": ${parentId}`);
    }
  }

  // After the loop, parentId holds the ID of the final folder in the path
  return parentId;
};

/**
 * Upload syllabus and calendar to Google Drive
 *
 * @param {OAuth2Client} auth - Authenticated OAuth2 client
 * @param {string} pdfPath - Path to the PDF file
 * @param {string} icsPath - Path to the ICS file
 * @param {Object} metadata - File metadata
 * @param {string} folderName - Optional custom folder name (defaults to "AggieAce")
 * @returns {Promise<Object>} Upload results
 */
export const uploadToGoogleDrive = async (auth, pdfPath, icsPath, metadata, folderName = 'AggieAce') => {
  try {
    // Get or create folder
    const folderId = await getOrCreateFolder(auth, folderName);

    // Upload PDF
    const pdfFileName = `${metadata.className}_Section${metadata.sectionNumber}_Syllabus.pdf`;
    const pdfResult = await uploadFileToDrive(
      auth,
      pdfPath,
      pdfFileName,
      'application/pdf',
      folderId
    );

    // Upload ICS
    const icsFileName = `${metadata.className}_Section${metadata.sectionNumber}_Calendar.ics`;
    const icsResult = await uploadFileToDrive(
      auth,
      icsPath,
      icsFileName,
      'text/calendar',
      folderId
    );

    return {
      success: true,
      pdf: pdfResult,
      calendar: icsResult,
      folderLink: `https://drive.google.com/drive/folders/${folderId}`
    };
  } catch (error) {
    console.error('Error uploading to Google Drive:', error);
    throw new Error(`Failed to upload to Google Drive: ${error.message}`);
  }
};

/**
 * Get user profile information
 *
 * @param {OAuth2Client} auth - Authenticated OAuth2 client
 * @returns {Promise<Object>} User profile
 */
export const getUserProfile = async (auth) => {
  const oauth2 = google.oauth2({ version: 'v2', auth });

  const response = await oauth2.userinfo.get();

  return {
    id: response.data.id,
    email: response.data.email,
    name: response.data.name,
    picture: response.data.picture
  };
};

export default {
  getOrCreateAggieAceFolder,
  getOrCreateFolder,
  uploadFileToDrive,
  uploadToGoogleDrive,
  getUserProfile
};
