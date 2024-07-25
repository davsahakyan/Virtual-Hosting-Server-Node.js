const net = require('net');
const fs = require('fs');
const path = require('path');
const express = require('express');


const handleRequest = (socket, data) => {
    const request = data.toString();
    console.log(data.toString())
    const [headers] = request.split('\r\n');
    const [method, url, protocol] = headers.split(' ');
};

const server = net.createServer((socket) => {
    socket.on('data', (data) => handleRequest(socket, data));
});

const PORT = 80;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});