var http = require('http');
var fs = require('fs');
var path = require('path');
var mime = require('mime');

let rootPath=path.join(__dirname, "../../");

function send404(response) {
    response.writeHead(404, { 'Content-Type': 'text/plain' });
    response.write('Error 404: resource not found');
    response.end();
}

function sendFile(response, filePath) {
    fs.readFile(filePath, function(err, data) {
        if (err) {
            send404(response)
        } else {
            response.writeHead(200, { "Content-Type": mime.getType(path.basename(filePath)) });
            response.end(data);
        }
    })
}

var server = http.createServer(function(request, response) {
    var filePath = false;
    if (request.url == '/') {
        filePath = path.join(rootPath,'/src/html/index.html')
    } else if(request.url.split('/')[1].split('?')[0]=='video.html'){
        filePath = path.join(rootPath,'/src/html/video.html');
    }else if(request.url.split('/')[1]=='html'){
        filePath = path.join(rootPath,'/src' + request.url);
    } else {
        filePath =  path.join(rootPath,'/build' + request.url)
    }
    console.log(filePath);
    sendFile(response,filePath)
});

server.listen(80, function() {
    console.log("http://127.0.0.1:80/")
});