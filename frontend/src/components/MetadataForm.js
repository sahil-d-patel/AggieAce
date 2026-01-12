/**
 * Metadata Form Component
 *
 * Form for entering course metadata
 *
 * @module components/MetadataForm
 */

'use client';

export default function MetadataForm({ formData, onChange, disabled }) {
  const handleChange = (e) => {
    const { name, value } = e.target;
    onChange({ ...formData, [name]: value });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Course Information</h2>

      {/* Class Name */}
      <div>
        <label htmlFor="className" className="block text-sm font-semibold text-gray-700 mb-2">
          Class Name <span className="text-red-600">*</span>
        </label>
        <input
          type="text"
          id="className"
          name="className"
          value={formData.className}
          onChange={handleChange}
          disabled={disabled}
          placeholder="e.g., CSCE 120"
          className="input-field"
          required
        />
        <p className="text-xs text-gray-500 mt-1">
          Enter the course code and number
        </p>
      </div>

      {/* Section Number */}
      <div>
        <label htmlFor="sectionNumber" className="block text-sm font-semibold text-gray-700 mb-2">
          Section Number <span className="text-red-600">*</span>
        </label>
        <input
          type="text"
          id="sectionNumber"
          name="sectionNumber"
          value={formData.sectionNumber}
          onChange={handleChange}
          disabled={disabled}
          placeholder="e.g., 520"
          className="input-field"
          required
        />
      </div>

      {/* Semester Dates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="semesterStart" className="block text-sm font-semibold text-gray-700 mb-2">
            Semester Start Date <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            id="semesterStart"
            name="semesterStart"
            value={formData.semesterStart}
            onChange={handleChange}
            disabled={disabled}
            placeholder="MM/DD/YYYY"
            className="input-field"
            required
          />
        </div>

        <div>
          <label htmlFor="semesterEnd" className="block text-sm font-semibold text-gray-700 mb-2">
            Semester End Date <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            id="semesterEnd"
            name="semesterEnd"
            value={formData.semesterEnd}
            onChange={handleChange}
            disabled={disabled}
            placeholder="MM/DD/YYYY"
            className="input-field"
            required
          />
        </div>
      </div>

      {/* Timezone */}
      <div>
        <label htmlFor="timezone" className="block text-sm font-semibold text-gray-700 mb-2">
          Timezone <span className="text-red-600">*</span>
        </label>
        <select
          id="timezone"
          name="timezone"
          value={formData.timezone}
          onChange={handleChange}
          disabled={disabled}
          className="input-field"
          required
        >
          <option value="America/Chicago">Central Time (America/Chicago)</option>
          <option value="America/New_York">Eastern Time (America/New_York)</option>
          <option value="America/Denver">Mountain Time (America/Denver)</option>
          <option value="America/Phoenix">Arizona Time (America/Phoenix)</option>
          <option value="America/Los_Angeles">Pacific Time (America/Los_Angeles)</option>
          <option value="America/Anchorage">Alaska Time (America/Anchorage)</option>
          <option value="Pacific/Honolulu">Hawaii Time (Pacific/Honolulu)</option>
        </select>
      </div>
    </div>
  );
}
