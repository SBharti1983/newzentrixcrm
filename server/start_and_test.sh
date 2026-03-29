#!/bin/bash
node index.js > server.log 2>&1 &
SERVER_PID=$!
sleep 3
node test_login.js
kill $SERVER_PID
