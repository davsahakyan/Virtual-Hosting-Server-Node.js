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
		<style>

			body {
				font-family: 'Arial', sans-serif;
				background-color: #f4f4f9;
				color: #333;
				margin: 0;
				padding: 0;
			}

			h1 {
				font-size: 2.5em;
				margin-top: 20px;
				color: #2c3e50;
			}

			h2 {
				font-size: 1.8em;
				color: #34495e;
			}

			p {
				font-size: 1em;
				color: #7f8c8d;
			}

			body > h1, body > p {
				text-align: center;
			} 

			.container {
				display: flex;
				flex-direction: column;
				align-items: center;
				max-width: 1200px;
				margin: 0 auto;
				padding: 20px;
				background-color: #fff;
				box-shadow: 0 4px 8px rgba(0,0,0,0.1);
				border-radius: 10px;
			}

			.container > div {
				width: 90%;
				margin: 20px 0;
				padding: 20px;
				background-color: #ecf0f1;
				border-radius: 10px;
				box-shadow: 0 2px 4px rgba(0,0,0,0.1);
			}

			#divider {
				width: 100%;
				height: 2px;
				background-color: #bdc3c7;
				margin: 20px 0;
			}

			form {
				display: flex;
				flex-direction: column;
				row-gap: 12px;
			}

			form textarea, form input[type="text"] {
				width: 100%;
				padding: 10px;
				font-size: 1em;
				border: 1px solid #bdc3c7;
				border-radius: 5px;
				box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);
			}

			form input[type="text"]:focus, form textarea:focus {
				outline: none;
				border-color: #3498db;
			}

			form button {
				padding: 10px 20px;
				font-size: 1em;
				color: #fff;
				background-color: #3498db;
				border: none;
				border-radius: 5px;
				cursor: pointer;
				transition: background-color 0.3s ease;
			}

			form button:hover {
				background-color: #2980b9;
			}

			ul {
				list-style: none;
				padding: 0;
			}

			ul li {
				padding: 10px;
				background-color: #fff;
				border: 1px solid #bdc3c7;
				border-radius: 5px;
				margin: 10px 0;
				box-shadow: 0 1px 3px rgba(0,0,0,0.1);
				display: flex;
				justify-content: space-between;
				align-items: center;
			}

			ul li button {
				padding: 5px 10px;
				font-size: 0.9em;
				color: #fff;
				background-color: #e74c3c;
				border: none;
				border-radius: 5px;
				cursor: pointer;
				transition: background-color 0.3s ease;
			}

			ul li button:hover {
				background-color: #c0392b;
			}
		</style>
    </head>
    <body>
      	<h1>Virtual Host Admin Panel</h1>
		<p>Not the best UI, but not the worst UI</p>
		<div class="container">
			<div id="new-section">
				<h2>Add a new virtual host</h2>
				<form action="/add" method="post">
					<div>
						<label for="subdomain">Subdomain:</label>
						<input type="text" id="subdomain" name="subdomain" required>
					</div>
					<div>
						<label for="content">Contents of the index.html file for new subdomain:</label>
						<br>
						<textarea id="content" name="content" rows="7" columns="40" required></textarea>
					</div>
					<button type="submit">Add Virtual Host</button>
				</form>
			</div>
			<div id="delete-section">
				<h2>Remove an existing virtual host</h2>
				<ul>
						${virtualHostsToHTML(virtualHosts)}
				</ul>
			</div>
		</div>
		<p>Built by Davit Sahakyan, Hrach Davtyan</p>
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

				try {
					await fs.mkdir(newSubdomainFilePath);
				} catch (error) {
					console.log(`Folder already exists, updating files for ${subdomain}`);
				}

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
	console.log('\nAdmin panel is running on port 3000\nVisit it: http://localhost:3000');
});
