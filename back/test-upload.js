const FormData = require('form-data');
const fs = require('fs');
const axios = require('axios');

async function testUpload() {
    try {
        // Create a test file
        const testContent = 'Test deliverable content';
        fs.writeFileSync('/tmp/test-deliverable.txt', testContent);

        // Read token from environment or use a test token
        const token = process.env.TEST_TOKEN || 'YOUR_TOKEN_HERE';

        // Create form data
        const form = new FormData();
        form.append('file', fs.createReadStream('/tmp/test-deliverable.txt'));
        form.append('label', 'Test deliverable');
        form.append('objectiveRef', 'Test objective');

        console.log('Uploading to: http://localhost:3333/api/propositions/209/mandates/8acd9401-6a42-4cf7-a724-e4335ae86a94/deliverables');
        console.log('Token:', token ? 'Present' : 'Missing');

        // Make the request
        const response = await axios.post('http://localhost:3333/api/propositions/209/mandates/8acd9401-6a42-4cf7-a724-e4335ae86a94/deliverables', form, {
            headers: {
                ...form.getHeaders(),
                Authorization: `Bearer ${token}`,
            },
        });

        console.log('Success!');
        console.log('Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
        console.error('Status:', error.response?.status);
    }
}

testUpload();
