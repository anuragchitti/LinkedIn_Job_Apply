# LinkedIn Job Apply Automation

This project automates job applications on LinkedIn by scraping job listings, drafting resumes according to job descriptions, and storing applied job links in an Excel sheet.

## Features

- Logs into LinkedIn using your credentials.
- Searches for jobs based on positions, locations, experience levels, and filters.
- Automates the Easy Apply process, uploading your DOCX resume.
- Tracks applied jobs in an Excel (.xlsx) file to avoid duplicate applications.
- Modifies your base resume dynamically based on job descriptions (basic keyword highlighting).
- Configurable via `config.json` for easy customization.

## Setup

1. Clone or download this project.
2. Place your base resume template as `resumeTemplate.docx` in the project root.
3. Update `config.json` with your LinkedIn credentials, job search parameters, and file paths.
4. Run `npm install` to install dependencies.

## Usage

Run the script with:

```bash
npm start
```

The script will:

- Log into LinkedIn.
- Search for jobs based on your criteria.
- Modify your resume based on job descriptions.
- Apply to jobs with the Easy Apply button.
- Log applied jobs in `appliedJobs.xlsx` to prevent duplicates.

## Configuration (`config.json`)

- `username`: Your LinkedIn email.
- `password`: Your LinkedIn password.
- `phone_number`: Phone number to fill in applications.
- `positions`: Array of job titles to search.
- `locations`: Array of locations to search.
- `experience_level`: Array of LinkedIn experience level codes (e.g., 1 for Entry, 2 for Associate).
- `blacklist`: Keywords to exclude from job titles or companies.
- `blackListTitles`: Keywords to exclude from job titles.
- `uploads`: Paths to your resume and cover letter files (DOCX format).
- `output_filename`: Excel file to store applied job links.

## Notes

- The resume modification currently adds a simple "Key Skills" section based on job description keywords.
- The script runs Puppeteer in non-headless mode for visibility; you can change this in `index.js`.
- Ensure your LinkedIn account is active and can log in without additional verification steps.
- The salary filter is not implemented due to LinkedIn URL limitations.

## Future Improvements

- Enhance resume modification with better parsing and formatting.
- Add support for other job portals.
- Improve error handling and logging.
- Add headless mode option and CLI arguments.

## License

MIT
