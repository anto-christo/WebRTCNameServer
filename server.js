var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io').listen(server);

server.listen(process.env.PORT || 8080,function(){
    console.log('Listening on '+server.address().port);
});

io.on('connection',function(socket){

    socket.on('create or join', function (room) { 
        var myRoom = io.sockets.adapter.rooms[room] || { length: 0 };
        var numClients = myRoom.length;        
        if (numClients == 0) {
            socket.join(room);
            socket.emit('created');
        } else if (numClients == 1) {
            socket.join(room);
            socket.emit('joined', room);
        } else {
            console.log("Limited to only 2 connections/room");
        }
    });

    socket.on('ready', function (room){
        socket.broadcast.to(room).emit('createOffer',room);
    });

    socket.on('offer', function(event){
        socket.broadcast.to(event.room).emit('sendOffer',event);
    });

    socket.on('answer', function(event){
        socket.broadcast.to(event.room).emit('sendAnswer',event.answer);
    });

    socket.on('candidate', function (event){
        socket.broadcast.to(event.room).emit('candidate', event);
    });
});
