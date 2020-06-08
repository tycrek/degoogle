const fs = require('fs-extra'); // Reading README.md
const path = require('path'); // Get the correct path for README.md
const fetch = require('node-fetch'); // Make calls to Reddit from Node.js
const qs = require('qs'); // Properly build a query for node-fetch POST
const moment = require('moment'); // Time-related functions

// REDDIT_: For authentication with Reddit API. Oauth MUST be used. ID and Secret come from a "script" app type.
const REDDIT_USER = process.env.REDDIT_USER || 'username';
const REDDIT_PASS = process.env.REDDIT_PASS || 'password';
const REDDIT_CLIENT_ID = process.env.REDDIT_CLIENT_ID || 'clientid';
const REDDIT_CLIENT_SECRET = process.env.REDDIT_CLIENT_SECRET || 'clientsecret';

// WIKI_: For the Reddit Wiki
const WIKI_SUBREDDIT = 'privacy';
const WIKI_PAGE = 'de-google';
const WIKI_REASON = 'Automated edit from GitHub repo: https://github.com/tycrek/degoogle';

// Helps POST data be submitted properly
const CONTENT_TYPE = 'application/x-www-form-urlencoded';

updateWiki();

/**
 * Update the Reddit wiki
 */
function updateWiki() {
    // Endpoints for each of our fetches to Reddit
    let endpoints = {
        revisions: `https://old.reddit.com/r/${WIKI_SUBREDDIT}/wiki/revisions/${WIKI_PAGE}.json`,
        token: 'https://www.reddit.com/api/v1/access_token',
        edit: `https://oauth.reddit.com/r/${WIKI_SUBREDDIT}/api/wiki/edit`
    };

    // Initial basic authorization for getting the Oauth token
    let basicAuth = `Basic ${Buffer.from(REDDIT_CLIENT_ID + ':' + REDDIT_CLIENT_SECRET).toString('base64')}`;

    let lastId, token;

    getLastRevision(endpoints.revisions)
        .then((mLastId) => lastId = mLastId)
        .then(() => getToken(endpoints.token, basicAuth))
        .then((mToken) => token = mToken)
        .then(() => putWiki(endpoints.edit, lastId, token))
        .catch((err) => (console.error(err), process.exit(1)));
}

/**
 * Get the last revision ID on the Wiki. Required otherwise editing the wiki fails
 * @param {String} endpoint Endpoint of where to get the ID's
 */
function getLastRevision(endpoint) {
    return new Promise((resolve, reject) => {
        fetch(endpoint)
            .then((response) => response.json())
            .then((json) => json.data.children[0].id) // children[0] is the most recent edit
            .then((lastId) => resolve(lastId))
            .catch((err) => reject(err));
    });
}

/**
 * Gets an Oauth token used to edit the Wiki
 * @param {String} endpoint Endpoint of where to get the token
 * @param {String} auth Initial authorization data to get the better Oauth data
 */
function getToken(endpoint, auth) {
    return new Promise((resolve, reject) => {
        fetch(endpoint, {
            method: 'POST',
            headers: { 'Authorization': auth, 'Content-Type': CONTENT_TYPE },
            body: qs.stringify({ grant_type: 'password', username: REDDIT_USER, password: REDDIT_PASS })
        })
            .then((response) => response.json())
            .then((json) => json.access_token)
            .then((token) => resolve(token))
            .catch((err) => reject(err));
    });
}

/**
 * Post the contents from the README into the wiki
 * @param {String} endpoint Endpoint for editing the wiki
 * @param {String} lastId Revision ID for the Wiki
 * @param {String} token Oauth token for authenticating with the Reddit API
 */
function putWiki(endpoint, lastId, token) {
    return new Promise((resolve, reject) => {
        fetch(endpoint, {
            method: 'POST',
            headers: { 'Authorization': `bearer ${token}`, 'Content-Type': CONTENT_TYPE },
            body: qs.stringify({
                content: fixContent(fs.readFileSync(path.join(__dirname, 'README.md')).toString()),
                page: WIKI_PAGE,
                reason: WIKI_REASON,
                previous: lastId
            })
        })
            .then((response) => response.json())
            .then((json) => {
                if (Object.keys(json).length == 0) resolve();
                else throw Error(json);
            })
            .catch((err) => reject(err));
    });
}

/**
 * Fixes certain images to only show text on the Reddit wiki
 * @param {String} content The content in README.md
 */
function fixContent(content) {
    // Fix updated timestamp
    content = content.replace(/\!\[Updated\](.*?)square\)/g, `#### Updated: ${moment().format('MMMM Do YYYY')}`);

    // Fix published timestamps
    content = content.replace(/\!\[Published\]\(https\:\/\/img\.shields\.io\/badge\//g, '**');
    content = content.replace(/-informational\?style=flat-square\)/g, '**');

    return content;
}