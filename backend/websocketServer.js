const WebSocket = require('ws');

function setupWebSocket(server) {
    const wss = new WebSocket.Server({ server });

    wss.on('connection', (ws) => {
        console.log('New WebSocket connection');

        ws.on('message', (message) => {
            console.log('Received:', message);
        });

        ws.on('close', () => {
            console.log('Client disconnected');
        });
    });

    wss.on('error', (error) => {
        console.error('WebSocket error:', error);
    });

    return wss;
}

module.exports = setupWebSocket;