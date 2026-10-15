#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const verify = fs.readFileSync(path.join(root, 'verify.sh'), 'utf8');

assert.match(index, /class="weekHomeworkBtn"/, 'the current-week card must expose a homework action');
assert.match(index, /openHomeworkList\(\)/, 'the hub homework action must open the homework list');
assert.match(index, /event\.stopPropagation\(\);\s*openHomeworkList\(\);/, 'homework action must not also open the curriculum picker');
assert.match(index, /id="homeworkList" class="homeworkList"/, 'the homework list modal must exist');
assert.match(index, /id="homeworkListContent"/, 'the modal must have a content region');
assert.match(index, /data-homework-curr="pb"/, 'Pre-Boo homework tab must exist');
assert.match(index, /data-homework-curr="br"/, 'Boo-riculum homework tab must exist');
assert.match(index, /data-homework-curr="bc"/, 'Boo-continuum homework tab must exist');
assert.match(index, /HOMEWORK_SECTIONS = \[[\s\S]*?vocab[\s\S]*?sentences[\s\S]*?questions/, 'the list must cover words, sentences, and questions');
assert.match(index, /content\/\$\{curr\}\/\$\{week\.monthSlug\}\/\$\{section\.key\}\.json/, 'the list must load the selected curriculum and current month');
assert.match(index, /homeworkWeekCards\(data\[section\.key\], week\)/, 'the list must restrict content to the current week');
assert.match(index, /fetch\(url, \{ cache: 'no-cache' \}\)/, 'homework content fetches must revalidate without bypassing the browser cache');
assert.match(index, /id="homeworkCopyBtn"/, 'the list must provide a copy action');
assert.match(index, /navigator\.clipboard\?\.writeText/, 'copy action must use the browser clipboard when available');
assert.match(index, /document\.execCommand\('copy'\)/, 'copy action must have a local fallback');
assert.match(index, /id="homeworkPrintBtn"/, 'the list must provide a print/write action');
assert.match(index, /homeworkPrintBtn\.addEventListener\('click',[\s\S]*?window\.print\(\)/, 'print/write action must open the browser print flow');
assert.match(index, /@media print[\s\S]*?homeworkList\.show \.homeworkListRows \{ grid-template-columns: 1fr; \}/, 'print/write mode must make the list paper-friendly');
assert.match(index, /homeworkListStatus.*role="status"|role="status"[^>]*id="homeworkListStatus"/, 'loading and failure status must be announced');
assert.match(index, /catch \(error\)[\s\S]*?Homework is not ready yet/, 'content failure must be fail-soft for students');
assert.match(verify, /tests\/index-homework-list-audit\.cjs/, 'verify.sh must run the homework-list audit');

console.log('Index weekly homework list audit passed: current-week action, curriculum tabs, week slicing, status handling, and caching are wired.');
