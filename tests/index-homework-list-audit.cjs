#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const verify = fs.readFileSync(path.join(root, 'verify.sh'), 'utf8');

assert.match(index, /id="hubHomeworkBtn" class="hubHomeworkBtn"/, 'the hub must expose a separate homework action');
assert.match(index, /hubHomeworkBtn\.addEventListener\('click',[\s\S]*?openHomeworkList\(\)/, 'the hub homework action must open the homework list');
assert.doesNotMatch(index, /class="weekHomeworkBtn"/, 'the homework action must not sit inside the current-week tile');
assert.match(index, /\.hubGreetingRow[\s\S]*?grid-template-columns: minmax\(0,1fr\) auto minmax\(0,1fr\)/, 'the greeting row must keep the welcome line centered');
assert.match(index, /\.hubHomeworkBtn[\s\S]*?color: #100b00[\s\S]*?linear-gradient\(180deg, #fff2a0/, 'the hub homework action must be a glowing gold button with dark text');
assert.match(index, /id="homeworkList" class="homeworkList"/, 'the homework list modal must exist');
assert.match(index, /role="dialog" aria-modal="true" aria-labelledby="homeworkListTitle" aria-describedby="homeworkListIntro"/, 'the homework list dialog must expose its title and instructions');
assert.match(index, /id="homeworkListContent"/, 'the modal must have a content region');
assert.match(index, /role="tabpanel" aria-labelledby="homeworkTab-pb" tabindex="0"/, 'homework content must expose a labelled tab panel');
assert.match(index, /data-homework-curr="pb"/, 'Pre-Boo homework tab must exist');
assert.match(index, /data-homework-curr="br"/, 'Boo-riculum homework tab must exist');
assert.match(index, /data-homework-curr="bc"/, 'Boo-continuum homework tab must exist');
assert.match(index, /HOMEWORK_SECTIONS = \[[\s\S]*?vocab[\s\S]*?sentences[\s\S]*?questions/, 'the list must cover words, sentences, and questions');
assert.match(index, /content\/\$\{curr\}\/\$\{week\.monthSlug\}\/\$\{section\.key\}\.json/, 'the list must load the selected curriculum and current month');
assert.match(index, /homeworkWeekCards\(data\[section\.key\], week\)/, 'the list must restrict content to the current week');
assert.match(index, /return cards\.map\(\(card, index\) => \(\{ \.\.\.card, n: index \+ 1 \}\)\)/, 'each weekly list must use local 1-15 numbering');
assert.match(index, /fetch\(url, \{ cache: 'no-cache' \}\)/, 'homework content fetches must revalidate without bypassing the browser cache');
assert.match(index, /id="homeworkCopyBtn"/, 'the list must provide a copy action');
assert.match(index, /navigator\.clipboard\?\.writeText/, 'copy action must use the browser clipboard when available');
assert.match(index, /document\.execCommand\('copy'\)/, 'copy action must have a local fallback');
assert.match(index, /id="homeworkPrintBtn"/, 'the list must provide a print/write action');
assert.match(index, /homeworkPrintBtn\.addEventListener\('click',[\s\S]*?window\.print\(\)/, 'print/write action must open the browser print flow');
assert.match(index, /@media print[\s\S]*?homeworkList\.show \.homeworkListRows \{ grid-template-columns: 1fr; \}/, 'print/write mode must make the list paper-friendly');
assert.match(index, /@media print[\s\S]*?html,[\s\S]*?body[\s\S]*?overflow: visible !important/, 'print mode must restore document flow');
assert.match(index, /@media print[\s\S]*?#app[\s\S]*?position: static !important[\s\S]*?overflow: visible !important/, 'print mode must release the fixed app shell');
assert.match(index, /homeworkList\.show \.homeworkListSection[\s\S]*?page-break-inside: avoid/, 'print mode must keep homework sections together where possible');
assert.match(index, /homeworkListClose\.focus\(\{ preventScroll: true \}\)/, 'opening the dialog must move focus to its close control');
assert.match(index, /homeworkReturnFocus\?\.isConnected[\s\S]*?\.focus\(\{ preventScroll: true \}\)/, 'closing the dialog must restore focus to its opener');
assert.match(index, /event\.key !== 'Escape'[\s\S]*?closeHomeworkList\(\)[\s\S]*?closePicker\(\)/, 'Escape must close the active homework or curriculum dialog');
assert.match(index, /\.homeworkTrackTab:focus-visible[\s\S]*?outline: 3px solid/, 'homework controls must expose visible focus rings');
assert.match(index, /\.homeworkTrackTab \{[\s\S]*?min-height: 44px/, 'curriculum tabs must retain a mobile-sized touch target');
assert.match(index, /\.homeworkActionBtn \{[\s\S]*?min-height: 44px/, 'copy and print actions must retain mobile-sized touch targets');
assert.match(index, /homeworkListStatus.*role="status"|role="status"[^>]*id="homeworkListStatus"/, 'loading and failure status must be announced');
assert.match(index, /catch \(error\)[\s\S]*?Homework is not ready yet/, 'content failure must be fail-soft for students');
assert.match(verify, /tests\/index-homework-list-audit\.cjs/, 'verify.sh must run the homework-list audit');

console.log('Index weekly homework list audit passed: current-week action, curriculum tabs, week slicing, status handling, and caching are wired.');
