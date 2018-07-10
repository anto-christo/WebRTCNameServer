const server = require('frappejs/server');

server.start({
    backend: 'sqlite',
    connectionParams: {
      port: 8002,
      dbPath: 'test.db',
    },
    staticPath: './dist',
    models: require('./models'),
});
