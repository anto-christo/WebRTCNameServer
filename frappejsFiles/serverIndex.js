const backends = {};
backends.sqlite = require('frappejs/backends/sqlite');
//backends.mysql = require('frappejs/backends/mysql');

const express = require('express');
const cors = require('cors');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const frappe = require('frappejs');
const restAPI = require('./restAPI');
const frappeModels = require('frappejs/models');
const common = require('frappejs/common');
const bodyParser = require('body-parser');
const fs = require('fs');
const { setupExpressRoute: setRouteForPDF } = require('frappejs/server/pdf');
const auth = require('./../auth/auth')();
const morgan = require('morgan')

require.extensions['.html'] = function (module, filename) {
    module.exports = fs.readFileSync(filename, 'utf8');
};

function generateKey() { // Public Domain/MIT
    var d = new Date().getTime();
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
        d += performance.now(); //use high-precision timer if available
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = (d + Math.random() * 16) % 16 | 0;
        d = Math.floor(d / 16);
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

module.exports = {
    async start({backend, connectionParams, models, staticPath = './', authConfig=null}) {
        await this.init();

        if (models) {
            frappe.registerModels(models, 'server');
        }

        // database
        await this.initDb({backend:backend, connectionParams:connectionParams});

        // app
        app.use(bodyParser.json());
        app.use(bodyParser.urlencoded({ extended: true }));
        app.use(express.static(staticPath));
        app.use(morgan('tiny'));

        if (connectionParams.enableCORS) {
            app.use(cors());
        }

        if (authConfig) {
            this.setupAuthentication(app, authConfig);
        }

        // socketio
        io.on('connection', function (socket) {
            frappe.db.bindSocketServer(socket);
            console.log('connected');
            socket.on('startServer', function (event) {
                console.log("Start server called");
                frappe.getDoc('ServerInfo', event.name).then(serverInfo => {
                        if (serverInfo.name == event.name && serverInfo.serverKey == event.key) {
                            serverInfo.socketID = event.socketID;
                            serverInfo.update().then(doc => {
                                io.to(event.socketID).emit('serverResponse', {
                                    res: 'started'
                                });
                            });
                        } else if (event.key == undefined) {
                            io.to(event.socketID).emit('serverResponse', {
                                res: 'exists'
                            });
                        }
                    })
                    .catch(error => {
                        console.log(error);
                        var key = generateKey();
                        var newServerInfo = frappe.newDoc({
                            doctype: 'ServerInfo',
                            name: event.name,
                            socketID: event.socketID,
                            serverKey: key
                        });
                        newServerInfo.insert().then(doc => {
                            io.to(event.socketID).emit('serverResponse', {
                                res: 'new',
                                name: event.name,
                                key: key
                            });
                        });
                    });
            });

            socket.on('stopServer', function (event) {
                console.log("Stop server called");
                frappe.getDoc('ServerInfo', event.name).then(serverInfo => {
                        serverInfo.socketID = null;
                        serverInfo.update().then(doc => {
                            io.to(event.socketID).emit('serverResponse', {
                                res: 'stopped'
                            });
                        });
                    })
                    .catch(error => {
                        console.log("error");
                        io.to(event.socketID).emit('serverResponse', {
                            res: 'incorrect'
                        });
                    });
            });

            socket.emit('giveID', socket.id);

            socket.on('create', function (name) {
                frappe.getDoc('ServerInfo', name).then(serverInfo => {
                        if (serverInfo.socketID == null) {
                            io.to(socket.id).emit('created', 'fail');
                        } else {
                            io.to(serverInfo.socketID).emit('created', socket.id);
                        }
                    })
                    .catch(error => {
                        io.to(socket.id).emit('created', 'fail');
                    });
            });

            socket.on('join', function (creatorID) {
                io.to(creatorID).emit('joined', socket.id);
            });

            socket.on('ready', function (masterID) {
                io.to(masterID).emit('createOffer', socket.id);
            });

            socket.on('offer', function (event) {
                io.to(event.creatorID).emit('sendOffer', {
                    offer: event.offer,
                    id: socket.id
                });
            });

            socket.on('answer', function (event) {
                io.to(event.masterID).emit('sendAnswer', {
                    answer: event.answer,
                    id: socket.id
                });
            });

            socket.on('candidate', function (event) {
                io.to(event.socketID).emit('candidate', {
                    event,
                    id: socket.id
                });
            });
        });
        // routes
        restAPI.setup(app);

        frappe.config.port = connectionParams.port || 8080;

        // listen
        server.listen(frappe.config.port, () => {
            console.log(`FrappeJS WebRTC name server running on http://localhost:${frappe.config.port}`)
        });

        frappe.app = app;
        frappe.server = server;

        setRouteForPDF();
    },

    async init() {
        frappe.isServer = true;
        await frappe.init();
        frappe.registerModels(frappeModels, 'server');
        frappe.registerLibs(common);

        await frappe.login('Administrator');
    },

    async initDb({backend, connectionParams}) {
        frappe.db = await new backends[backend](connectionParams);
        await frappe.db.connect();
        await frappe.db.migrate();
    },

    setupAuthentication(app, authConfig) {
        app.post("/api/signup", auth.signup);
        app.post("/api/login", auth.login);
        app.use(auth.initialize(authConfig));
        app.all("/api/resource/*", auth.authenticate());
    }
}