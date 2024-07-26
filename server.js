const net = require('net');
const fs = require('fs').promises;
const path = require('path');
const express = require('express');

const handleRequest = async (socket, data) => {
    const requestHeaders = data.toString().split('\r\n');
    const requestedSubdomain = requestHeaders.filter(line => line.includes('Host: '))[0].split('Host: ')[1].split('.myvhs.com')[0];
    const requestedPath = requestHeaders[0].split(' ')[1]

    // First, call stat to check if hosts.json file exists and can be opened

    const hostsFileData = await fs.readFile('./hosts.json', 'utf8');

    let hosts = JSON.parse(hostsFileData);

    if (!Object.keys(hosts).includes(requestedSubdomain)) {
        socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
        socket.end('404 Not Found');
        return;
    }

    const filePath = path.join(__dirname, 'hosts', requestedSubdomain, requestedPath === '/' ? 'index.html' : requestedPath);

    fs.readFile(filePath, 'utf8').then(fileData => {

        socket.write('HTTP/1.1 200 OK\r\n\r\n');
        socket.end(fileData);

    }).catch(e => {

        socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
        socket.end('404 Not Found');

    })


};

const server = net.createServer((socket) => {
    socket.on('data', (data) => handleRequest(socket, data));
});

const PORT = 8500;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});