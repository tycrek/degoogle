const fs = require('fs-extra');
const path = require('path');
const fetch = require('node-fetch');
const qs = require('qs');

const REDDIT_USER = process.env.REDDIT_USER || 'username';
const REDDIT_PASS = process.env.REDDIT_PASS || 'password';
const REDDIT_CLIENT_ID = process.env.REDDIT_CLIENT_ID || 'clientid';
const REDDIT_CLIENT_SECRET = process.env.REDDIT_CLIENT_SECRET || 'clientsecret';
const WIKI_SUBREDDIT = 'privacy';
const WIKI_PAGE = 'de-go-git';
const WIKI_REASON = 'Automated edit from [GitHub repo](https://github.com/tycrek/degoogle)';
const CONTENT_TYPE = 'application/x-www-form-urlencoded';

updateWiki()

function updateWiki() {
    let endpoints = {
        revisions: `https://old.reddit.com/r/${WIKI_SUBREDDIT}/wiki/revisions/${WIKI_PAGE}.json`,
        token: 'https://www.reddit.com/api/v1/access_token',
        edit: `https://oauth.reddit.com/r/${WIKI_SUBREDDIT}/api/wiki/edit`
    };
    let basicAuth = `Basic ${Buffer.from(REDDIT_CLIENT_ID + ':' + REDDIT_CLIENT_SECRET).toString('base64')}`;

    let lastId;
    
    fetch(endpoints.revisions)
    .then((response) => response.json())
    .then((json) => json.data.children[0].id)
    .then((mLastId) => {
        lastId = mLastId;
        return fetch(endpoints.token, {
            method: 'POST',
            headers: { 'Authorization': basicAuth, 'Content-Type': CONTENT_TYPE },
            body: qs.stringify({ grant_type: 'password', username: REDDIT_USER, password: REDDIT_PASS })
        });
    })
    .then((response) => response.json())
    .then((json) => {
        return fetch(endpoints.edit, {
            method: 'POST',
            headers: { 'Authorization': `bearer ${json.access_token}`, 'Content-Type': CONTENT_TYPE },
            body: qs.stringify({
                content: fs.readFileSync(path.join(__dirname, 'README.md')).toString(),
                page: WIKI_PAGE,
                reason: WIKI_REASON,
                previous: lastId
            })
        });
    })
    .then((response) => response.json())
    .then((json) => console.log(json))
    .catch((err) => console.error(err));
}