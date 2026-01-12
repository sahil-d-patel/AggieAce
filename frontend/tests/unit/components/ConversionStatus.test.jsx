/**
 * Unit Tests for ConversionStatus Component
 *
 * Tests status displays, queue info, and download/save actions
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConversionStatus from '@/components/ConversionStatus';

// Mock the API functions
jest.mock('@/lib/api', () => ({
  downloadFile: jest.fn(),
  saveToGoogleDrive: jest.fn()
}));

// Mock the storage functions
jest.mock('@/lib/storage', () => ({
  getAccessToken: jest.fn()
}));

import { downloadFile, saveToGoogleDrive } from '@/lib/api';
import { getAccessToken } from '@/lib/storage';

describe('ConversionStatus', () => {
  // Setup

  beforeEach(() => {
    jest.clearAllMocks();
    getAccessToken.mockReturnValue(null);
  });

  // Idle State Tests

  describe('Idle State', () => {
    it('should render nothing when status is idle', () => {
      const { container } = render(
        <ConversionStatus
          status="idle"
          result={null}
          error={null}
          progress={0}
          queueInfo={null}
        />
      );

      expect(container.firstChild).toBeNull();
    });
  });

  // Converting State Tests

  describe('Converting State', () => {
    it('should show uploading message when progress < 100', () => {
      render(
        <ConversionStatus
          status="converting"
          result={null}
          error={null}
          progress={50}
          queueInfo={null}
        />
      );

      expect(screen.getByText(/uploading your file/i)).toBeInTheDocument();
      expect(screen.getByText(/upload progress: 50%/i)).toBeInTheDocument();
    });

    it('should show progress bar when uploading', () => {
      render(
        <ConversionStatus
          status="converting"
          result={null}
          error={null}
          progress={75}
          queueInfo={null}
        />
      );

      // Check for progress bar element with correct width
      const progressBar = document.querySelector('[style*="width: 75%"]');
      expect(progressBar).toBeInTheDocument();
    });

    it('should show queue position when in queue', () => {
      render(
        <ConversionStatus
          status="converting"
          result={null}
          error={null}
          progress={100}
          queueInfo={{
            status: 'queued',
            data: { position: 3 }
          }}
        />
      );

      // The component shows "In queue (3 jobs ahead)" in the heading
      expect(screen.getByRole('heading', { name: /in queue.*3 jobs ahead/i })).toBeInTheDocument();
    });

    it('should show singular "job" when 1 job ahead', () => {
      render(
        <ConversionStatus
          status="converting"
          result={null}
          error={null}
          progress={100}
          queueInfo={{
            status: 'queued',
            data: { position: 1 }
          }}
        />
      );

      expect(screen.getByText(/1 job ahead/i)).toBeInTheDocument();
    });

    it('should show processing message when actively processing', () => {
      render(
        <ConversionStatus
          status="converting"
          result={null}
          error={null}
          progress={100}
          queueInfo={{
            status: 'processing'
          }}
        />
      );

      expect(screen.getByText(/processing with ai/i)).toBeInTheDocument();
      expect(screen.getByText(/ai is analyzing your syllabus/i)).toBeInTheDocument();
    });

    it('should show spinner animation while converting', () => {
      render(
        <ConversionStatus
          status="converting"
          result={null}
          error={null}
          progress={50}
          queueInfo={null}
        />
      );

      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  // Success State Tests

  describe('Success State', () => {
    const mockResult = {
      data: {
        conversion: {
          fileName: 'CSCE_121_calendar.ics',
          downloadUrl: '/api/download/abc123',
          outputPath: '/output/calendar.ics',
          pdfPath: '/uploads/syllabus.pdf',
          metadata: {
            className: 'CSCE 121',
            sectionNumber: '501'
          }
        }
      }
    };

    it('should show success message', () => {
      render(
        <ConversionStatus
          status="success"
          result={mockResult}
          error={null}
          progress={100}
          queueInfo={null}
        />
      );

      expect(screen.getByText(/conversion successful/i)).toBeInTheDocument();
      expect(screen.getByText(/your calendar file is ready to download/i)).toBeInTheDocument();
    });

    it('should show download button', () => {
      render(
        <ConversionStatus
          status="success"
          result={mockResult}
          error={null}
          progress={100}
          queueInfo={null}
        />
      );

      expect(screen.getByText(/download calendar file/i)).toBeInTheDocument();
    });

    it('should call downloadFile when download button clicked', async () => {
      const user = userEvent.setup();

      render(
        <ConversionStatus
          status="success"
          result={mockResult}
          error={null}
          progress={100}
          queueInfo={null}
        />
      );

      const downloadButton = screen.getByText(/download calendar file/i);
      await user.click(downloadButton);

      expect(downloadFile).toHaveBeenCalledWith(
        '/api/download/abc123',
        'CSCE_121_calendar.ics'
      );
    });

    it('should show Google Drive button when signed in', () => {
      getAccessToken.mockReturnValue('test-access-token');

      render(
        <ConversionStatus
          status="success"
          result={mockResult}
          error={null}
          progress={100}
          queueInfo={null}
        />
      );

      expect(screen.getByText(/save to google drive/i)).toBeInTheDocument();
    });

    it('should not show Google Drive button when not signed in', () => {
      getAccessToken.mockReturnValue(null);

      render(
        <ConversionStatus
          status="success"
          result={mockResult}
          error={null}
          progress={100}
          queueInfo={null}
        />
      );

      expect(screen.queryByText(/save to google drive/i)).not.toBeInTheDocument();
    });

    it('should open Drive modal when Save to Drive clicked', async () => {
      const user = userEvent.setup();
      getAccessToken.mockReturnValue('test-token');

      render(
        <ConversionStatus
          status="success"
          result={mockResult}
          error={null}
          progress={100}
          queueInfo={null}
        />
      );

      const saveButton = screen.getByText(/save to google drive/i);
      await user.click(saveButton);

      expect(screen.getByText(/folder name/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText('AggieAce')).toBeInTheDocument();
    });
  });

  // Error State Tests

  describe('Error State', () => {
    it('should show error message', () => {
      render(
        <ConversionStatus
          status="error"
          result={null}
          error={{ message: 'Failed to process syllabus' }}
          progress={0}
          queueInfo={null}
        />
      );

      expect(screen.getByText(/conversion failed/i)).toBeInTheDocument();
      expect(screen.getByText(/failed to process syllabus/i)).toBeInTheDocument();
    });

    it('should show generic error when no message provided', () => {
      render(
        <ConversionStatus
          status="error"
          result={null}
          error={{}}
          progress={0}
          queueInfo={null}
        />
      );

      expect(screen.getByText(/an error occurred during conversion/i)).toBeInTheDocument();
    });

    it('should display validation errors list when provided', () => {
      render(
        <ConversionStatus
          status="error"
          result={null}
          error={{
            message: 'Validation failed',
            errors: [
              { message: 'Class name is required' },
              { message: 'Invalid date format' }
            ]
          }}
          progress={0}
          queueInfo={null}
        />
      );

      expect(screen.getByText(/class name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/invalid date format/i)).toBeInTheDocument();
    });
  });

  // Google Drive Modal Tests

  describe('Google Drive Modal', () => {
    const mockResult = {
      data: {
        conversion: {
          fileName: 'calendar.ics',
          downloadUrl: '/download',
          outputPath: '/output/calendar.ics',
          pdfPath: '/uploads/syllabus.pdf',
          metadata: {}
        }
      }
    };

    it('should save to Drive with correct parameters', async () => {
      const user = userEvent.setup();
      getAccessToken.mockReturnValue('test-token');

      saveToGoogleDrive.mockResolvedValue({
        data: {
          pdf: { webViewLink: 'https://drive.google.com/pdf' },
          calendar: { webViewLink: 'https://drive.google.com/ics' },
          folderLink: 'https://drive.google.com/folder'
        }
      });

      render(
        <ConversionStatus
          status="success"
          result={mockResult}
          error={null}
          progress={100}
          queueInfo={null}
        />
      );

      // Open modal - button says "Save to Google Drive"
      await user.click(screen.getByRole('button', { name: /save to google drive/i }));

      // Change folder name
      const folderInput = screen.getByPlaceholderText('AggieAce');
      await user.clear(folderInput);
      await user.type(folderInput, 'My Classes');

      // Click save - modal button says "Save to Drive" (without "Google")
      const modalButtons = screen.getAllByRole('button');
      const saveButton = modalButtons.find(btn => btn.textContent === 'Save to Drive');
      await user.click(saveButton);

      expect(saveToGoogleDrive).toHaveBeenCalledWith({
        googleAccessToken: 'test-token',
        pdfPath: '/uploads/syllabus.pdf',
        icsPath: '/output/calendar.ics',
        folderName: 'My Classes',
        metadata: {}
      });
    });

    it('should show saving state while saving', async () => {
      const user = userEvent.setup();
      getAccessToken.mockReturnValue('test-token');

      let resolvePromise;
      saveToGoogleDrive.mockReturnValue(
        new Promise((resolve) => {
          resolvePromise = resolve;
        })
      );

      render(
        <ConversionStatus
          status="success"
          result={mockResult}
          error={null}
          progress={100}
          queueInfo={null}
        />
      );

      await user.click(screen.getByRole('button', { name: /save to google drive/i }));

      // Click the modal save button
      const modalButtons = screen.getAllByRole('button');
      const saveButton = modalButtons.find(btn => btn.textContent === 'Save to Drive');
      await user.click(saveButton);

      expect(screen.getByText(/saving/i)).toBeInTheDocument();

      // Resolve the promise
      resolvePromise({
        data: {
          pdf: { webViewLink: '#' },
          calendar: { webViewLink: '#' },
          folderLink: '#'
        }
      });
    });

    it('should show error message on Drive save failure', async () => {
      const user = userEvent.setup();
      getAccessToken.mockReturnValue('test-token');

      saveToGoogleDrive.mockRejectedValue(new Error('Drive API error'));

      render(
        <ConversionStatus
          status="success"
          result={mockResult}
          error={null}
          progress={100}
          queueInfo={null}
        />
      );

      await user.click(screen.getByRole('button', { name: /save to google drive/i }));

      // Click the modal save button
      const modalButtons = screen.getAllByRole('button');
      const saveButton = modalButtons.find(btn => btn.textContent === 'Save to Drive');
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/drive api error/i)).toBeInTheDocument();
      });
    });

    it('should close modal when cancel clicked', async () => {
      const user = userEvent.setup();
      getAccessToken.mockReturnValue('test-token');

      render(
        <ConversionStatus
          status="success"
          result={mockResult}
          error={null}
          progress={100}
          queueInfo={null}
        />
      );

      await user.click(screen.getByText(/save to google drive/i));
      expect(screen.getByText(/folder name/i)).toBeInTheDocument();

      await user.click(screen.getByText(/cancel/i));
      expect(screen.queryByText(/folder name/i)).not.toBeInTheDocument();
    });

    it('should show success links after saving to Drive', async () => {
      const user = userEvent.setup();
      getAccessToken.mockReturnValue('test-token');

      saveToGoogleDrive.mockResolvedValue({
        data: {
          pdf: { webViewLink: 'https://drive.google.com/pdf' },
          calendar: { webViewLink: 'https://drive.google.com/ics' },
          folderLink: 'https://drive.google.com/folder'
        }
      });

      render(
        <ConversionStatus
          status="success"
          result={mockResult}
          error={null}
          progress={100}
          queueInfo={null}
        />
      );

      await user.click(screen.getByRole('button', { name: /save to google drive/i }));

      // Click the modal save button
      const modalButtons = screen.getAllByRole('button');
      const saveButton = modalButtons.find(btn => btn.textContent === 'Save to Drive');
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/files saved to google drive/i)).toBeInTheDocument();
        expect(screen.getByText(/view syllabus pdf/i)).toBeInTheDocument();
        expect(screen.getByText(/view calendar file/i)).toBeInTheDocument();
        expect(screen.getByText(/open folder in drive/i)).toBeInTheDocument();
      });
    });
  });

  // State Reset Tests

  describe('State Reset', () => {
    it('should reset Drive state when new conversion starts', async () => {
      const user = userEvent.setup();
      getAccessToken.mockReturnValue('test-token');

      const mockResult = {
        data: {
          conversion: {
            fileName: 'calendar.ics',
            downloadUrl: '/download',
            outputPath: '/output.ics',
            pdfPath: '/pdf.pdf',
            metadata: {}
          }
        }
      };

      saveToGoogleDrive.mockResolvedValue({
        data: {
          pdf: { webViewLink: '#' },
          calendar: { webViewLink: '#' },
          folderLink: '#'
        }
      });

      const { rerender } = render(
        <ConversionStatus
          status="success"
          result={mockResult}
          error={null}
          progress={100}
          queueInfo={null}
        />
      );

      // Save to Drive
      await user.click(screen.getByRole('button', { name: /save to google drive/i }));

      // Click the modal save button
      const modalButtons = screen.getAllByRole('button');
      const saveButton = modalButtons.find(btn => btn.textContent === 'Save to Drive');
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/files saved to google drive/i)).toBeInTheDocument();
      });

      // Start new conversion
      rerender(
        <ConversionStatus
          status="converting"
          result={null}
          error={null}
          progress={50}
          queueInfo={null}
        />
      );

      // Drive success should be cleared
      expect(screen.queryByText(/files saved to google drive/i)).not.toBeInTheDocument();
    });
  });
});
