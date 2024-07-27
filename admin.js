const net = require('net');
const fs = require('fs').promises;
const path = require('path');
const querystring = require('querystring');

const virtualHostsFile = path.join(__dirname, 'hosts.json');

// Load virtual hosts

const readVirtualHosts = () => {
	return new Promise((resolve, reject) => {
		let virtualHosts = [];

		fs.readFile(virtualHostsFile, 'utf-8')
			.then((data) => {
				try {

					virtualHosts = JSON.parse(data);

					resolve(virtualHosts);

				} catch (e) {

					console.error('Error parsing hosts.json:', e);
					reject(e);

				}
			});
	});
}

// Function to save virtual hosts to file
const saveVirtualHosts = (virtualHosts) => {
	return new Promise((resolve, reject) => {
		fs.writeFile(virtualHostsFile, JSON.stringify(virtualHosts))
			.then((data) => {
				resolve();
			})
			.catch((err) => {
				reject(err)
			});
	})
};

const virtualHostsToHTML = (virtualHosts) => {
	let htmlPayload = '';

	Object.keys(virtualHosts).forEach(vhost => {
		htmlPayload += `
          <li>
            <strong>${vhost}</strong>: ${virtualHosts[vhost]}
            <form action="/delete" method="post" style="display:inline;">
              <input type="hidden" name="subdomain" value="${vhost}">
              <button type="submit">Delete</button>
            </form>
          </li>
        `;
	});

	return htmlPayload;
}

// Function to render the management interface
const renderAdminPage = (virtualHosts) => {
	return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Virtual Host Admin Panel</title>
    </head>
    <body>
      <h1>Virtual Host Admin Panel</h1>
      <form action="/add" method="post">
        <div>
          <label for="subdomain">Subdomain:</label>
          <input type="text" id="subdomain" name="subdomain" required>
        </div>
        <div>
          <label for="content">Contents of the index.html file for new subdomain:</label>
          <textarea id="content" name="content" required></textarea>
        </div>
        <button type="submit">Add Virtual Host</button>
      </form>
    
      <h2>Existing Virtual Hosts</h2>
      <ul>
			${virtualHostsToHTML(virtualHosts)}
      </ul>
    </body>
    </html>
  `;
};

// Create the server
const server = net.createServer((socket) => {
	socket.on('data', async (data) => {
		const request = data.toString();

		const [headers, body] = request.split('\r\n\r\n');

		const [requestLine, ...headerLines] = headers.split('\r\n');

		const [method, url] = requestLine.split(' ');

		let virtualHosts = await readVirtualHosts();

		if (method === 'GET' && url === '/') {
			const response =
				`
HTTP/1.1 200 OK
Content-Type: text/html

${renderAdminPage(virtualHosts)}
`;
			socket.write(response);
			socket.end();
		} else if (method === 'POST' && (url === '/add' || url === '/delete')) {
			let bodyData = body;

			const parsedBody = querystring.parse(bodyData);
			if (url === '/add') {
				const { subdomain, content } = parsedBody;

				const newSubdomainFilePath = path.join(__dirname, 'hosts', subdomain);

				await fs.mkdir(newSubdomainFilePath);

				await fs.writeFile(path.join(newSubdomainFilePath, 'index.html'), content);

				virtualHosts[subdomain] = 'hosts/' + subdomain;

				saveVirtualHosts(virtualHosts);

			} else if (url === '/delete') {

				const { subdomain } = parsedBody;
				
				const subdomainPath = path.join(__dirname, 'hosts', subdomain);
				
				await fs.rm(subdomainPath, { recursive: true, force: true });
				
				delete virtualHosts[subdomain];
				
				saveVirtualHosts(virtualHosts);
			}

			const response = `
HTTP/1.1 303 See Other
Location: /
`;

			socket.write(response);
			socket.end();
		} else {
			const response = `
HTTP/1.1 404 Not Found
Content-Type: text/plain

404 Not Found
`;
			socket.write(response);
			socket.end();
		}
	});
});

server.listen(3000, () => {
	console.log('Server is running on http://localhost:3000');
});
