/* Mock irc server */

var path = require('path');
var fs = require('fs');
var net = require('net');
var tls = require('tls');
var util = require('util');
var EventEmitter = require('events').EventEmitter;

var MockIrcd = function(port, encoding, isSecure) {
    var self = this;
    var connectionClass;
    var options = {};

    if (isSecure) {
        connectionClass = tls;
        options = {
            key: fs.readFileSync(path.resolve(__dirname, 'data/ircd.key')),
            cert: fs.readFileSync(path.resolve(__dirname, 'data/ircd.pem'))
        };
    } else {
        connectionClass = net;
    }

    this.port = port || (isSecure ? 6697 : 6667);
    this.encoding = encoding || 'utf-8';
    this.incoming = [];
    this.outgoing = [];
    console.log('Mock server initializing.');

    this.server = connectionClass.createServer(options, function(c) {
        var active = true;
        c.on('data', function(data) {
            var msg = data.toString(self.encoding).split('\r\n').filter(function(m) { return m; });
            self.incoming = self.incoming.concat(msg);
        });

        self.on('send', function(data) {
            if (!active || c.destroyed) return;
            self.outgoing.push(data);
            c.write(data);
        });

        c.on('end', function() {
            active = false;
            self.emit('end');
        });
    });

    this.server.listen(this.port);

    this.server.on('close', function(){
        console.log('Mock server closed.');
    })
};
util.inherits(MockIrcd, EventEmitter);

MockIrcd.prototype.send = function(data) {
    this.emit('send', data);
};

MockIrcd.prototype.close = function() {
    this.server.close.apply(this.server, arguments);
};

MockIrcd.prototype.getIncomingMsgs = function() {
    return this.incoming;
};

var fixtures = require('./data/fixtures');
module.exports.getFixtures = function(testSuite) {
    return fixtures[testSuite];
};

module.exports.MockIrcd = function(port, encoding, isSecure) {
    return new MockIrcd(port, encoding, isSecure);
};
