var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io').listen(server);

server.listen(process.env.PORT || 8080,function(){
    console.log('Listening on '+server.address().port);
});

io.on('connection',function(socket){

    socket.emit('giveID',socket.id);

    socket.on('create', function (masterID) {
        io.to(masterID).emit('created',socket.id);
    });

    socket.on('join', function (creatorID) {
        io.to(creatorID).emit('joined',socket.id);
    });

    socket.on('ready', function (masterID){
        io.to(masterID).emit('createOffer',socket.id);
    });

    socket.on('offer', function(event){
        io.to(event.creatorID).emit('sendOffer',{offer:event.offer, id:socket.id});
    });

    socket.on('answer', function(event){
        io.to(event.masterID).emit('sendAnswer',{answer:event.answer, id:socket.id});
    });

    socket.on('candidate', function (event){
        io.to(event.socketID).emit('candidate', {event:event, id:socket.id});
    });
});
