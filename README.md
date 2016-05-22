# AWS IoT MQTT Websocket SDK for JavaScript

* [Overview](#overview)
* [Dependencies](#dependencies)
* [Installation](#installation)
* [API](#api)
* [Example](#example)
* [License](#license)

<a name="overview"></a>
## Overview
The aws-iot-mqtt-websocket-sdk-js library is developed to write JavaScript applications for browser which access the AWS IoT Platform via MQTT over the Secure WebSocket Protocol.

<a name="dependencies"></a>
## Dependencies
This library has following dependencies: 
 - [CryptoJS](https://github.com/jlcampana/cryptojslib)
 - [Eclipse Paho JavaScript client](https://github.com/eclipse/paho.mqtt.javascript)
 - [Moment JS](https://github.com/moment/moment)
  
<a name="installation"></a> 
## Installation
Installing with bower:

```sh
bower install aws-iot-mqtt-websocket-sdk-js --save
```

Installing from github:

```sh
git clone https://github.com/tapasbose/aws-iot-mqtt-websocket-sdk-js.git
cd aws-iot-mqtt-websocket-sdk-js
bower install 
```

<a name="api"></a> 
## API
### Class
The class `Thing` represents an Internet Of Thing connected with AWS IoT via MQTT Protocol over Secure WebSocket. To instantiate this class you need to do the following:

```js
var thing = new Thing({
	regionName: 'your_region',
	endpoint: 'your_aws_iot_endpoint',
	accessKey: 'your_access_key',
	secretKey: 'your_secret_key',
	thingName: 'your_thing_name'
});
```

Once you have instantiate the class, you need to call `register` method to connect your thing with AWS IoT via MQTT Protocol over Secure WebSocket.

### Methods
#### register()
A call to the method `register` connects your thing with AWS IoT. After the connetion is successfull the thing subscribes to the following topics to get notifications:
* _$aws/things/your_thing/shadow/get/+_
* _$aws/things/your_thing/shadow/update/+_

#### unRegister()
A call to the method `unRegister` disconnects your thing with AWS IoT and unregisters itself from the subscribed topics.

#### get(clientToken)
A call to the method `get` is used to extract the current state information of your thing from AWS IoT. The state is returned by the channel _/get/accepted_. The event handler for the event `thing.get.message.accepted` will receive this state.

This method takes an optional `clientToken` parameter. If this parameter is not provided then the API will provide one for you. This `clientToken` enables you to associate responses with requests in MQTT environment.

This method returns `clientToken`.

#### update(stateObject, clientToken)
A call to the method `update` is used to publish state information of your thing to AWS IoT. If the update request is accecpted by AWS IoT then the updated state is returned through the channel _update/accepted_. The event handler for the event `thing.update.message.accepted` will receive this state.

This method takes a mandetory `stateObject` parameter and an optional `clientToken` parameter. If the parameter `clientToken` is not provided then the API will provide one for you. This `clientToken` enables you to associate responses with requests in MQTT environment.

This method returns `clientToken` (If `stateObject` is undefined then it returns null).

#### isConnected()
A call to this method returns if the underlying mqtt client is connected or not. 

#### getName()
This method returns the name of the thing associated with it.

### Events
* `thing.connection.success`: This event will be fired when the thing get connected successfully.
* `thing.connection.fail`: This event will be fired when the thing fail to connect.
* `thing.subscribe.success`: This event will be fired when the thing has successfully subscribed to a topic. Two objects will be passed to the callback handler:
  * topic: the topic in which the thing has successfully subscribed to.
  * response: the raw response from the underlying mqtt client.
* `thing.subscribe.fail`: This event will be fired when the thing has failed to subscribe to a topic. Two objects will be passed to the callback handler:
  * topic: the topic in which the thing has failed to subscribe.
  * response: the raw response from the underlying mqtt client.
* `thing.unsubscribe.success`: This event will be fired when the thing has successfully unsubscribed to a topic. Two objects will be passed to the callback handler:
  * topic: the topic in which the thing has successfully unsubscribed to.
  * response: the raw response from the underlying mqtt client.
* `thing.unsubscribe.fail`: This event will be fired when the thing has failed to unsubscribe to a topic. Two objects will be passed to the callback handler:
  * topic: the topic in which the thing has failed to unsubscribe.
  * response: the raw response from the underlying mqtt client.
* `thing.get.message.accepted`: This event will be fired when there is any message arrived in the channel _/get/accepted_. A JSON object will be passed to callback handler.
* `thing.get.message.rejected`: This event will be fired when there is any message arrived in the channel _/get/rejected_. A JSON object will be passed to callback handler.
* `thing.update.message.accepted`: This event will be fired when there is any message arrived in the channel _/update/accepted_. A JSON object will be passed to callback handler.
* `thing.update.message.rejected`: This event will be fired when there is any message arrived in the channel _/update/rejected_. A JSON object will be passed to callback handler.
* `thing.update.message.documents`: This event will be fired when there is any message arrived in the channel _/update/documents_. A JSON object will be passed to callback handler.
* `thing.update.message.delta`: This event will be fired when there is any message arrived in the channel _/update/delta_. A JSON object will be passed to callback handler.

<a name="example"></a>
## Example
See [sample](https://github.com/tapasbose/aws-iot-mqtt-websocket-sdk-js/tree/master/sample) directory for example.

<a name="license"></a> 
## License
aws-iot-mqtt-websocket-sdk-js is freely distributable under the terms of the [MIT license](https://github.com/tapasbose/aws-iot-mqtt-websocket-sdk-js/blob/master/LICENSE).
