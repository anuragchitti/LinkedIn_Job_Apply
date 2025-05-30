const puppeteer = require('puppeteer');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

const config = require('./config.json');
const { modifyResume } = require('./utils/resume');

const APPLIED_JOBS_FILE = path.join(__dirname, config.output_filename || 'appliedJobs.xlsx');
const RESUME_TEMPLATE_PATH = path.join(__dirname, config.uploads.Resume || 'resumeTemplate.docx');


function saveHTMLToFile(htmlContent, filePath) {
    fs.writeFile(filePath, htmlContent, (err) => {
      if (err) {
        console.error("An error occurred while writing the file:", err);
        return;
      }
      console.log("HTML content saved to", filePath);
    });
  }

async function initializeExcel() {
    const workbook = new ExcelJS.Workbook();
    if (fs.existsSync(APPLIED_JOBS_FILE)) {
        await workbook.xlsx.readFile(APPLIED_JOBS_FILE);
    } else {
        const sheet = workbook.addWorksheet('AppliedJobs');
        sheet.columns = [
            { header: 'JobTitle', key: 'jobTitle', width: 30 },
            { header: 'Company', key: 'company', width: 30 },
            { header: 'JobLink', key: 'jobLink', width: 50 },
            { header: 'DateApplied', key: 'dateApplied', width: 20 },
        ];
        await workbook.xlsx.writeFile(APPLIED_JOBS_FILE);
    }
    return workbook;
}

async function isJobAlreadyApplied(workbook, jobLink) {
    const sheet = workbook.getWorksheet('AppliedJobs');
    for (let i = 2; i <= sheet.rowCount; i++) {
        const row = sheet.getRow(i);
        if (row.getCell('JobLink').value === jobLink) {
            return true;
        }
    }
    return false;
}

async function addAppliedJob(workbook, job) {
    const sheet = workbook.getWorksheet('AppliedJobs');
    sheet.addRow({
        jobTitle: job.title,
        company: job.company,
        jobLink: job.link,
        dateApplied: new Date().toISOString().split('T')[0],
    });
    await workbook.xlsx.writeFile(APPLIED_JOBS_FILE);
}

async function retryOperation(operation, retries = 3, delay = 5000) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            console.log(`Attempt ${attempt} starting...`);
            const result = await operation();
            console.log(`Attempt ${attempt} succeeded.`);
            return result;
        } catch (error) {
            console.error(`Attempt ${attempt} failed:`, error);
            if (attempt < retries) {
                console.log(`Retrying in ${delay / 1000} seconds...`);
                await new Promise(res => setTimeout(res, delay));
            } else {
                console.error('Max retries reached. Operation failed.');
                throw error;
            }
        }
    }
}

async function loginLinkedIn(page) {
    await retryOperation(async () => {
        console.log('Attempting LinkedIn login...');
        await page.goto('https://www.linkedin.com/login', { waitUntil: 'networkidle2', timeout: 120000 });
        await page.type('#username', config.username, { delay: 100 });
        await page.type('#password', config.password, { delay: 100 });
        await page.click('button[type="submit"]');

        // Wait for session cookie to be set as indication of successful login
        const maxWaitTime = 60000; // 60 seconds
        const pollInterval = 1000; // 1 second
        let elapsed = 0;
        while (elapsed < maxWaitTime) {
            const cookies = await page.cookies();
            const sessionCookie = cookies.find(cookie => cookie.name === 'li_at' || cookie.name === 'JSESSIONID');
            if (sessionCookie) {
                console.log('Session cookie found, login successful.');
                break;
            }
            console.log('Waiting for session cookie...');
            await new Promise(res => setTimeout(res, pollInterval));
            elapsed += pollInterval;
        }
        if (elapsed >= maxWaitTime) {
            throw new Error('Login session cookie not found within timeout.');
        }

        console.log('Logged into LinkedIn');
    });
}

