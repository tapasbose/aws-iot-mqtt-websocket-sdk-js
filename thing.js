/**
 * The MIT License (MIT)
 Copyright (c) 2016 Tapas Bose

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all
 copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 SOFTWARE.
 */

var Thing = function (options) {
    var SigV4Utils = function () {
    };

    SigV4Utils.sign = function (key, msg) {
        var hash = CryptoJS.HmacSHA256(msg, key);
        return hash.toString(CryptoJS.enc.Hex);
    };

    SigV4Utils.sha256 = function (msg) {
        var hash = CryptoJS.SHA256(msg);
        return hash.toString(CryptoJS.enc.Hex);
    };

    SigV4Utils.getSignatureKey = function (key, dateStamp, regionName, serviceName) {
        var kDate = CryptoJS.HmacSHA256(dateStamp, 'AWS4' + key);
        var kRegion = CryptoJS.HmacSHA256(regionName, kDate);
        var kService = CryptoJS.HmacSHA256(serviceName, kRegion);
        var kSigning = CryptoJS.HmacSHA256('aws4_request', kService);
        return kSigning;
    };

    var MQTTClient = function (options) {
        var computeUrl = function (region, secretKey, accessKey, host) {
            var time = moment.utc();
            var dateStamp = time.format('YYYYMMDD');
            var amzdate = dateStamp + 'T' + time.format('HHmmss') + 'Z';
            var service = 'iotdevicegateway';
            var algorithm = 'AWS4-HMAC-SHA256';
            var method = 'GET';
            var canonicalUri = '/mqtt';

            var credentialScope = dateStamp + '/' + region + '/' + service + '/' + 'aws4_request';
            var canonicalQuerystring = 'X-Amz-Algorithm=AWS4-HMAC-SHA256';
            canonicalQuerystring += '&X-Amz-Credential=' + encodeURIComponent(accessKey + '/' + credentialScope);
            canonicalQuerystring += '&X-Amz-Date=' + amzdate;
            canonicalQuerystring += '&X-Amz-SignedHeaders=host';

            var canonicalHeaders = 'host:' + host + '\n';
            var payloadHash = SigV4Utils.sha256('');
            var canonicalRequest = method + '\n' + canonicalUri + '\n' + canonicalQuerystring + '\n' + canonicalHeaders + '\nhost\n' + payloadHash;

            var stringToSign = algorithm + '\n' + amzdate + '\n' + credentialScope + '\n' + SigV4Utils.sha256(canonicalRequest);
            var signingKey = SigV4Utils.getSignatureKey(secretKey, dateStamp, region, service);
            var signature = SigV4Utils.sign(signingKey, stringToSign);

            canonicalQuerystring += '&X-Amz-Signature=' + signature;
            var requestUrl = 'wss://' + host + canonicalUri + '?' + canonicalQuerystring;
            return requestUrl;
        };

        this.options = options;
        this.clientId = this.options.clientId;
        this.requestUrl = computeUrl(this.options.regionName, this.options.secretKey, this.options.accessKey, this.options.endpoint);
        this.listeners = {};
        this.client = new Paho.MQTT.Client(this.requestUrl, this.clientId);

        var self = this;

        this.client.onConnectionLost = function () {
            self.emit('mq.connection.fail');
            self.connected = false;
        };

        this.client.onMessageArrived = function (message) {
            self.emit('mq.message.arrived', message);
        };

        this.on = function (event, handler) {
            if (!this.listeners[event]) {
                this.listeners[event] = [];
            }

            this.listeners[event].push(handler);
        };

        this.emit = function (event) {
            var listeners = this.listeners[event];

            if (listeners) {
                var args = Array.prototype.slice.apply(arguments, [1]);

                for (var i = 0; i < listeners.length; i++) {
                    var listener = listeners[i];
                    listener.apply(null, args);
                }
            }
        };

        this.connect = function () {
            var self = this;
            var connectOptions = {
                useSSL: true,
                timeout: 3,
                mqttVersion: 4,
                onSuccess: function () {
                    self.emit('mq.connection.success');
                },
                onFailure: function () {
                    self.emit('mq.connection.fail');
                }
            };

            this.client.connect(connectOptions);
        };

        this.disconnect = function () {
            this.client.disconnect();
        };

        this.isConnected = function () {
            return this.client.isConnected();
        };

        this.publish = function (destination, payload) {
            try {
                var message = new Paho.MQTT.Message(payload);
                message.destinationName = destination;
                this.client.send(message);
            } catch (error) {
                this.emit('mq.publish.failed', error);
            }
        };

        this.subscribe = function (topic) {
            var self = this;

            this.client.subscribe(topic, {
                onSuccess: function (response) {
                    self.emit('mq.subscribe.success', topic, response);
                },
                onFailure: function (response) {
                    self.emit('mq.subscribe.fail', topic, response);
                }
            });
        };

        this.unSubscribe = function (topic) {
            var self = this;

            this.client.unsubscribe(topic, {
                onSuccess: function (response) {
                    self.emit('mq.unsubscribe.success', topic, response);
                },
                onFailure: function (response) {
                    self.emit('mq.unsubscribe.fail', topic, response);
                }
            });
        };
    };

    var guid = function () {
        var s4 = function () {
            return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
        }

        return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
    };

    var isUndefined = function (value) {
        return typeof value === 'undefined' || typeof value === null;
    };

    var buildThingShadowTopic = function (thingName, operation, type) {
        if (!isUndefined(type)) {
            return '$aws/things/' + thingName + '/shadow/' + operation + '/' + type;
        }

        return '$aws/things/' + thingName + '/shadow/' + operation;
    };

    var getClientId = function (clientId) {
        return (!isUndefined(clientId) ? clientId : 'nouser') + (Math.floor((Math.random() * 100000) + 1));
    };

    var buildMQTTClient = function (options, clientId) {
        if (!isUndefined(options)) {
            return new MQTTClient({
                clientId: getClientId(clientId),
                regionName: options.regionName,
                endpoint: options.endpoint,
                accessKey: options.accessKey,
                secretKey: options.secretKey
            });
        }

        return null;
    };

    this.options = options;
    this.clientId = this.options.clientId;
    this.thingName = this.options.thingName;
    this.listeners = [];

    this.on = function (event, handler) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }

        this.listeners[event].push(handler);
    };

    this.emit = function (event) {
        var listeners = this.listeners[event];

        if (listeners) {
            var args = Array.prototype.slice.apply(arguments, [1]);

            for (var i = 0; i < listeners.length; i++) {
                var listener = listeners[i];
                listener.apply(null, args);
            }
        }
    };

    this.register = function () {
        var self = this;
        this.client = buildMQTTClient(this.options, this.clientId);

        this.client.on('mq.connection.success', function () {
            self.client.subscribe(buildThingShadowTopic(self.thingName, 'get', '+'));
            self.client.subscribe(buildThingShadowTopic(self.thingName, 'update', '+'));
            self.emit('thing.connection.success');
        });

        this.client.on('mq.connection.fail', function () {
            self.emit('thing.connection.fail');
        });

        this.client.on('mq.subscribe.fail', function (topic, response) {
            self.emit('thing.subscribe.fail', topic, response);
        });

        this.client.on('mq.subscribe.success', function (topic, response) {
            self.emit('thing.subscribe.success', topic, response);
        });

        this.client.on('mq.unsubscribe.fail', function (topic, response) {
            self.emit('thing.unsubscribe.fail', topic, response);
        });

        this.client.on('mq.unsubscribe.success', function (topic, response) {
            self.emit('thing.unsubscribe.success', topic, response);
        });

        this.client.on('mq.message.arrived', function (message) {
            var destination = message.destinationName;

            switch (true) {
                case /get\/accepted/.test(destination):
                    self.emit('thing.get.message.accepted', JSON.parse(message.payloadString));
                    break;

                case /get\/rejected/.test(destination):
                    self.emit('thing.get.message.rejected',  JSON.parse(message.payloadString));
                    break;

                case /update\/accepted/.test(destination):
                    self.emit('thing.update.message.accepted',  JSON.parse(message.payloadString));
                    break;

                case /update\/rejected/.test(destination):
                    self.emit('thing.update.message.rejected',  JSON.parse(message.payloadString));
                    break;

                case /update\/documents/.test(destination):
                    self.emit('thing.update.message.documents',  JSON.parse(message.payloadString));
                    break;

                case /update\/delta/.test(destination):
                    self.emit('thing.update.message.delta',  JSON.parse(message.payloadString));
                    break;

                default:
                    break;
            }
        });

        this.client.connect();
    };

    this.unRegister = function () {
        this.client.unSubscribe(buildThingShadowTopic(self.thingName, 'get', '+'));
        this.client.unSubscribe(buildThingShadowTopic(self.thingName, 'update', '+'));
        this.client.disconnect();
    };

    this.get = function (clientToken) {
        var stateObject = {};
        stateObject.clientToken = (!isUndefined(clientToken) ? clientToken : guid());
        this.client.publish(buildThingShadowTopic(this.thingName, 'get'), JSON.stringify(stateObject));
        return stateObject.clientToken;
    };

    this.update = function (stateObject, clientToken) {
        if(isUndefined(stateObject)) {
            return null;
        }

        stateObject.clientToken = (!isUndefined(clientToken) ? clientToken : guid());
        this.client.publish(buildThingShadowTopic(this.thingName, 'update'), JSON.stringify(stateObject));
        return stateObject.clientToken;
    };
};