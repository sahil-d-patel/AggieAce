/**
 * Unit Tests for MetadataForm Component
 *
 * Tests form rendering, input handling, and validation display
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MetadataForm from '@/components/MetadataForm';

describe('MetadataForm', () => {
  // Setup

  const defaultFormData = {
    className: '',
    sectionNumber: '',
    semesterStart: '',
    semesterEnd: '',
    timezone: 'America/Chicago'
  };

  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  // Rendering Tests

  describe('Rendering', () => {
    it('should render the form title', () => {
      render(
        <MetadataForm
          formData={defaultFormData}
          onChange={mockOnChange}
          disabled={false}
        />
      );

      expect(screen.getByText('Course Information')).toBeInTheDocument();
    });

    it('should render all required form fields', () => {
      render(
        <MetadataForm
          formData={defaultFormData}
          onChange={mockOnChange}
          disabled={false}
        />
      );

      expect(screen.getByLabelText(/class name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/section number/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/semester start date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/semester end date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/timezone/i)).toBeInTheDocument();
    });

    it('should show required indicators on all fields', () => {
      render(
        <MetadataForm
          formData={defaultFormData}
          onChange={mockOnChange}
          disabled={false}
        />
      );

      // Look for the asterisks indicating required fields
      const requiredIndicators = screen.getAllByText('*');
      expect(requiredIndicators.length).toBeGreaterThanOrEqual(5);
    });

    it('should render placeholder text for inputs', () => {
      render(
        <MetadataForm
          formData={defaultFormData}
          onChange={mockOnChange}
          disabled={false}
        />
      );

      expect(screen.getByPlaceholderText('e.g., CSCE 120')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('e.g., 520')).toBeInTheDocument();
      expect(screen.getAllByPlaceholderText('MM/DD/YYYY')).toHaveLength(2);
    });

    it('should render timezone dropdown with all options', () => {
      render(
        <MetadataForm
          formData={defaultFormData}
          onChange={mockOnChange}
          disabled={false}
        />
      );

      const timezoneSelect = screen.getByLabelText(/timezone/i);

      expect(timezoneSelect).toContainElement(screen.getByText(/central time/i));
      expect(timezoneSelect).toContainElement(screen.getByText(/eastern time/i));
      expect(timezoneSelect).toContainElement(screen.getByText(/mountain time/i));
      expect(timezoneSelect).toContainElement(screen.getByText(/pacific time/i));
      expect(timezoneSelect).toContainElement(screen.getByText(/arizona time/i));
      expect(timezoneSelect).toContainElement(screen.getByText(/alaska time/i));
      expect(timezoneSelect).toContainElement(screen.getByText(/hawaii time/i));
    });
  });

  // Value Display Tests

  describe('Value Display', () => {
    it('should display provided form values', () => {
      const formData = {
        className: 'CSCE 121',
        sectionNumber: '501',
        semesterStart: '01/16/2024',
        semesterEnd: '05/03/2024',
        timezone: 'America/New_York'
      };

      render(
        <MetadataForm
          formData={formData}
          onChange={mockOnChange}
          disabled={false}
        />
      );

      expect(screen.getByLabelText(/class name/i)).toHaveValue('CSCE 121');
      expect(screen.getByLabelText(/section number/i)).toHaveValue('501');
      expect(screen.getByLabelText(/semester start date/i)).toHaveValue('01/16/2024');
      expect(screen.getByLabelText(/semester end date/i)).toHaveValue('05/03/2024');
      expect(screen.getByLabelText(/timezone/i)).toHaveValue('America/New_York');
    });
  });

  // Input Change Tests

  describe('Input Changes', () => {
    it('should call onChange with updated className', async () => {
      const user = userEvent.setup();

      render(
        <MetadataForm
          formData={defaultFormData}
          onChange={mockOnChange}
          disabled={false}
        />
      );

      const classInput = screen.getByLabelText(/class name/i);
      await user.type(classInput, 'M');

      // onChange should be called with the updated className
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          className: 'M'
        })
      );
    });

    it('should call onChange with updated sectionNumber', async () => {
      const user = userEvent.setup();

      render(
        <MetadataForm
          formData={defaultFormData}
          onChange={mockOnChange}
          disabled={false}
        />
      );

      const sectionInput = screen.getByLabelText(/section number/i);
      await user.type(sectionInput, '5');

      // onChange should be called with the updated sectionNumber
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          sectionNumber: '5'
        })
      );
    });

    it('should call onChange with updated timezone', async () => {
      const user = userEvent.setup();

      render(
        <MetadataForm
          formData={defaultFormData}
          onChange={mockOnChange}
          disabled={false}
        />
      );

      const timezoneSelect = screen.getByLabelText(/timezone/i);
      await user.selectOptions(timezoneSelect, 'America/Los_Angeles');

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          timezone: 'America/Los_Angeles'
        })
      );
    });

    it('should preserve other form values when updating one field', async () => {
      const user = userEvent.setup();

      const initialData = {
        className: 'CSCE 121',
        sectionNumber: '501',
        semesterStart: '01/16/2024',
        semesterEnd: '05/03/2024',
        timezone: 'America/Chicago'
      };

      render(
        <MetadataForm
          formData={initialData}
          onChange={mockOnChange}
          disabled={false}
        />
      );

      const sectionInput = screen.getByLabelText(/section number/i);
      await user.clear(sectionInput);
      await user.type(sectionInput, '502');

      const lastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0];
      expect(lastCall.className).toBe('CSCE 121');
      expect(lastCall.semesterStart).toBe('01/16/2024');
      expect(lastCall.semesterEnd).toBe('05/03/2024');
      expect(lastCall.timezone).toBe('America/Chicago');
    });
  });

  // Disabled State Tests

  describe('Disabled State', () => {
    it('should disable all inputs when disabled is true', () => {
      render(
        <MetadataForm
          formData={defaultFormData}
          onChange={mockOnChange}
          disabled={true}
        />
      );

      expect(screen.getByLabelText(/class name/i)).toBeDisabled();
      expect(screen.getByLabelText(/section number/i)).toBeDisabled();
      expect(screen.getByLabelText(/semester start date/i)).toBeDisabled();
      expect(screen.getByLabelText(/semester end date/i)).toBeDisabled();
      expect(screen.getByLabelText(/timezone/i)).toBeDisabled();
    });

    it('should enable all inputs when disabled is false', () => {
      render(
        <MetadataForm
          formData={defaultFormData}
          onChange={mockOnChange}
          disabled={false}
        />
      );

      expect(screen.getByLabelText(/class name/i)).not.toBeDisabled();
      expect(screen.getByLabelText(/section number/i)).not.toBeDisabled();
      expect(screen.getByLabelText(/semester start date/i)).not.toBeDisabled();
      expect(screen.getByLabelText(/semester end date/i)).not.toBeDisabled();
      expect(screen.getByLabelText(/timezone/i)).not.toBeDisabled();
    });

    it('should not call onChange when disabled and trying to type', async () => {
      const user = userEvent.setup();

      render(
        <MetadataForm
          formData={defaultFormData}
          onChange={mockOnChange}
          disabled={true}
        />
      );

      const classInput = screen.getByLabelText(/class name/i);

      // Attempt to type - should not work
      await user.type(classInput, 'TEST');

      expect(mockOnChange).not.toHaveBeenCalled();
    });
  });

  // Accessibility Tests

  describe('Accessibility', () => {
    it('should have properly associated labels', () => {
      render(
        <MetadataForm
          formData={defaultFormData}
          onChange={mockOnChange}
          disabled={false}
        />
      );

      // Labels should be associated with inputs via htmlFor/id
      expect(screen.getByLabelText(/class name/i).id).toBe('className');
      expect(screen.getByLabelText(/section number/i).id).toBe('sectionNumber');
      expect(screen.getByLabelText(/semester start date/i).id).toBe('semesterStart');
      expect(screen.getByLabelText(/semester end date/i).id).toBe('semesterEnd');
      expect(screen.getByLabelText(/timezone/i).id).toBe('timezone');
    });

    it('should have required attribute on all inputs', () => {
      render(
        <MetadataForm
          formData={defaultFormData}
          onChange={mockOnChange}
          disabled={false}
        />
      );

      expect(screen.getByLabelText(/class name/i)).toHaveAttribute('required');
      expect(screen.getByLabelText(/section number/i)).toHaveAttribute('required');
      expect(screen.getByLabelText(/semester start date/i)).toHaveAttribute('required');
      expect(screen.getByLabelText(/semester end date/i)).toHaveAttribute('required');
      expect(screen.getByLabelText(/timezone/i)).toHaveAttribute('required');
    });
  });

  // Helper Text Tests

  describe('Helper Text', () => {
    it('should display helper text for class name', () => {
      render(
        <MetadataForm
          formData={defaultFormData}
          onChange={mockOnChange}
          disabled={false}
        />
      );

      expect(screen.getByText(/enter the course code and number/i)).toBeInTheDocument();
    });
  });
});
