#!/usr/bin/env python3

"""
AggieAce - Syllabus to Calendar Converter
Converts course syllabus PDFs to iCalendar (.ics) files using Google Gemini AI

This script uses a single LLM call to extract events, then generates the .ics
file programmatically in Python for reliability and speed.

This script is called by the Node.js server with command-line arguments.
"""

import google.generativeai as genai
import os
import sys
import argparse
import re
import uuid
from datetime import datetime, timedelta

# Configure the API key from environment variable
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
if not GEMINI_API_KEY:
    print("ERROR: GEMINI_API_KEY environment variable not set", file=sys.stderr)
    sys.exit(1)

genai.configure(api_key=GEMINI_API_KEY)

# Initialize model from environment variable
GEMINI_MODEL = os.getenv('GEMINI_MODEL', 'gemini-2.5-flash')
model = genai.GenerativeModel(GEMINI_MODEL)


def upload_syllabus(file_path):
    """
    Upload a PDF syllabus file to the Gemini API.

    Args:
        file_path (str): Path to the PDF file

    Returns:
        File object from Gemini API

    Raises:
        FileNotFoundError: If the specified file doesn't exist
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")

    print("STATUS: Uploading PDF to Gemini AI...")
    print(f"[UPLOAD] Uploading file: {file_path}")
    pdf_file = genai.upload_file(path=file_path)
    print("[OK] File uploaded successfully to Gemini AI\n")
    return pdf_file


def extract_events_from_syllabus(pdf_file, class_name, section_number, semester_start, semester_end, timezone):
    """
    LLM CALL #1: Extract all events, deadlines, and class schedules from the syllabus.

    This extracts structured event information for a specific section that will be
    used to generate the .ics file. Some syllabi contain multiple sections with
    different schedules, so the section number is used to extract the correct dates.

    Args:
        pdf_file: Uploaded file object from Gemini API
        class_name (str): Name of the class (e.g., "CSCE 311")
        section_number (str): Section number (e.g., "546")
        semester_start (str): Semester start date in MM/DD/YYYY format (for calculating relative dates)
        semester_end (str): Semester end date in MM/DD/YYYY format (for calculating relative dates)
        timezone (str): Timezone for the events (e.g., "America/Chicago", "America/New_York")

    Returns:
        str: Extracted events in structured format
    """
    prompt = f'''Analyze this syllabus and extract ALL scheduled events for SECTION {section_number} of {class_name}.

SEMESTER INFORMATION (for calculating dates):
- Semester Start: {semester_start}
- Semester End: {semester_end}
- Timezone: {timezone}

SECTION-SPECIFIC EXTRACTION:
- If the syllabus contains multiple sections with different schedules, extract ONLY events for Section {section_number}
- If the syllabus only has one section or doesn't specify sections, extract all events

HANDLING DATES:
1. For SPECIFIC DATES: Use exact date in MM/DD/YYYY format
2. For VAGUE/RELATIVE DATES (e.g., "Week 5", "Mid-semester", "Finals Week"):
   - Use the semester start/end dates to calculate the approximate date
   - It's OK if the calculation isn't 100% accurate - make your best estimate
   - Example: "Week 5" with semester start 08/25/2025 = approximately 09/22/2025
   - Example: "Finals Week" = week of {semester_end}
3. For MISSING/TBA DATES: SKIP the event entirely (do not include it)
   - Skip events with "TBA", "To be announced", "See Canvas", "Check online", etc.

HANDLING TIMES:
- Convert all times to 24-hour format (e.g., 7:00 PM = 19:00, 11:59 PM = 23:59)
- If no time is specified, use "all-day"
- Consider the timezone {timezone} when the syllabus mentions times

Extract the following types of events:
- Regular class meetings (lectures, labs, etc.) with days of the week
- Exams with specific dates (or estimated from "Week X")
- Assignment deadlines with specific dates (or estimated from "Week X")
- Office hours if they have specific recurring times
- Any other scheduled events

For each event, provide:
1. Event type/name (e.g., "Lecture", "Exam 1", "Project Deadline")
2. Date(s): Use "Monday-Wednesday-Friday" format for recurring, or "MM/DD/YYYY" for single dates
3. Time: Use "HH:MM-HH:MM" format (24-hour), or "all-day" if no time specified
4. Location if mentioned (If not mentioned, default to the Lecture room, or "TBA" if unknown)

FORMAT (pipe-separated is preferred, but other clear formats are acceptable):
EventName | Date(s) | Time | Location

Example output:
Lecture | Monday-Wednesday-Friday | 11:30-12:30 | ROOM101
Midterm Exam | 10/15/2025 | 19:00-21:00 | ROOM101
Project Deadline | 11/20/2025 | 23:59 | Online
Final Exam | 12/12/2025 | all-day | TBA

Remember:
- Extract ONLY for Section {section_number} if multiple sections exist
- SKIP events without dates (TBA, etc.)
- ESTIMATE dates from relative references (Week 5, Finals Week, etc.)
- Convert times to 24-hour format considering timezone {timezone}'''

    print("\nSTATUS: Analyzing syllabus with AI (Step 1 of 2)...")
    print("="*70)
    print(f"[LLM] LLM CALL #1: Extracting events for Section {section_number}")
    print(f"Timezone: {timezone}")
    print("="*70)

    response = model.generate_content([prompt, pdf_file])
    extracted_events = response.text.strip()

    if not extracted_events:
        raise ValueError("No events extracted from syllabus. The syllabus may be empty or unreadable.")

    print("[OK] LLM Call #1 Complete - Events Extracted:")
    print("-"*70)
    print(extracted_events)
    print()

    return extracted_events


def parse_extracted_events(extracted_events, semester_start, semester_end):
    """
    Parse the LLM-extracted events into a structured list.

    Handles various formats that the LLM might output:
    - Pipe-separated: EventName | Date(s) | Time | Location
    - Tab-separated or other delimiters

    Args:
        extracted_events (str): Raw event text from LLM
        semester_start (str): Semester start date MM/DD/YYYY
        semester_end (str): Semester end date MM/DD/YYYY

    Returns:
        list: List of event dictionaries
    """
    events = []
    lines = extracted_events.strip().split('\n')

    # Day name mappings for recurring events
    day_map = {
        'monday': 'MO', 'mon': 'MO', 'm': 'MO',
        'tuesday': 'TU', 'tue': 'TU', 'tu': 'TU', 't': 'TU',
        'wednesday': 'WE', 'wed': 'WE', 'w': 'WE',
        'thursday': 'TH', 'thu': 'TH', 'th': 'TH', 'r': 'TH',
        'friday': 'FR', 'fri': 'FR', 'f': 'FR',
        'saturday': 'SA', 'sat': 'SA', 's': 'SA',
        'sunday': 'SU', 'sun': 'SU', 'su': 'SU'
    }

    sem_start = datetime.strptime(semester_start, '%m/%d/%Y')
    sem_end = datetime.strptime(semester_end, '%m/%d/%Y')

    for line in lines:
        line = line.strip()
        if not line or line.startswith('#') or line.startswith('-'):
            continue

        # Try pipe-separated first (most common from our prompt)
        if '|' in line:
            parts = [p.strip() for p in line.split('|')]
        elif '\t' in line:
            parts = [p.strip() for p in line.split('\t')]
        else:
            # Try to parse other formats - skip if can't parse
            continue

        if len(parts) < 3:
            continue

        event_name = parts[0]
        date_str = parts[1]
        time_str = parts[2] if len(parts) > 2 else 'all-day'
        location = parts[3] if len(parts) > 3 else 'TBA'

        # Clean up fields
        event_name = event_name.strip()
        date_str = date_str.strip()
        time_str = time_str.strip()
        location = location.strip()

        # Determine if recurring (contains day names) or single date
        date_lower = date_str.lower()
        recurring_days = []

        # Check for day names (indicates recurring)
        for day_name, day_code in day_map.items():
            if day_name in date_lower and day_code not in recurring_days:
                recurring_days.append(day_code)

        if recurring_days:
            # This is a recurring event
            event = {
                'name': event_name,
                'type': 'recurring',
                'days': recurring_days,
                'time': time_str,
                'location': location,
                'start_date': find_first_occurrence(sem_start, recurring_days),
                'end_date': sem_end
            }
        else:
            # Single date event - try to parse the date
            event_date = parse_date(date_str, sem_start, sem_end)
            if event_date:
                event = {
                    'name': event_name,
                    'type': 'single',
                    'date': event_date,
                    'time': time_str,
                    'location': location
                }
            else:
                # Skip events we can't parse
                print(f"[WARN] Skipping event with unparseable date: {event_name} | {date_str}")
                continue

        events.append(event)

    return events


def parse_date(date_str, sem_start, sem_end):
    """
    Parse a date string into a datetime object.

    Handles:
    - MM/DD/YYYY format
    - MM/DD format (uses semester year)
    - Month DD, YYYY format

    Args:
        date_str (str): Date string to parse
        sem_start (datetime): Semester start date
        sem_end (datetime): Semester end date

    Returns:
        datetime or None if parsing fails
    """
    date_str = date_str.strip()

    # Try MM/DD/YYYY
    try:
        return datetime.strptime(date_str, '%m/%d/%Y')
    except ValueError:
        pass

    # Try MM/DD (use semester year)
    try:
        dt = datetime.strptime(date_str, '%m/%d')
        # Determine which year based on semester
        dt = dt.replace(year=sem_start.year)
        if dt < sem_start:
            dt = dt.replace(year=sem_end.year)
        return dt
    except ValueError:
        pass

    # Try "Month DD, YYYY"
    try:
        return datetime.strptime(date_str, '%B %d, %Y')
    except ValueError:
        pass

    # Try "Month DD"
    try:
        dt = datetime.strptime(date_str, '%B %d')
        dt = dt.replace(year=sem_start.year)
        if dt < sem_start:
            dt = dt.replace(year=sem_end.year)
        return dt
    except ValueError:
        pass

    # Try "Mon DD" (abbreviated month)
    try:
        dt = datetime.strptime(date_str, '%b %d')
        dt = dt.replace(year=sem_start.year)
        if dt < sem_start:
            dt = dt.replace(year=sem_end.year)
        return dt
    except ValueError:
        pass

    return None


def find_first_occurrence(start_date, days):
    """
    Find the first occurrence of the given weekdays on or after start_date.

    Args:
        start_date (datetime): The date to start searching from
        days (list): List of day codes ['MO', 'WE', 'FR']

    Returns:
        datetime: First occurrence date
    """
    day_to_weekday = {'MO': 0, 'TU': 1, 'WE': 2, 'TH': 3, 'FR': 4, 'SA': 5, 'SU': 6}
    target_weekdays = [day_to_weekday[d] for d in days if d in day_to_weekday]

    if not target_weekdays:
        return start_date

    current = start_date
    for _ in range(7):  # Search up to 7 days
        if current.weekday() in target_weekdays:
            return current
        current += timedelta(days=1)

    return start_date


def parse_time(time_str):
    """
    Parse a time string into start and end times.

    Handles:
    - "HH:MM-HH:MM" (24-hour)
    - "HH:MM" (single time, assume 1 hour duration)
    - "all-day"

    Args:
        time_str (str): Time string to parse

    Returns:
        tuple: (start_time, end_time, is_all_day)
               Times are strings in HHMMSS format, or None for all-day
    """
    time_str = time_str.strip().lower()

    if 'all-day' in time_str or 'all day' in time_str or time_str == '':
        return (None, None, True)

    # Remove any extra text
    time_str = re.sub(r'[^\d:-]', '', time_str)

    if '-' in time_str:
        parts = time_str.split('-')
        start_time = parts[0].strip()
        end_time = parts[1].strip() if len(parts) > 1 else None
    else:
        start_time = time_str
        end_time = None

    # Parse start time
    start_h, start_m = 0, 0
    if ':' in start_time:
        parts = start_time.split(':')
        start_h = int(parts[0])
        start_m = int(parts[1]) if len(parts) > 1 else 0
    elif start_time.isdigit():
        start_h = int(start_time)

    # Parse end time or default to 1 hour later
    if end_time and ':' in end_time:
        parts = end_time.split(':')
        end_h = int(parts[0])
        end_m = int(parts[1]) if len(parts) > 1 else 0
    elif end_time and end_time.isdigit():
        end_h = int(end_time)
        end_m = 0
    else:
        # Default to 1 hour duration
        end_h = start_h + 1
        end_m = start_m

    start_formatted = f"{start_h:02d}{start_m:02d}00"
    end_formatted = f"{end_h:02d}{end_m:02d}00"

    return (start_formatted, end_formatted, False)


def escape_ics_text(text):
    """
    Escape special characters for iCalendar format.

    Args:
        text (str): Text to escape

    Returns:
        str: Escaped text
    """
    if not text:
        return ""
    text = text.replace('\\', '\\\\')
    text = text.replace(';', '\\;')
    text = text.replace(',', '\\,')
    text = text.replace('\n', '\\n')
    return text


def generate_ics_file(extracted_events, class_name, section_number, semester_start, semester_end, timezone):
    """
    Generate .ics calendar file from extracted events using Python (no LLM call).

    This generates the final iCalendar format with proper recurring events and timezones.

    Args:
        extracted_events (str): Structured event data from extract_events_from_syllabus()
        class_name (str): Name of the class (e.g., "CSCE 311")
        section_number (str): Section number (e.g., "546")
        semester_start (str): Semester start date in MM/DD/YYYY format
        semester_end (str): Semester end date in MM/DD/YYYY format
        timezone (str): Timezone for the events (e.g., "America/Chicago", "America/New_York")

    Returns:
        str: Complete .ics file content ready to be saved
    """
    print("\nSTATUS: Generating calendar file (Step 2 of 2)...")
    print("="*70)
    print("[GENERATOR] Python ICS Generator (no LLM call)")
    print("="*70)

    # Parse the extracted events
    events = parse_extracted_events(extracted_events, semester_start, semester_end)

    if not events:
        raise ValueError("No valid events could be parsed from extraction")

    print(f"[EVENTS] Parsed {len(events)} events from extraction")

    # Format the full class name with section number
    full_class_name = f"{class_name} ({section_number})"

    # Current timestamp for DTSTAMP
    now = datetime.utcnow()
    dtstamp = now.strftime('%Y%m%dT%H%M%SZ')

    # Parse semester end for RRULE UNTIL
    sem_end = datetime.strptime(semester_end, '%m/%d/%Y')
    until_date = sem_end.strftime('%Y%m%dT235959')

    # Build .ics content
    ics_lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "CALSCALE:GREGORIAN",
        "PRODID:-//AggieAce//Syllabus Converter//EN",
        f"X-WR-TIMEZONE:{timezone}",
        f"X-WR-CALNAME:{escape_ics_text(full_class_name)}"
    ]

    for event in events:
        event_uid = f"{uuid.uuid4()}@aggieace.converter"
        event_name = escape_ics_text(event['name'])
        location = escape_ics_text(event.get('location', 'TBA'))
        summary = f"{escape_ics_text(full_class_name)} - {event_name}"

        start_time, end_time, is_all_day = parse_time(event.get('time', 'all-day'))

        ics_lines.append("BEGIN:VEVENT")
        ics_lines.append(f"UID:{event_uid}")
        ics_lines.append(f"DTSTAMP:{dtstamp}")
        ics_lines.append(f"SUMMARY:{summary}")
        ics_lines.append(f"LOCATION:{location}")
        ics_lines.append(f"STATUS:CONFIRMED")

        if event['type'] == 'recurring':
            # Recurring event
            start_date = event['start_date']

            if is_all_day:
                date_str = start_date.strftime('%Y%m%d')
                next_day = (start_date + timedelta(days=1)).strftime('%Y%m%d')
                ics_lines.append(f"DTSTART;VALUE=DATE:{date_str}")
                ics_lines.append(f"DTEND;VALUE=DATE:{next_day}")
            else:
                date_str = start_date.strftime('%Y%m%d')
                ics_lines.append(f"DTSTART:{date_str}T{start_time}")
                ics_lines.append(f"DTEND:{date_str}T{end_time}")

            # Add recurrence rule
            days_str = ','.join(event['days'])
            ics_lines.append(f"RRULE:FREQ=WEEKLY;BYDAY={days_str};UNTIL={until_date}")
            ics_lines.append(f"DESCRIPTION:Recurring {event_name}")
        else:
            # Single event
            event_date = event['date']

            if is_all_day:
                date_str = event_date.strftime('%Y%m%d')
                next_day = (event_date + timedelta(days=1)).strftime('%Y%m%d')
                ics_lines.append(f"DTSTART;VALUE=DATE:{date_str}")
                ics_lines.append(f"DTEND;VALUE=DATE:{next_day}")
            else:
                date_str = event_date.strftime('%Y%m%d')
                ics_lines.append(f"DTSTART:{date_str}T{start_time}")
                ics_lines.append(f"DTEND:{date_str}T{end_time}")

            ics_lines.append(f"DESCRIPTION:{event_name}")

        ics_lines.append("END:VEVENT")

    ics_lines.append("END:VCALENDAR")

    ics_content = '\r\n'.join(ics_lines)

    # Validate the .ics content
    print("\nSTATUS: Validating calendar format...")
    validate_ics_content(ics_content)

    print("[OK] Python ICS Generation Complete")
    print()

    return ics_content


def validate_ics_content(ics_content):
    """
    Validate that the generated .ics content is well-formed.

    Args:
        ics_content (str): The .ics file content

    Raises:
        ValueError: If .ics content is malformed
    """
    required_elements = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "CALSCALE:GREGORIAN",
        "END:VCALENDAR"
    ]

    for element in required_elements:
        if element not in ics_content:
            raise ValueError(f"Invalid .ics file: missing required element '{element}'")

    # Check for at least one event
    if "BEGIN:VEVENT" not in ics_content or "END:VEVENT" not in ics_content:
        raise ValueError("Invalid .ics file: no events found")

    # Count events
    event_count = ics_content.count("BEGIN:VEVENT")
    if event_count != ics_content.count("END:VEVENT"):
        raise ValueError(f"Invalid .ics file: mismatched VEVENT tags")

    print(f"[OK] ICS validation passed: {event_count} events found")


def save_ics_file(ics_content, output_file):
    """
    Save the generated iCalendar content to a .ics file.

    Args:
        ics_content (str): Complete .ics file content
        output_file (str): Output filename (e.g., "CSCE311_546.ics")

    Raises:
        IOError: If file cannot be written
    """
    print("\nSTATUS: Saving calendar file...")
    # Ensure directory exists
    output_dir = os.path.dirname(output_file)
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir)

    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(ics_content)
    except Exception as e:
        raise IOError(f"Failed to save file {output_file}: {str(e)}")

    print("="*70)
    print(f"[OK] Calendar saved to: {output_file}")
    print("="*70)
    print("[IMPORT] Import this file into:")
    print("   - Google Calendar")
    print("   - Apple Calendar")
    print("   - Outlook")
    print("   - Any other calendar application")
    print()


def validate_date_format(date_str):
    """
    Validate that a date string is in MM/DD/YYYY format.

    Args:
        date_str (str): Date string to validate

    Returns:
        bool: True if valid format

    Raises:
        ValueError: If date format is invalid
    """
    try:
        datetime.strptime(date_str, "%m/%d/%Y")
        return True
    except ValueError:
        raise ValueError(f"Invalid date format: {date_str}. Expected MM/DD/YYYY")


def convert_syllabus_to_calendar(
    pdf_path,
    class_name,
    section_number,
    semester_start,
    semester_end,
    output_file,
    timezone="America/Chicago"
):
    """
    Main function to convert a syllabus PDF into a calendar .ics file.

    This orchestrates the entire conversion process:
    1. Upload the PDF syllabus
    2. Extract events for the specific section using LLM (Call #1)
    3. Generate .ics format using LLM (Call #2)
    4. Save the calendar file

    Args:
        pdf_path (str): Path to the syllabus PDF file
        class_name (str): Name of the class (e.g., "CSCE 311")
        section_number (str): Section number (e.g., "546")
        semester_start (str): Semester start date in MM/DD/YYYY format
        semester_end (str): Semester end date in MM/DD/YYYY format
        output_file (str): Output filename for the .ics file (e.g., "CSCE311_546.ics")
        timezone (str): Timezone for the events (default: "America/Chicago")
                       Common values:
                       - "America/Chicago" (Central Time)
                       - "America/New_York" (Eastern Time)
                       - "America/Los_Angeles" (Pacific Time)
                       - "America/Denver" (Mountain Time)

    Returns:
        str: Generated .ics file content

    Raises:
        FileNotFoundError: If PDF file doesn't exist
        ValueError: If date formats are invalid or extraction fails
        IOError: If file cannot be saved
    """
    full_class_identifier = f"{class_name} ({section_number})"

    print("\n" + "="*70)
    print("SYLLABUS TO CALENDAR CONVERTER")
    print("="*70)
    print(f"Class: {full_class_identifier}")
    print(f"Semester: {semester_start} to {semester_end}")
    print(f"Timezone: {timezone}")
    print(f"Output: {output_file}")
    print("="*70 + "\n")

    # Validate inputs
    validate_date_format(semester_start)
    validate_date_format(semester_end)

    try:
        # Step 1: Upload the syllabus PDF
        pdf_file = upload_syllabus(pdf_path)

        # Step 2: LLM Call #1 - Extract events from syllabus for specific section
        extracted_events = extract_events_from_syllabus(
            pdf_file,
            class_name,
            section_number,
            semester_start,
            semester_end,
            timezone
        )

        # Step 3: LLM Call #2 - Generate .ics calendar file
        ics_content = generate_ics_file(
            extracted_events,
            class_name,
            section_number,
            semester_start,
            semester_end,
            timezone
        )

        # Step 4: Save the calendar file
        save_ics_file(ics_content, output_file)

        print("="*70)
        print("[SUCCESS] CONVERSION COMPLETE")
        print("="*70)
        print(f"Total LLM API calls made: 1 (extraction only)")
        print(f"ICS generation: Python (no LLM)")
        print(f"Section-specific extraction: Section {section_number}")
        print(f"Timezone: {timezone}")
        print(f"Vague dates estimated using semester dates")
        print(f"Events without dates excluded")
        print()

        return ics_content

    except Exception as e:
        print("\n" + "="*70)
        print(f"[ERROR] Error occurred: {str(e)}")
        print("="*70)
        print("\nTroubleshooting tips:")
        print("1. Check that the PDF is readable (not a scanned image)")
        print(f"2. Verify Section {section_number} exists in the syllabus")
        print("3. Ensure semester dates are in MM/DD/YYYY format")
        print("4. Check that the syllabus contains scheduled events")
        print(f"5. Verify timezone '{timezone}' is correct")
        print()
        raise


def main():
    """Parse command-line arguments and run the conversion."""
    parser = argparse.ArgumentParser(
        description='Convert course syllabus PDF to iCalendar format',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Example:
  python process_syllabus.py --pdf syllabus.pdf --class-name "CSCE 120" \\
    --section "520" --start-date "08/25/2025" --end-date "12/16/2025" \\
    --timezone "America/Chicago" --output calendar.ics
        """
    )

    parser.add_argument('--pdf', required=True, help='Path to the syllabus PDF file')
    parser.add_argument('--class-name', required=True, help='Class name (e.g., "CSCE 120")')
    parser.add_argument('--section', required=True, help='Section number (e.g., "520")')
    parser.add_argument('--start-date', required=True, help='Semester start date (MM/DD/YYYY)')
    parser.add_argument('--end-date', required=True, help='Semester end date (MM/DD/YYYY)')
    parser.add_argument('--timezone', default='America/Chicago', help='Timezone (default: America/Chicago)')
    parser.add_argument('--output', required=True, help='Output .ics file path')

    args = parser.parse_args()

    try:
        # Validate dates
        datetime.strptime(args.start_date, '%m/%d/%Y')
        datetime.strptime(args.end_date, '%m/%d/%Y')

        # Run conversion
        convert_syllabus_to_calendar(
            pdf_path=args.pdf,
            class_name=args.class_name,
            section_number=args.section,
            semester_start=args.start_date,
            semester_end=args.end_date,
            output_file=args.output,
            timezone=args.timezone
        )

        print(f"\n[SUCCESS] SUCCESS: Calendar file created at {args.output}")
        sys.exit(0)

    except ValueError as e:
        print(f"\n[ERROR] ERROR: Invalid date format. Use MM/DD/YYYY", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"\n[ERROR] ERROR: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
