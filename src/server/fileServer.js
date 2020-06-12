var http = require('http');
var fs = require('fs');
var path = require('path');
var mime = require('mime');
var cache = {};

let rootPath=path.join(__dirname, "../../");

function send404(response) {
    response.writeHead(404, { 'Content-Type': 'text/plain' });
    response.write('Error 404: resource not found');
    response.end();
}

function sendFile(response, filePath, fileContents) {
    response.writeHead(200, { "Content-Type": mime.getType(path.basename(filePath)) });
    response.end(fileContents);
}

function serveStatic(response, cache, absPath) {
    if (cache[absPath]) {
        sendFile(response, absPath, cache[absPath])
    } else {
        fs.exists(absPath, function(exists) {
            if (exists) {
                fs.readFile(absPath, function(err, data) {
                    if (err) {
                        send404(response)
                    } else {
                        cache[absPath] = data;
                        sendFile(response, absPath, data)
                    }
                })
            } else {
                send404(response)
            }
        })
    }
}

var server = http.createServer(function(request, response) {
    var filePath = false;
    if (request.url == '/index.html') {
        filePath = path.join(rootPath,'/src/html/index.html')
    } else if(request.url == '/js/jszip.min.js'||request.url == '/js/jszip-utils.min.js'){
        filePath = path.join(rootPath,'/lib' + request.url)
    } else if(request.url == '/decode.js'){
        filePath = path.join(rootPath,'/src/html/decode.js')
    } else {
        filePath =  path.join(rootPath,'/build' + request.url)
    }
    console.log(filePath);
    var absPath = filePath;
    serveStatic(response, cache, absPath)
});

server.listen(3000, function() {
    console.log("http://127.0.0.1:3000/index.html")
});