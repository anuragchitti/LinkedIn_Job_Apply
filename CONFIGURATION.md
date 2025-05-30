# Configuration File Explanation

This document explains the keys and values used in the `config.json` file for the LinkedIn job application automation script.

## User Credentials
- **username**: Your LinkedIn username or email address.
- **password**: Your LinkedIn account password.
- **phone_number**: Your phone number (optional).

## Job Search Preferences
- **positions**: An array of job titles or positions you want to search for on LinkedIn.
- **locations**: An array of locations where you want to find jobs. Can include states, countries, or "Remote".
- **salary**: Desired salary amount (used for filtering if implemented).
- **rate**: Salary rate period, e.g., "Yearly", "Monthly".

## Filters
- **blacklist**: An array of keywords to exclude from job titles or company names.
- **blackListTitles**: An array of job titles to exclude from search results.
- **experience_level**: An array of LinkedIn experience level codes to filter jobs by experience. For example:
  - 1: Internship
  - 2: Entry level
  - 3: Associate
  - 4: Mid-Senior level
  - 5: Director
  - 6: Executive

## Job and Work Types
- **jobType**: An array of job type codes to filter jobs by type:
  - "F": Full-time
  - "P": Part-time
  - "C": Contract
  - "O": Other
- **workType**: An array of work type codes to filter jobs by work arrangement:
  - "1": On-site
  - "2": Remote
  - "3": Hybrid

## Uploads
- **uploads**: Object specifying file paths for application documents:
  - **Resume**: Path to your resume file.
  - **Cover Letter**: Path to your cover letter file (optional).

## Output
- **output_filename**: The filename for the Excel workbook where applied jobs are recorded.

---

This configuration allows you to customize your job search and application preferences for the automation script.
