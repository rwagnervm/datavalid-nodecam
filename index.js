"use strict";
const NodeWebcam = require("node-webcam");
const http = require("http");
const ws = require("ws");
const request = require('request');
const fs = require("fs");

const wsSelf = new ws.Server({ port: 9091 });
wsSelf.broadcast = data => wsSelf.clients.forEach(client => client.send(data));

function initHTTP() {
    const server = http.createServer();
    server.on("request", function (request, response) {
        if (request.method.toUpperCase() == "GET" && request.url === "/") {
            response.write(fs.readFileSync(__dirname + "/www/index.html"));
            response.end();
        } else if (request.method.toUpperCase() === "POST" && request.url === "/validate") {
            request.setEncoding('utf8');
            const chunks = [];
            request.on('data', data => chunks.push(data))
            request.on('end', async () => {
                const body = JSON.parse(chunks.join(''))
                try {
                    const responseDatavalid = await requestDatavalid(body.cpf);
                    response.write(JSON.stringify(responseDatavalid))
                } catch (e) {
                    response.statusCode = e.statusCode
                    response.write(e.body)
                }
                response.end();
            })
        }
    });
    server.listen(9090);
    console.log("Acesse http://localhost:9090");
}

function initWebcam() {
    const webcam = NodeWebcam.create({
        callbackReturn: "base64",
        saveShots: false
    });
    
    webcam.capture("picture", function (err, data) {
        if (err) {
            throw err;
        }
        wsSelf.broadcast(data);
        setTimeout(initWebcam, 25);
    });
}

function requestDatavalid(cpf) {
    return new Promise((resolve, reject) => {
        const requestParam = {
            method: 'POST',
            url: 'https://gateway.apiserpro.serpro.gov.br/datavalid-demonstracao/v4/pf-facial',
            headers: {
                'content-type': 'application/json',
                'Authorization': 'Bearer 06aef429-a981-3ec5-a1f8-71d38d86481e'
            },
            body: JSON.stringify({
                "cpf": cpf,
                "validacao": {
                    "biometria_facial": {
                        "vivacidade": false,
                        "formato": "JPG",
                        "base64": new Buffer.from(fs.readFileSync("picture.jpg")).toString("base64")
                    }
                }
            })
        }

        request(requestParam, async (error, response, body) => {
            if (error)
                reject(error);
            else {
                if (response.statusCode != 200) {
                    reject(response);
                }
                resolve(JSON.parse(body));
            }
        });
    });
}

//init
(async () => {
    initHTTP();
    initWebcam();
})()



