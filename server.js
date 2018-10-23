const server = require('frappejs/server');
const frappe = require('frappejs');
server.start({
    backend: 'sqlite',
    connectionParams: {
        port: 8002,
        dbPath: 'test.db',
    },
    staticPath: './dist',
    models: require('./models'),
}).then(() => {
    function generateKey() {
        var d = new Date().getTime();
        if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
            d += performance.now();
        }
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = (d + Math.random() * 16) % 16 | 0;
            d = Math.floor(d / 16);
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
    }

    frappe.io.on('connection', function(socket) {
        console.log('connected');
        socket.on('startServer', function (event) {
            console.log("Start server called", event.name);
            frappe.getDoc('ServerInfo', event.name).then(serverInfo => {
                console.log(serverInfo);
                if (serverInfo.name == event.name && serverInfo.serverKey == event.key) {
                    serverInfo.socketID = event.socketID;
                    serverInfo.update().then(doc => {
                        console.log('started');
                        frappe.io.to(event.socketID).emit('serverResponse', {
                            res: 'started'
                        });
                    });
                } else if (!event.key) {
                    console.log('exists', event.socketID);
                    frappe.io.to(event.socketID).emit('serverResponse', {
                        res: 'exists'
                    });
                } else {
                    console.log('incorrect');
                    frappe.io.to(event.socketID).emit('serverResponse', {
                        res: 'incorrect'
                    });
                }
            })
            .catch(error => {
                console.log(error);
                console.log(event.key);
                if(event.key) {
                    frappe.io.to(event.socketID).emit('serverResponse', {
                        res: 'incorrect'
                    });
                }
                else {
                    var key = generateKey();
                    var newServerInfo = frappe.newDoc({
                        doctype: 'ServerInfo',
                        name: event.name,
                        socketID: event.socketID,
                        serverKey: key
                    });
                    newServerInfo.insert().then(doc => {
                        frappe.io.to(event.socketID).emit('serverResponse', {
                            res: 'registered',
                            name: event.name,
                            key: key
                        });
                    });
                }
            });
        });
    
        socket.on('stopServer', function (event) {
            console.log(event);
            frappe.getDoc('ServerInfo', event.name).then(serverInfo => {
                if (event.key == serverInfo.serverKey) {
                    console.log('equal');
                    serverInfo.socketID = null;
                    serverInfo.update().then(doc => {
                        frappe.io.to(event.socketID).emit('serverResponse', {
                            res: 'stopped'
                        });
                    });
                } else {
                    frappe.io.to(event.socketID).emit('serverResponse', {
                        res: 'incorrect'
                    });
                }
            })
            .catch(error => {
                console.log("error");
                frappe.io.to(event.socketID).emit('serverResponse', {
                    res: 'incorrect'
                });
            });
        });
    
        socket.on('create', function (name) {
            console.log('create request', name);
            frappe.getDoc('ServerInfo', name).then(serverInfo => {
                if (serverInfo.socketID == null) {
                    frappe.io.to(socket.id).emit('created', 'fail');
                } else {
                    frappe.io.to(serverInfo.socketID).emit('created', socket.id);
                }
            })
            .catch(error => {
                frappe.io.to(socket.id).emit('created', 'fail');
            });
        });
    
        socket.on('join', function (creatorID) {
            console.log('join');
            frappe.io.to(creatorID).emit('joined', socket.id);
        });
    
        socket.on('ready', function (masterID) {
            console.log('ready');
            frappe.io.to(masterID).emit('createOffer', socket.id);
        });
    
        socket.on('offer', function (event) {
            console.log('offer');
            frappe.io.to(event.creatorID).emit('sendOffer', {
                offer: event.offer,
                id: socket.id
            });
        });
    
        socket.on('answer', function (event) {
            console.log('answer');
            frappe.io.to(event.masterID).emit('sendAnswer', {
                answer: event.answer,
                id: socket.id
            });
        });
    
        socket.on('candidate', function (event) {
            console.log('candidate');
            frappe.io.to(event.socketID).emit('candidate', {
                event,
                id: socket.id
            });
        });
    
        frappe.io.to(socket.id).emit('giveID', socket.id);
    });
});