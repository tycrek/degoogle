// Build tool for uploading generated README.md to Reddit Wiki

const qs = require('qs');
const fs = require('fs-extra');
const path = require('path');
const fetch = require('node-fetch');
const { DateTime } = require('luxon');

// REDDIT.: For authentication with Reddit API. Oauth MUST be used. ID and Secret come from a "script" app type.
const REDDIT = {
    USER: process.env.REDDIT_USER || 'username',
    PASS: process.env.REDDIT_PASS || 'password',
    CLIENT_ID: process.env.REDDIT_CLIENT_ID || 'clientid',
    CLIENT_SECRET: process.env.REDDIT_CLIENT_SECRET || 'clientsecret',
};

// Endpoints for each of our fetches to Reddit
const ENDPOINTS = {
    revisions: `https://old.reddit.com/r/privacy/wiki/revisions/de-google.json`,
    token: 'https://www.reddit.com/api/v1/access_token',
    edit: `https://oauth.reddit.com/r/privacy/api/wiki/edit`
};

// Update the wiki
Promise.all([getLastRevision(), getToken()])
    .then(([lastId, token]) => putWiki(lastId, token))
    .catch((err) => (console.error(err), process.exit(1)));

/**
 * Get the last revision ID on the Wiki. Required otherwise editing the wiki fails
 */
function getLastRevision() {
    return new Promise((resolve, reject) =>
        fetch(ENDPOINTS.revisions)
            .then((response) => response.json())
            .then((json) => json.data.children[0].id) // children[0] is the most recent edit
            .then(resolve)
            .catch(reject));
}

/**
 * Gets an Oauth token used to edit the Wiki
 */
function getToken() {
    return new Promise((resolve, reject) =>
        fetch(ENDPOINTS.token, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${Buffer.from(`${REDDIT.CLIENT_ID}:${REDDIT.CLIENT_SECRET}`).toString('base64')}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: qs.stringify({
                grant_type: 'password',
                username: REDDIT.USER,
                password: REDDIT.PASS
            })
        })
            .then((response) => response.json())
            .then(({ access_token }) => resolve(access_token))
            .catch(reject));
}

/**
 * Post the contents from the README into the wiki
 * @param {String} lastId Revision ID for the Wiki
 * @param {String} token Oauth token for authenticating with the Reddit API
 */
function putWiki(lastId, token) {
    return new Promise((resolve, reject) =>
        fetch(ENDPOINTS.edit, {
            method: 'POST',
            headers: {
                'Authorization': `bearer ${token}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: qs.stringify({
                content: fixContent(fs.readFileSync(path.join(process.cwd(), 'README.md')).toString()),
                page: 'de-google',
                reason: 'Automated edit from GitHub repo: https://github.com/tycrek/degoogle',
                previous: lastId
            })
        })
            .then((response) => response.json())
            .then((json) => {
                if (Object.keys(json).length === 0) resolve();
                else throw Error(json);
            })
            .catch(reject));
}

/**
 * Fixes certain images to only show text on the Reddit wiki
 * @param {String} content The content in README.md
 */
function fixContent(content) {
    return content

        // Fix updated timestamp
        .replace(/\!\[Updated\](.*?)square\)/g, `#### Updated: ${DateTime.now().toFormat('MMMM dd, yyyy')}`)

        // Fix published timestamps
        .replace(/\!\[Published\]\(https\:\/\/img\.shields\.io\/badge\//g, '**')
        .replace(/-informational\?style=flat-square\)/g, '**');
}
