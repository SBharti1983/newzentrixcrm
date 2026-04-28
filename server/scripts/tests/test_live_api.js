// Direct API test against running server
const http = require('http');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNkZDAzNTY4LTJhMTctNDk1ZS1hMTk0LTUxZmY4OWU0YjAzMiIsInRlbmFudElkIjoiNmYwMjNjMGEtYTUwNS00YWU0LTk2MmEtMDM4YTk0NGQ1MDBlIiwicm9sZSI6ImFkbWluIiwibmFtZSI6IkRlbW8gQWRtaW4iLCJlbWFpbCI6ImRlbW9hZG1pbkB6ZW50cml4LmNvbSIsImF2YXRhciI6IkRBIiwiaWF0IjoxNzc1MjQ4ODk4LCJleHAiOjE3NzUzMzUyOTh9.xz2KbPVJ6PjN-M9tJyYy2ruXL-cGyQITNR3aLwjMzdw';

const options = {
    hostname: 'localhost',
    port: 5050,
    path: '/api/users',
    headers: { 'Authorization': 'Bearer ' + token }
};

http.get(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        const users = JSON.parse(data);
        console.log('Total users:', users.length);
        console.log('\nFirst user keys:', Object.keys(users[0]).join(', '));
        console.log('\nHas reports_to?', users[0].hasOwnProperty('reports_to'));
        console.log('\nAll reports_to:');
        users.forEach(u => {
            console.log('  ' + u.role.padEnd(15) + u.name.padEnd(25) + 'reports_to=' + JSON.stringify(u.reports_to));
        });
    });
});
