const { chromium } = require('playwright');
const path = require('path');

async function testDeliverableUpload() {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        console.log('1. Navigating to login page...');
        await page.goto('http://localhost:5173/login');
        await page.waitForLoadState('networkidle');

        console.log('2. Logging in...');
        // You'll need to provide valid credentials
        await page.fill('input[name="email"]', 'test@example.com'); // Replace with actual email
        await page.fill('input[name="password"]', 'password'); // Replace with actual password
        await page.click('button[type="submit"]');
        await page.waitForLoadState('networkidle');

        console.log('3. Getting auth token...');
        const cookies = await context.cookies();
        const tokenCookie = cookies.find((c) => c.name === 'token');
        console.log('Token found:', !!tokenCookie);

        console.log('4. Navigating to proposition...');
        await page.goto('http://localhost:5173/propositions/209');
        await page.waitForLoadState('networkidle');

        console.log('5. Looking for upload button...');
        // Find and click the deliverable upload button
        const uploadButton = await page.locator('text=/upload|deliverable/i').first();
        if ((await uploadButton.count()) > 0) {
            await uploadButton.click();
            await page.waitForTimeout(500);

            console.log('6. Uploading file...');
            // Create a test file
            const testFilePath = '/tmp/test-deliverable.txt';
            require('fs').writeFileSync(testFilePath, 'Test deliverable content');

            // Upload the file
            const fileInput = await page.locator('input[type="file"]');
            await fileInput.setInputFiles(testFilePath);

            // Fill in other fields if needed
            const labelInput = await page.locator('input[name="label"]');
            if ((await labelInput.count()) > 0) {
                await labelInput.fill('Test deliverable');
            }

            // Submit
            console.log('7. Submitting form...');
            await page.click('button:has-text("Upload")');

            // Wait for response
            console.log('8. Waiting for response...');
            await page.waitForTimeout(5000);

            // Check for errors
            const errorText = await page
                .locator('text=/error|fail/i')
                .first()
                .textContent()
                .catch(() => null);
            if (errorText) {
                console.error('ERROR FOUND:', errorText);
            } else {
                console.log('SUCCESS: No error messages found!');
            }
        } else {
            console.log('Upload button not found - listing all buttons:');
            const buttons = await page.locator('button').all();
            for (const btn of buttons) {
                const text = await btn.textContent();
                console.log('  Button:', text);
            }
        }

        // Capture any console errors from the page
        page.on('console', (msg) => {
            if (msg.type() === 'error') {
                console.log('BROWSER ERROR:', msg.text());
            }
        });

        // Capture network errors
        page.on('response', (response) => {
            if (response.status() >= 400) {
                console.log(`HTTP ${response.status()}: ${response.url()}`);
                response.text().then((body) => {
                    console.log('Response body:', body);
                });
            }
        });
    } catch (error) {
        console.error('Test failed:', error.message);
        console.error(error.stack);
    } finally {
        await browser.close();
    }
}

testDeliverableUpload();
