const apiUrl = 'https://e0rnisetl9.execute-api.ap-south-1.amazonaws.com';

async function run() {
    try {
        console.log('Testing GET /state...');
        const stateRes = await fetch(`${apiUrl}/state`);
        console.log('Status:', stateRes.status);
        console.log('Body:', await stateRes.text());
        
        console.log('\nTesting POST /supply...');
        const supplyRes = await fetch(`${apiUrl}/supply`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                eventId: 'test-event-1',
                items: [
                    { name: 'Water', quantity: 100 },
                    { name: 'Food', quantity: 50 }
                ]
            })
        });
        console.log('Status:', supplyRes.status);
        console.log('Body:', await supplyRes.text());
    } catch (err) {
        console.error(err);
    }
}
run();
