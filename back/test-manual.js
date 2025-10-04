// Simple test script
const http = require('http');
const FormData = require('form-data');
const fs = require('fs');

async function test() {
    // First, let's just test if we can reach the API
    console.log('Testing API connection...');

    const testReq = http.request(
        {
            hostname: 'localhost',
            port: 3333,
            path: '/healthcheck',
            method: 'GET',
        },
        (res) => {
            console.log('Healthcheck status:', res.statusCode);

            if (res.statusCode === 200) {
                console.log('✓ Backend is running');

                // Now we need a token - let's check if we can get one from the database
                const { exec } = require('child_process');
                exec('cd /home/ubuntu/development/laruche/Essaimons_V1/back && node -e "require(\'./build/bin/server.js\')" 2>&1', (error, stdout, stderr) => {
                    console.log('Output:', stdout);
                    if (stderr) console.error('Error:', stderr);
                });
            }
        }
    );

    testReq.on('error', (e) => {
        console.error('✗ Backend not reachable:', e.message);
    });

    testReq.end();
}

test();
