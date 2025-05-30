const fs = require('fs');
const path = require('path');
const { Document, Packer, Paragraph, TextRun } = require('docx');

/**
 * Modify the base resume template by adding key skills or summary extracted from job description.
 * @param {string} jobDescription - The job description text.
 * @param {string} baseResumePath - Path to the base resume .docx file.
 * @param {string} outputPath - Path to save the modified resume.
 * @returns {Promise<string>} - Path to the modified resume file.
 */
async function modifyResume(jobDescription, baseResumePath, outputPath) {
    // Extract key skills from job description (simple keyword extraction)
    const skills = extractSkills(jobDescription);

    // Load base resume document
    const baseBuffer = fs.readFileSync(baseResumePath);
    const doc = await Document.load(baseBuffer);

    // Create a new paragraph with skills summary
    const skillsParagraph = new Paragraph({
        children: [
            new TextRun({
                text: "Key Skills: " + skills.join(", "),
                bold: true,
                size: 24,
            }),
        ],
    });

    // Add the skills paragraph at the end of the document
    doc.addSection({
        children: [skillsParagraph],
    });

    // Save the modified document
    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(outputPath, buffer);

    return outputPath;
}

/**
 * Simple skill extraction from job description.
 * @param {string} text
 * @returns {string[]} Array of extracted skills.
 */
function extractSkills(text) {
    // For demo, extract words that look like skills (e.g., capitalized words or known skills)
    const knownSkills = ["JavaScript", "Python", "React", "Node.js", "AWS", "Docker", "Kubernetes", "SQL", "TypeScript"];
    const skillsFound = [];

    knownSkills.forEach(skill => {
        const regex = new RegExp(`\\b${skill}\\b`, "i");
        if (regex.test(text)) {
            skillsFound.push(skill);
        }
    });

    return skillsFound.length > 0 ? skillsFound : ["N/A"];
}

module.exports = {
    modifyResume,
};
