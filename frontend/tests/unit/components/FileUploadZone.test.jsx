/**
 * Unit Tests for FileUploadZone Component
 *
 * Tests file upload, validation, and drag-and-drop functionality
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FileUploadZone from '@/components/FileUploadZone';

describe('FileUploadZone', () => {
  // Setup

  const mockOnFileSelect = jest.fn();

  beforeEach(() => {
    mockOnFileSelect.mockClear();
  });

  // Rendering Tests

  describe('Rendering', () => {
    it('should render upload zone when no file is selected', () => {
      render(<FileUploadZone onFileSelect={mockOnFileSelect} selectedFile={null} />);

      expect(screen.getByText(/drop your syllabus pdf here/i)).toBeInTheDocument();
      expect(screen.getByText(/or click to browse files/i)).toBeInTheDocument();
      expect(screen.getByText(/maximum file size: 10mb/i)).toBeInTheDocument();
    });

    it('should render file info when file is selected', () => {
      const mockFile = new File(['content'], 'test-syllabus.pdf', { type: 'application/pdf' });
      Object.defineProperty(mockFile, 'size', { value: 1024 * 1024 }); // 1MB

      render(<FileUploadZone onFileSelect={mockOnFileSelect} selectedFile={mockFile} />);

      expect(screen.getByText('test-syllabus.pdf')).toBeInTheDocument();
      expect(screen.getByText('1.00 MB')).toBeInTheDocument();
    });

    it('should show remove button when file is selected', () => {
      const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });

      render(<FileUploadZone onFileSelect={mockOnFileSelect} selectedFile={mockFile} />);

      const removeButton = screen.getByTitle('Remove file');
      expect(removeButton).toBeInTheDocument();
    });

    it('should have hidden file input', () => {
      render(<FileUploadZone onFileSelect={mockOnFileSelect} selectedFile={null} />);

      const fileInput = document.getElementById('file-input');
      expect(fileInput).toBeInTheDocument();
      expect(fileInput).toHaveClass('hidden');
    });
  });

  // File Selection Tests

  describe('File Selection', () => {
    it('should accept valid PDF file via input', () => {
      render(<FileUploadZone onFileSelect={mockOnFileSelect} selectedFile={null} />);

      const mockFile = new File(['pdf content'], 'syllabus.pdf', { type: 'application/pdf' });
      const fileInput = document.getElementById('file-input');

      fireEvent.change(fileInput, { target: { files: [mockFile] } });

      expect(mockOnFileSelect).toHaveBeenCalledWith(mockFile);
    });

    it('should reject non-PDF files', () => {
      window.alert = jest.fn();

      render(<FileUploadZone onFileSelect={mockOnFileSelect} selectedFile={null} />);

      const mockFile = new File(['content'], 'document.txt', { type: 'text/plain' });
      const fileInput = document.getElementById('file-input');

      fireEvent.change(fileInput, { target: { files: [mockFile] } });

      expect(window.alert).toHaveBeenCalledWith('Please upload a PDF file');
      expect(mockOnFileSelect).not.toHaveBeenCalled();
    });

    it('should reject files larger than 10MB', () => {
      window.alert = jest.fn();

      render(<FileUploadZone onFileSelect={mockOnFileSelect} selectedFile={null} />);

      const mockFile = new File(['large content'], 'large.pdf', { type: 'application/pdf' });
      // Mock file size to be 11MB
      Object.defineProperty(mockFile, 'size', { value: 11 * 1024 * 1024 });
      const fileInput = document.getElementById('file-input');

      fireEvent.change(fileInput, { target: { files: [mockFile] } });

      expect(window.alert).toHaveBeenCalledWith('File size must be less than 10MB');
      expect(mockOnFileSelect).not.toHaveBeenCalled();
    });

    it('should accept files exactly at 10MB limit', () => {
      render(<FileUploadZone onFileSelect={mockOnFileSelect} selectedFile={null} />);

      const mockFile = new File(['content'], 'exact.pdf', { type: 'application/pdf' });
      Object.defineProperty(mockFile, 'size', { value: 10 * 1024 * 1024 }); // Exactly 10MB
      const fileInput = document.getElementById('file-input');

      fireEvent.change(fileInput, { target: { files: [mockFile] } });

      expect(mockOnFileSelect).toHaveBeenCalledWith(mockFile);
    });
  });

  // File Removal Tests

  describe('File Removal', () => {
    it('should call onFileSelect with null when remove button is clicked', async () => {
      const user = userEvent.setup();
      const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });

      render(<FileUploadZone onFileSelect={mockOnFileSelect} selectedFile={mockFile} />);

      const removeButton = screen.getByTitle('Remove file');
      await user.click(removeButton);

      expect(mockOnFileSelect).toHaveBeenCalledWith(null);
    });
  });

  // Drag and Drop Tests

  describe('Drag and Drop', () => {
    it('should add active class on drag over', () => {
      render(<FileUploadZone onFileSelect={mockOnFileSelect} selectedFile={null} />);

      const dropZone = screen.getByText(/drop your syllabus pdf here/i).closest('.upload-zone');

      fireEvent.dragOver(dropZone);

      expect(dropZone).toHaveClass('upload-zone-active');
    });

    it('should remove active class on drag leave', () => {
      render(<FileUploadZone onFileSelect={mockOnFileSelect} selectedFile={null} />);

      const dropZone = screen.getByText(/drop your syllabus pdf here/i).closest('.upload-zone');

      fireEvent.dragOver(dropZone);
      expect(dropZone).toHaveClass('upload-zone-active');

      fireEvent.dragLeave(dropZone);
      expect(dropZone).not.toHaveClass('upload-zone-active');
    });

    it('should handle file drop with valid PDF', () => {
      render(<FileUploadZone onFileSelect={mockOnFileSelect} selectedFile={null} />);

      const mockFile = new File(['pdf content'], 'dropped.pdf', { type: 'application/pdf' });
      const dropZone = screen.getByText(/drop your syllabus pdf here/i).closest('.upload-zone');

      const dataTransfer = {
        files: [mockFile],
        items: [{ kind: 'file', type: 'application/pdf', getAsFile: () => mockFile }],
        types: ['Files']
      };

      fireEvent.drop(dropZone, { dataTransfer });

      expect(mockOnFileSelect).toHaveBeenCalledWith(mockFile);
    });

    it('should reject non-PDF file on drop', () => {
      window.alert = jest.fn();

      render(<FileUploadZone onFileSelect={mockOnFileSelect} selectedFile={null} />);

      const mockFile = new File(['content'], 'image.png', { type: 'image/png' });
      const dropZone = screen.getByText(/drop your syllabus pdf here/i).closest('.upload-zone');

      const dataTransfer = {
        files: [mockFile],
        items: [{ kind: 'file', type: 'image/png', getAsFile: () => mockFile }],
        types: ['Files']
      };

      fireEvent.drop(dropZone, { dataTransfer });

      expect(window.alert).toHaveBeenCalledWith('Please upload a PDF file');
      expect(mockOnFileSelect).not.toHaveBeenCalled();
    });

    it('should prevent default on drag over', () => {
      render(<FileUploadZone onFileSelect={mockOnFileSelect} selectedFile={null} />);

      const dropZone = screen.getByText(/drop your syllabus pdf here/i).closest('.upload-zone');

      const dragOverEvent = new Event('dragover', { bubbles: true, cancelable: true });
      dropZone.dispatchEvent(dragOverEvent);

      expect(dragOverEvent.defaultPrevented).toBe(true);
    });
  });

  // Click to Upload Tests

  describe('Click to Upload', () => {
    it('should trigger file input click when upload zone is clicked', async () => {
      render(<FileUploadZone onFileSelect={mockOnFileSelect} selectedFile={null} />);

      const fileInput = document.getElementById('file-input');
      const clickSpy = jest.spyOn(fileInput, 'click');

      const dropZone = screen.getByText(/drop your syllabus pdf here/i).closest('.upload-zone');
      fireEvent.click(dropZone);

      expect(clickSpy).toHaveBeenCalled();
    });
  });

  // File Size Display Tests

  describe('File Size Display', () => {
    it('should display file size in MB with 2 decimal places', () => {
      const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(mockFile, 'size', { value: 2.567 * 1024 * 1024 }); // ~2.57 MB

      render(<FileUploadZone onFileSelect={mockOnFileSelect} selectedFile={mockFile} />);

      expect(screen.getByText('2.57 MB')).toBeInTheDocument();
    });

    it('should display small file sizes correctly', () => {
      const mockFile = new File(['content'], 'tiny.pdf', { type: 'application/pdf' });
      Object.defineProperty(mockFile, 'size', { value: 100 * 1024 }); // ~0.1 MB

      render(<FileUploadZone onFileSelect={mockOnFileSelect} selectedFile={mockFile} />);

      expect(screen.getByText('0.10 MB')).toBeInTheDocument();
    });
  });

  // Empty State Tests

  describe('Empty States', () => {
    it('should handle no files in input change event', () => {
      render(<FileUploadZone onFileSelect={mockOnFileSelect} selectedFile={null} />);

      const fileInput = document.getElementById('file-input');

      fireEvent.change(fileInput, { target: { files: [] } });

      expect(mockOnFileSelect).not.toHaveBeenCalled();
    });

    it('should handle no files in drop event', () => {
      render(<FileUploadZone onFileSelect={mockOnFileSelect} selectedFile={null} />);

      const dropZone = screen.getByText(/drop your syllabus pdf here/i).closest('.upload-zone');

      const dataTransfer = {
        files: [],
        items: [],
        types: ['Files']
      };

      fireEvent.drop(dropZone, { dataTransfer });

      expect(mockOnFileSelect).not.toHaveBeenCalled();
    });
  });
});
