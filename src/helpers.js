import React from 'react';
import {Animated} from 'react-native';
import MMKVStorage from "react-native-mmkv-storage";
const MMKV = new MMKVStorage.Loader().initialize();
import defaultSettings from '../assets/data/defaultSettings.js';

var crypto = require('crypto');

const helpers = {

    _delay: function(t, v) {
        console.log(`delay called for ${t}`)
       return new Promise(function(resolve) {
           setTimeout(resolve.bind(null, v), t)
       });

    },
    _goToScreen: function(screen, statusMessage = '') {

        console.log('Going to screen ' + screen);
        console.log('Status message: ' + statusMessage);

        this.setState({
            location: screen,
            status: statusMessage,
            scrollOffset: new Animated.Value(0)
        });

    },
    _goToFailScreen: function(warning = '', description = '') {

        this.setState({
            location: 'atFail',
            failWarning: warning,
            failDescription: description
        });

    },
    _logEvent: function (logMessage) {

        // Get timestamp.
        var timeStamp = new Date();
        var timeStampString = (
            `${timeStamp.getHours()}`.padStart(2, '0') + ":" +
            `${timeStamp.getMinutes()}`.padStart(2, '0') + ":" +
            `${timeStamp.getSeconds()}`.padStart(2, '0')
        ); //+ ":" + timeStamp.getMilliseconds();

        var loggedEvents = this.state.loggedEvents;
        loggedEvents.push([timeStampString, logMessage]);

        this.setState({
            loggedEvents: loggedEvents
        });

    },
    _bytesToHex(byteArray) {

        return Array.from(byteArray, function(byte) {

            return ('0' + (byte & 0xFF).toString(16)).slice(-2);

        }).join('')

    },
    _hexToBytes: function(hex) {

        for (var bytes = [], c = 0; c < hex.length; c += 2) {
            bytes.push(parseInt(hex.substr(c, 2), 16));
        }
        return bytes;

    },
    _hexToAscii(hex) {

        var str = '';
        for (var n = 0; n < hex.length; n += 2) {
            str += String.fromCharCode(parseInt(hex.substr(n, 2), 16));
        }
        return str;

     },
    _loadSettings: async function() {

        let ethNode = await MMKV.getStringAsync("ethNode");
        let ipfsNode = await MMKV.getStringAsync("ipfsNode");

        console.log(`nodes: ${ethNode}`)
        ethNode = ethNode ? ethNode : defaultSettings.ethNode;
        ipfsNode = ipfsNode ? ipfsNode : defaultSettings.ipfsNode;        

 
        console.log(`ethNode after set: ${ethNode}`)

        // Update settings.
        this.setState({chainSettings: Object.assign({}, this.state.chainSettings, {
            ethNode: ethNode,
            ipfsNode: ipfsNode,
            bridgeNode: defaultSettings.bridgeNode,
            registerAddress: defaultSettings.registerAddress
        })});


    },
    _loadVerificationType: function() {
        MMKV.getString('fullVerification', (err, value) => {
            this.setState({fullVerification: value == "true"});
        })
    },
    _toggleVerificationType: function(value) {
        this.setState({fullVerification: value}, () => {MMKV.setString('fullVerification', JSON.stringify(value), (res) => {})})
    },
    _resetNodes: async function() {
        var chainSettings = Object.assign({}, this.state.chainSettings, {
            ethNode: defaultSettings.ethNode,
            ipfsNode: defaultSettings.ipfsNode,
            registerAddress: defaultSettings.registerAddress
        });

        MMKV.setString("ethNode", defaultSettings.ethNode);
        MMKV.setString("ipfsNode", defaultSettings.ipfsNode);
        MMKV.setString("registerAddress", defaultSettings.registerAddress);

        MMKV.clearStore();

        this.setState((prevState) => ({chainSettings}));
    },
    _getLocalDevice: function(primaryPublicKeyHash) {
        return MMKV.getMap(primaryPublicKeyHash, (error, device) => {
          if (error) {
            console.log(error);
            return undefined;
          } 
          //console.log(device); // logs object
          return device;
        });
    },      
    _createHardwareHash: function(primaryPublicKeyHash, secondaryPublicKeyHash, tertiaryPublicKeyHash, hardwareSerialHash) {
        var hardwareBuf = Buffer.alloc(128);

        // console.log(primaryPublicKeyHash)
        // console.log(secondaryPublicKeyHash)
        // console.log(tertiaryPublicKeyHash)
        // console.log(hardwareSerialHash)

        Buffer.from(primaryPublicKeyHash.slice(2,66), 'hex').copy(hardwareBuf, 0);
        Buffer.from(secondaryPublicKeyHash.slice(2,66), 'hex').copy(hardwareBuf, 32);
        Buffer.from(tertiaryPublicKeyHash.slice(2,66), 'hex').copy(hardwareBuf, 64);
        Buffer.from(hardwareSerialHash.slice(2,66), 'hex').copy(hardwareBuf, 96);

        var hardwareHash = crypto.createHash('sha256').update(hardwareBuf, 'hex').digest('hex');

        return hardwareHash;
    }

}

export default helpers;