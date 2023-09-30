'use strict';

let http = require('http');
let path = require('path');
let fs = require('fs');

let mimeTypes = {
    '.js' : 'text/javascript',
    '.html' : 'text/html',
    '.css' : 'text/css',
    '.png' : 'image/png',
    '.jpg' : 'image/jpeg',
    '.ico' : 'image/vnd.microsoft.icon',
    '.wgsl' : 'text/wgsl',
    '.ply' : 'text/plain',
    '.glsl' : 'text/plain',
    '.vert' : 'text/plain',
    '.frag' : 'text/plain',
};
const port = 3000;

function handleRequest(request, response) {
    let lookup = (request.url === '/') ? '/index.html' : decodeURI(request.url);
    let file = lookup.substring(1, lookup.length);

    fs.access(file, fs.constants.R_OK, function(err) {
        if (!err) {
            fs.readFile(file, function(error, data) {
                if (error) {
                    response.writeHead(500);
                    response.end('Server Error!');
                } else {
                    let headers = {'Content-type': mimeTypes[path.extname(lookup) || 'text/plain']};
                    response.writeHead(200, headers);
                    response.end(data);
                }
            });
        } else {
            response.writeHead(404);
            response.end();
        }
    });
}

http.createServer(handleRequest).listen(port, function() {
    console.log(`Server is listening on port ${port}`);
});
