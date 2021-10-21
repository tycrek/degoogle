// Build tool for generating README.md

const { EOL } = require('os');
const path = require('path');
const fs = require('fs-extra');
const moment = require('moment');
const YAML = require('yaml');

const BUILD_SECTION = {
    header: () => readFile('md/_header.md').replace('{{DATE}}', moment().format('MMMM Do YYYY').replace(/ /g, '%20')),
    index: () => readFile('md/_index.md'),
    contributing: () => readFile('md/_contributing.md'),
    browserExtensions: () => generateBrowserExtensions(),
    disclaimer: () => readFile('md/_disclaimer.md'),
    webBasedProducts: () => generateCategorySection('Web-based products', readYaml()['web based products']),
    operatingSystems: () => generateCategorySection('Operating systems', readYaml()['operating systems']),
    desktopApps: () => generateCategorySection('Desktop apps', readYaml()['desktop applications']),
    mobileApps: () => generateCategorySection('Mobile apps', readYaml()['mobile applications']),
    hardware: () => generateCategorySection('Hardware', readYaml()['hardware']),
    useful: () => '# Useful links, tools, and advice',
    resources: () => readFile('md/_resources.md'),
    books: () => generatePublications('Books', 'books'),
    blogs: () => generatePublications('Blog posts', 'blogs'),
    news: () => generatePublications('News articles', 'news'),
    lighterSide: () => readFile('md/_lighterSide.md'),
    closingRemarks: () => readFile('md/_closingRemarks.md')
};

// Button that brings the user to the top of the page
const BACK_TO_TOP = '[![Back to top](https://img.shields.io/badge/Back%20to%20top-lightgrey?style=flat-square)](#index)';

/**
 * Synchronously reads a file using fs-extra and path.join()
 * @param {String} filename The file to read
 */
function readFile(filename) {
    return fs.readFileSync(path.join(__dirname, filename)).toString();
}

/**
 * Reads degoogle.yml
 */
function readYaml() {
    return YAML.parse(fs.readFileSync(path.join(__dirname, 'yaml/degoogle.yml')).toString());
}

/**
 * Generates a major section or "category" such as Mobile Apps
 * @param {String} header Title for section
 * @param {Object} data Object of data to populate README.md with
 */
function generateCategorySection(header, data) {
    if (!data) return '';
    return `## ${header}${EOL}${BACK_TO_TOP}${EOL}${EOL}`.concat(Object.values(data).map((value) => `${generateServiceSection(value)}${EOL}${EOL}`).join(''))
}

/**
 * Generates a service (such as Gmail) section to be placed under a category section
 * @param {Array} data
 */
function generateServiceSection(data) {
    // Start the section with an <h4> header
    let serviceSection = `#### ${data[0].title + EOL + EOL}`;

    // Prep section notes
    let notes = EOL + '';

    // If there is data to be displayed, add the start of a Markdown table
    const tableHeader = (data.filter((d) => 'name' in d).length === 0)
        ? `No known alternatives.${EOL}`
        : `| Name | Eyes | Description |${EOL}| ---- | ---- | ----------- |${EOL}`;

    // Add the header to the section body
    serviceSection = serviceSection.concat(tableHeader);

    // Iterate over each alternative service and add it to the table
    data.forEach((item) => {

        // If the object has length one, it's either title or note
        if (Object.keys(item).length == 1) {
            if (!item.notes) return;
            else item.notes.forEach((note) => notes = notes.concat(`- *${note.trim()}*${EOL}`));
        } else {

            // Build the cells for the table
            let name = `[${item.name}](${item.url})`;
            let eyes = item.eyes ? `**${item.eyes}-eyes**` : '';
            let text = item.text.trim();

            // Append the F-Droid badge to the name
            if (item.fdroid) name = name.concat('<br/>', fdroidLink(item.fdroid));

            // Append the Repo badge to the name
            if (item.repo) name = name.concat('<br/>', repoLink(item.repo));

            // Append the Star badge to the name
            if (item.repo) name = name.concat('<br/>', starBadge(item.repo));

            // Build the row
            const tableItem = `| ${name} | ${eyes} | ${text} |${EOL}`;

            // Add the row to the table
            serviceSection = serviceSection.concat(tableItem);
        }
    });
    return `${serviceSection}${notes}`;
}

/**
 * Returns a badge acting as a link to an F-Droid page for an app.
 * @param {String} appId The package identifier on F-Droid
 */
function fdroidLink(appId) {
    return `[![F-Droid](https://img.shields.io/f-droid/v/${appId}?style=flat-square&logo=f-droid)](https://f-droid.org/en/packages/${appId}/)`;
}

/**
 * Returns a badge acting as a link to a source repository for an app.
 * @param {String} repo The repository url
 */
function repoLink(repo) {
    const repoURL = new URL(repo);
    let repoHost = path.basename(repoURL.hostname, path.extname(repoURL.hostname));
    if (repoHost.includes(".")) repoHost = path.extname(repoHost).replace(".", "");
    return `[![Repo](https://img.shields.io/badge/open-source-3DA639?style=flat-square&logo=${repoHost})](${repo})`;
}

/**
 * Returns a badge displaying the number of GitHub Stars for a repository.
 * @param {String} repo The repository url
 */
function starBadge(repo) {
    if (repo.startsWith('https://github.com/')) {
        const [user, repoName] = repo.split('github.com/')[1].split('/');
        if (!repoName || repoName === '') return '';
        return `![GitHub Repo stars](https://img.shields.io/github/stars/${user}/${repoName}?logo=github&style=flat-square)`;
    } else return '';
}

/**
 * Returns a badge displaying user for a Firefox addon/extension
 * @param {String} link URL to extension WITHOUT trailing slash
 */
function addonLink(link) {
    return (link.includes('addons.mozilla.org')) ? `![Mozilla Add-on](https://img.shields.io/amo/users/${link.split('/').pop()}?style=flat-square)` : '';
}

/**
 * Returns a badge with the date of publication
 * @param {String|Number} date Date of publication
 */
function dateBadge(date) {
    return `![Published](https://img.shields.io/badge/${date.toString().replace(/\-/g, '--')}-informational?style=flat-square)`;
}

/**
 * Generates a table with browser extensions and their descriptions
 */
function generateBrowserExtensions() {
    return `# Browser extensions${EOL + EOL}| Name | Description |${EOL}| ---- | ----------- |${EOL}`
        .concat(YAML.parse(fs.readFileSync(path.join(__dirname, 'yaml/browserExtensions.yml')).toString())
            .map(({ name, text, url }) => `| [${name}](${url}) ${addonLink(url)} | ${text.trim()} |${EOL}`).join(''));
}

/**
 * Generates sections for Books, Blogs, and News
 * @param {String} pubTitle 
 * @param {String} filename 
 */
function generatePublications(pubTitle, filename) {
    return `## ${pubTitle} ${EOL + BACK_TO_TOP + EOL + EOL}| Title | Published | Author |${EOL}| ----- | --------- | ------ |${EOL}`
        .concat(YAML.parse(fs.readFileSync(path.join(__dirname, `yaml/${filename}.yml`)).toString())
            .map(({ title, url, date, author }) => `| [${title}](${url}) | ${dateBadge(date)} | ${author.trim()} |${EOL}`).join(''));
}

// ! Generate README.md
fs.writeFileSync(path.join(__dirname, 'README.md'), Object.values(BUILD_SECTION).map((section) => section()).join(`${EOL}${EOL}`));
console.log('Done!');
