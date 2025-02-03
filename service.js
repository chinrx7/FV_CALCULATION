var Service = require('node-windows').Service;
var svc = new Service({
    name: 'FV CALCULATION',
    description: 'Service for realtime FV calculation',
    script: 'C:\\FV_APP\\FV_CALCULATION\\app.js'
});

svc.on('install', function(){
    svc.start();
});

svc.install();