async function searchJobs(page, position, location) {
    // Build LinkedIn job search URL with filters
    let searchUrl = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(position)}&location=${encodeURIComponent(location)}&f_LF=f_AL`;

    // https://www.linkedin.com/jobs/search/?currentJobId=4206837420&f_AL=true&f_E=3%2C4&f_JT=F%2CP%2CC%2CO&f_VJ=true&f_WT=1%2C3%2C2&geoId=103644278&keywords=react%2C%20react%20native%2C%20node&origin=JOB_SEARCH_PAGE_SEARCH_BUTTON&refresh=true&sortBy=R&spellCorrectionEnabled=true

    // react, react native, node

    // Add experience level filter if provided
    if (config.experience_level && config.experience_level.length > 0) {
        const expLevels = config.experience_level.join(',');
        searchUrl += `&f_E=${expLevels}`;
    }

    // Add job type filter if provided
    if (config.jobType && config.jobType.length > 0) {
        const jobTypes = config.jobType.join('%2C');
        searchUrl += `&f_JT=${jobTypes}`;
    }

    // Add work type filter if provided
    if (config.workType && config.workType.length > 0) {
        const workTypes = config.workType.join('%2C');
        searchUrl += `&f_WT=${workTypes}`;
    }

    // Add salary filter if provided (LinkedIn uses f_SB for salary bands, but exact mapping may vary)
    if (config.salary && config.rate) {
        // Example mapping for salary bands (this is approximate and may need adjustment)
        // $40k+ = 1, $60k+ = 2, $80k+ = 3, $100k+ = 4, $120k+ = 5, $140k+ = 6
        const salaryNum = parseInt(config.salary.replace(/[^0-9]/g, ''), 10);
        let salaryBand = '';
        if (salaryNum >= 140000) salaryBand = '6';
        else if (salaryNum >= 120000) salaryBand = '5';
        else if (salaryNum >= 100000) salaryBand = '4';
        else if (salaryNum >= 80000) salaryBand = '3';
        else if (salaryNum >= 60000) salaryBand = '2';
        else if (salaryNum >= 40000) salaryBand = '1';

        if (salaryBand) {
            searchUrl += `&f_SB=${salaryBand}`;
        }
    }

    // await retryOperation(async () => {
        console.log('Loading job search page...');
        // await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 120000 });
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });
        // try {
            await page.waitForSelector('.scaffold-layout', { timeout: 120000 });
        // } catch (error) {
        //     console.log('error in waiting for selector', error);
        //     throw error;
        // }
    // });

    console.log('job search page loaded');

    // Scroll to load jobs
    await page.evaluate(() => {
        const scrollable = document.querySelector('.scaffold-layout__list-detail-container');
        scrollable.scrollTo(0, scrollable.scrollHeight);
    });

    console.log('job search page evaluated', page);
    const html = await page.content();
    saveHTMLToFile(html, 'job_search_page.html');
    // await page.waitForTimeout(2000);


   const result = await page.waitForFunction(()=>{
        return document.querySelector('.scaffold-layout__list ').children[1].querySelector('ul').className
    }, {timeout: 120000});

    if(!result){
        console.log('Shadow element not found..');
    } else {
        console.log('Shadow element found', result);
    }

    // Wait for the job search results container to be present
    // try {
    //     await page.waitForSelector('.scaffold-layout__list > ul', { timeout: 15000 });
    //     // await page.waitForSelector(document.querySelector('.scaffold-layout__list ').children[1].querySelector('ul').className , { timeout: 15000 });
    // } catch (error) {
    //     console.log('Job search results container not found:', error);
    //     const html = await page.content();
    //     saveHTMLToFile(html, 'job_search_results_not_found.html');
    //     throw error;
    // }

    // Extract job cards
    // let jobs = await page.$$eval('ul.scaffold-layout__list li', (nodes) =>
    //     nodes.map((node) => {
    //         const titleElem = node.querySelector('h3.base-search-card__title');
    //         const companyElem = node.querySelector('h4.base-search-card__subtitle');
    //         const linkElem = node.querySelector('a.base-card__full-link');
    //         return {
    //             title: titleElem ? titleElem.innerText.trim() : '',
    //             company: companyElem ? companyElem.innerText.trim() : '',
    //             link: linkElem ? linkElem.href : '',
    //         };
    //     })
    // );

    // Filter out jobs with blacklisted titles or keywords
    // if (config.blackListTitles && config.blackListTitles.length > 0) {
    //     jobs = jobs.filter(job => {
    //         return !config.blackListTitles.some(blackTitle =>
    //             job.title.toLowerCase().includes(blackTitle.toLowerCase())
    //         );
    //     });
    // }

    // if (config.blacklist && config.blacklist.length > 0) {
    //     jobs = jobs.filter(job => {
    //         return !config.blacklist.some(blackKeyword =>
    //             job.title.toLowerCase().includes(blackKeyword.toLowerCase()) ||
    //             job.company.toLowerCase().includes(blackKeyword.toLowerCase())
    //         );
    //     });
    // }

    return [];
}

async function applyToJob(page, job, resumePath) {
    try {
        await page.goto(job.link, { waitUntil: 'networkidle2', timeout: 120000 });
        // Check if already applied
        const alreadyApplied = await page.$x("//span[contains(text(), 'You’ve already applied')]");
        if (alreadyApplied.length > 0) {
            console.log(`Already applied to job: ${job.title} at ${job.company}`);
            return false;
        }
        // Click Easy Apply button
        const [easyApplyButton] = await page.$x("//button[contains(text(), 'Easy Apply')]");
        if (!easyApplyButton) {
            console.log(`No Easy Apply button for job: ${job.title} at ${job.company}`);
            return false;
        }
        await easyApplyButton.click();
        await page.waitForTimeout(1000);
        // Upload resume
        const fileInput = await page.$('input[type="file"]');
        if (fileInput) {
            await fileInput.uploadFile(resumePath);
            await page.waitForTimeout(1000);
        }
        // Click Submit or Next buttons until application is submitted or no more steps
        let submitClicked = false;
        while (!submitClicked) {
            const submitButton = await page.$('button[aria-label="Submit application"]');
            if (submitButton) {
                await submitButton.click();
                submitClicked = true;
                break;
            }
            const nextButton = await page.$('button[aria-label="Next"]');
            if (nextButton) {
                await nextButton.click();
                await page.waitForTimeout(1000);
            } else {
                break;
            }
        }
        await page.waitForTimeout(2000);
        console.log(`Applied to job: ${job.title} at ${job.company}`);
        return true;
    } catch (error) {
        console.error(`Failed to apply to job: ${job.title} at ${job.company}`, error);
        return false;
    }
}

async function main() {
    let browser;
    let cookies = null;
    let localStorageData = null;
    let sessionStorageData = null;
    console.log('Job application automation started.');
    try {
        browser = await puppeteer.launch({ headless: false, userDataDir: './puppeteer_data' });
        const page = await browser.newPage();
        await loginLinkedIn(page);

        // Save cookies after login
        cookies = await page.cookies();

        // Save localStorage and sessionStorage after login
        localStorageData = await page.evaluate(() => {
            let json = {};
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                json[key] = localStorage.getItem(key);
            }
            return json;
        });
        sessionStorageData = await page.evaluate(() => {
            let json = {};
            for (let i = 0; i < sessionStorage.length; i++) {
                const key = sessionStorage.key(i);
                json[key] = sessionStorage.getItem(key);
            }
            return json;
        });

        const workbook = await initializeExcel();

        for (const position of config.positions) {
            for (const location of config.locations) {
                // Set cookies before each search to maintain session
                if (cookies) {
                    await page.setCookie(...cookies);
                }
                // Restore localStorage and sessionStorage before each search
                if (localStorageData) {
                    await page.evaluate((data) => {
                        for (const key in data) {
                            localStorage.setItem(key, data[key]);
                        }
                    }, localStorageData);
                }
                if (sessionStorageData) {
                    await page.evaluate((data) => {
                        for (const key in data) {
                            sessionStorage.setItem(key, data[key]);
                        }
                    }, sessionStorageData);
                }

                const jobs = await searchJobs(page, position, location);
                console.log(jobs.length);
                for (const job of jobs) {
                    const alreadyApplied = await isJobAlreadyApplied(workbook, job.link);
                    if (alreadyApplied) {
                        console.log(`Already applied to job: ${job.title} at ${job.company}, skipping.`);
                        continue;
                    }
                    console.log(`Not applied to job: ${job.title} at ${job.company}, applying.`);
                    // Modify resume based on job description (currently using job title as placeholder)
                    const modifiedResumePath = await modifyResume(job.title, RESUME_TEMPLATE_PATH, path.join(__dirname, 'modifiedResume.docx'));
                    // const success = await applyToJob(page, job, modifiedResumePath);
                    if (true) {
                        await addAppliedJob(workbook, job);
                    }
                }
            }
        }
        console.log('Job application automation completed.');
    } catch (error) {
        console.error('Error in automation script1:', error);
    } finally {
        if (browser) {
            await browser.close();
            console.log('Browser closed.');
        }
    }
}

main().catch((err) => {
    console.error('Error in automation script:', err);
});
