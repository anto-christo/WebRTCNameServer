const frappe = require('frappejs');
const common = require('frappejs/common')
const coreModels = require('frappejs/models');
const HTTPClient = require('frappejs/backends/http');
const Observable = require('frappejs/utils/observable');

const server = 'localhost:8080';
window.frappe = frappe;
frappe.init();
frappe.registerLibs(common);
frappe.registerModels(coreModels);
frappe.fetch = window.fetch.bind();
frappe.db = new HTTPClient({ server });
frappe.docs = new Observable();

var socket = io.connect();

socket.on('serverRequest', function(event){
    console.log(event);
    const serverInfo = frappe.getDoc('serverInfo', event.name);
    if(serverInfo!=undefined){
        if(serverInfo.name == event.name && serverInfo.key == event.key){
            serverInfo.socketID = event.socketID;
            serverInfo.update().then(doc => {
                socket.emit('serverResponse',{res:'success', socketID:event.socketID});
            });
        }
        else if(key==undefined){
            socket.emit('serverResponse',{res:'exists', socketID:event.socketID});
        }
        else{
            socket.emit('serverResponse',{res:'incorrect', socketID:event.socketID});
        }
    }
    else{
        var key = generateKey();
        var newServerInfo = frappe.newDoc({
            doctype: 'serverInfo',
            name: event.name,
            socketID: event.socketID,
            key: key
        });
        newServerInfo.insert().then(doc => {
            socket.emit('serverResponse',{res:'new', socketID:event.socketID, key:key});
        });
    }
});