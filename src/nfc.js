
import crc16 from 'crc/crc16ccitt';
import helpers from './helpers.js';
import { Platform } from 'react-native';
import { generateSecureRandom } from 'react-native-securerandom';
import NfcManager, {Ndef, NfcTech} from 'react-native-nfc-manager';
import NetInfo from "@react-native-community/netinfo";

import MMKVStorage from "react-native-mmkv-storage";
const MMKV = new MMKVStorage.Loader().initialize();

var crypto = require('crypto');

// Import text.
import strings from '../assets/text/strings.js';


const nfc = {

    _nfcStart: function() {

        NfcManager.isSupported()
        .then(nfcSupported => {

            this.setState({nfcSettings: Object.assign({}, this.state.nfcSettings, {nfcSupported: nfcSupported})});

            if (nfcSupported)   {

                if (Platform.OS == 'android') {

                    NfcManager.isEnabled()
                    .then(enabled => {

                        this.setState({nfcSettings: Object.assign({}, this.state.nfcSettings, {nfcEnabled: enabled})});

                        if (enabled) {

                            NfcManager.start()
                            .then(() => {

                                console.log('Successfully started NFC');
                                this._nfcAndroidScan()

                            })
                            .catch(err => {

                                console.warn('Failed to start NFC: ', err);
                                this.setState({nfcSettings: Object.assign({}, this.state.nfcSettings, {nfcSupported: false})});

                            })

                        }

                    })
                    .catch(err => {

                        console.log(err);

                    })

                } else if (Platform.OS == 'ios') {

                    NfcManager.start().catch(err => {

                        console.warn('Failed to start NFC: ', err);
                        this._goToFailScreen('UhOh!', 'IOS Error ---');
                        this.setState({nfcSettings: Object.assign({}, this.state.nfcSettings, {nfcSupported: false})});

                    })
                }
            }

        })

    },
    _nfcValidateRecords: function(tag) {
        // Validate tag format.
        let validRecord = true;
        if (tag.ndefMessage.length == 6) {
            if (tag.ndefMessage[0].payload.length != 10) {validRecord = false};
            if (tag.ndefMessage[1].payload.length != 7) {validRecord = false};
            if (tag.ndefMessage[2].payload.length != 2) {validRecord = false};
            if (tag.ndefMessage[3].payload.length != 324) {validRecord = false};
            if (tag.ndefMessage[4].payload.length != 304) {validRecord = false};
            if (tag.ndefMessage[5].payload.length != 99) {validRecord = false};
        } else {
            validRecord = false
        }
        return validRecord       
    },
    _nfcParseNdefRecord: function(tag) {
        console.log(`nfcSetData called with ${tag}`)
        // Parse records.
        var infoRecord = helpers._bytesToHex(tag.ndefMessage[3].payload);
        var inputRecord = helpers._bytesToHex(tag.ndefMessage[5].payload);
        var outputRecord = helpers._bytesToHex(tag.ndefMessage[4].payload);

        // Extract info.
        var nfcReadInfoPrimaryPublicKey = infoRecord.slice(32, 160);
        var nfcReadInfoSecondaryPublicKey = infoRecord.slice(160, 288);
        var nfcReadInfoHardwareSerial = infoRecord.slice(374, 392);

        var nfcReadInfoPrimaryPublicKeyHash = crypto.createHash('sha256').update(nfcReadInfoPrimaryPublicKey, 'hex').digest('hex');
        var nfcReadInfoSecondaryPublicKeyHash = crypto.createHash('sha256').update(nfcReadInfoSecondaryPublicKey, 'hex').digest('hex');
        var nfcReadInfoHardwareSerialHash = crypto.createHash('sha256').update(Buffer.from(nfcReadInfoHardwareSerial)).digest('hex');

        // Check local storage.
        var localDevice = helpers._getLocalDevice('0x' + nfcReadInfoPrimaryPublicKeyHash);
        var hardwareHash = null;

        if (localDevice) {
            hardwareHash = helpers._createHardwareHash('0x' + nfcReadInfoPrimaryPublicKeyHash, '0x' + nfcReadInfoSecondaryPublicKeyHash, localDevice['tertiaryPublicKeyHash'], '0x' + nfcReadInfoHardwareSerialHash)
            localDevice.hardwareSerial = nfcReadInfoHardwareSerial;
        }

        // Update state.
        let nfcData = {

            // inputRecord
            nfcReadInputCommandCode: inputRecord.slice(0, 2),
            nfcReadInputExternalRandomNumber: inputRecord.slice(2, 66),
            nfcReadInputBlockhash: inputRecord.slice(66, 130),
            nfcReadInputCombinedHash: inputRecord.slice(130, 194),

            // outputRecord
            nfcReadOutputCommandCode: outputRecord.slice(0, 2),
            nfcReadOutputExternalRandomNumber: outputRecord.slice(2, 66),
            nfcReadOutputBlockhash: outputRecord.slice(66, 130),
            nfcReadOutputCombinedHash: outputRecord.slice(130, 194),
            nfcReadOutputInternalRandomNumber: outputRecord.slice(194, 258),
            nfcReadOutputExternalSignature: outputRecord.slice(258, 386),
            nfcReadOutputInternalSignature: outputRecord.slice(386, 514),

            // infoRecord
            nfcReadInfoPrimaryPublicKey: nfcReadInfoPrimaryPublicKey,
            nfcReadInfoSecondaryPublicKey: nfcReadInfoSecondaryPublicKey,
            nfcReadInfoPrimaryPublicKeyHash: nfcReadInfoPrimaryPublicKeyHash,
            nfcReadInfoHardwareSerial: nfcReadInfoHardwareSerial,

            // Device information.
            localDevice: localDevice,
            hardwareHash: hardwareHash          
        }

        return nfcData

    },
    _nfcMifareParseRecord: function(byteArray) {
        console.log(`_nfcMifareParseRecord`)
        // Slice keys from response.
        var externalPublicKey = helpers._bytesToHex(byteArray.slice(2, 66));
        var internalPublicKey = helpers._bytesToHex(byteArray.slice(66, 130));
        var hardwareSerial    = helpers._bytesToHex(byteArray.slice(173, 182));

        // Hash the keys.
        var externalPublicKeyHash = crypto.createHash('sha256').update(externalPublicKey, 'hex').digest('hex');
        var internalPublicKeyHash = crypto.createHash('sha256').update(internalPublicKey, 'hex').digest('hex');
        var hardwareSerialHash = crypto.createHash('sha256').update(Buffer.from(hardwareSerial)).digest('hex');

        let mifareData = {
            nfcReadInfoPrimaryPublicKey: externalPublicKey,
            nfcReadInfoSecondaryPublicKey: internalPublicKey,
            nfcReadInfoPrimaryPublicKeyHash: externalPublicKeyHash,
            nfcReadInfoSecondaryPublicKeyHash: internalPublicKeyHash,
            nfcReadInfoHardwareSerial: hardwareSerial,
            nfcReadInfoHardwareSerialHash: hardwareSerialHash
        }
        return mifareData;

    },
    _nfcMifareReadPayload: function(hashByteArray, signatureByteArray) {
        // Get external and internal hash.
        var nfcReadOutputExternalRandomNumber = helpers._bytesToHex(hashByteArray.slice(1, 33)).toLowerCase();
        var nfcReadOutputBlockhash = helpers._bytesToHex(hashByteArray.slice(33, 65)).toLowerCase();
        var nfcReadOutputCombinedHash = helpers._bytesToHex(hashByteArray.slice(65, 97)).toLowerCase();
        var nfcReadOutputInternalRandomNumber = helpers._bytesToHex(hashByteArray.slice(97, 129)).toLowerCase();

        // Get signatures.
        var nfcReadOutputExternalSignature = helpers._bytesToHex(signatureByteArray.slice(1, 65)).toLowerCase();
        var nfcReadOutputInternalSignature = helpers._bytesToHex(signatureByteArray.slice(65, 129)).toLowerCase();

        // Counter.
        var nfcReadOutputCounter = helpers._bytesToHex(signatureByteArray.slice(129, 130)).toLowerCase();

        let mifareData = {
            nfcReadOutputExternalRandomNumber: nfcReadOutputExternalRandomNumber,
            nfcReadOutputBlockhash: nfcReadOutputBlockhash,
            nfcReadOutputCombinedHash: nfcReadOutputCombinedHash,
            nfcReadOutputInternalRandomNumber: nfcReadOutputInternalRandomNumber,
            nfcReadOutputExternalSignature: nfcReadOutputExternalSignature,
            nfcReadOutputInternalSignature: nfcReadOutputInternalSignature,
            nfcReadOutputCounter: nfcReadOutputCounter
        }
        return mifareData;
    },    
    _createUnknownRecord: function(hex) {

        return {
            tnf: 0x05,
            type: [],
            id: [],
            payload: helpers._hexToBytes(hex)
        };

    },
    _structureNdefMessage: function (randomNumber, blockHash, combinedHash) {

        // Create records for link to app store and AAR.
        var kongDomain = 'https://kong.cash';
        var androidAppName = 'kongApp';
        var uriRecord = Ndef.uriRecord(kongDomain);
        var aarRecord = Ndef.androidApplicationRecord(androidAppName);

        // Create padding record.
        var shortMessage = Ndef.encodeMessage([uriRecord, aarRecord]);
        var paddingLength = 12 * 4 - shortMessage.length - 5; // Revisit this.
        var paddingRecord = nfc._createUnknownRecord('9'.repeat(paddingLength));

        console.log('RANDOM NUM INPUT');
        console.log(randomNumber);

        console.log('RANDOM HASH INPUT');
        console.log(combinedHash);

        // Combine all.
        let ndefMessage = Ndef.encodeMessage([

            // Static Lock Bytes.
            uriRecord,              // URI with domain that forwards to iOS app store.
            aarRecord,              // Android application record.
            paddingRecord,          // Padd.

            // Dynamic Lock Bytes.
            nfc._createUnknownRecord(    // 06 Bytes: Header
                '01'.repeat(4) +
                '02'.repeat(4) +
                '03'.repeat(8) +
                '04'.repeat(64) +   // 64 Bytes: Public Key 1
                '05'.repeat(64) +   // 64 Bytes: Public Key 2
                '06'.repeat(20) +
                '07'.repeat(7) +
                '08'.repeat(16) +
                '09'.repeat(9) +    // 08 Bytes: ATECC608A Serial
                '01'.repeat(128)    // 128 Bytes: Config Zone Bytes
            ),

            // Output.
            nfc._createUnknownRecord(    // 06 Bytes: Header
                '00' +              // 01 Byte:  Last Command Code.
                '01'.repeat(32) +   // 32 Bytes: Last External Random Number.
                '02'.repeat(32) +   // 32 Bytes: Last Blockhash.
                '03'.repeat(32) +   // 32 Bytes: Last SHA256 (External Random Number + Blockhash).
                '04'.repeat(32) +   // 32 Bytes: Last Internal Random SHA256 Hash (Internal Random Number).
                '05'.repeat(64) +   // 64 Bytes: Last Signature 1 (SHA256 Hash (External Random Number + Blockhash)).
                '06'.repeat(64) +   // 64 Bytes: Last Signature 2 (SHA256 Hash (Internal Random Number)).
                '07'.repeat(47)     // 47 Bytes: Padding
            ),

            // Input.
            nfc._createUnknownRecord(    // 03 Bytes: Header
                '00' +              // 01 Bytes: Command Code.
                randomNumber +      // 32 Bytes: External Random Number.
                blockHash +         // 32 Bytes: Blockhash.
                combinedHash +      // 32 Bytes: SHA256 (External Random Number + Blockhash).
                crc16(
                    helpers._hexToBytes(
                        '00' +
                        randomNumber +
                        blockHash +
                        combinedHash
                    )
                ).toString(16)      // 02 Bytes: CRC16
            )

        ]);

        // TLV.
        let ndefTLV = [
            0x03,                                                   // Field Type (0x03 = NDEF Message)
            0xFF,                                                   // Length field
            ndefMessage.length >> 8,                                // Length field cont.
            ndefMessage.length - (ndefMessage.length >> 8) * 256    // Length field cont.
        ];
        // Note: Length field in 3 byte version:
        // [0xFF, 0xYY, 0xXZ] where 0xYY, 0xZZ are sliced from word 0xYYZZ (!)

        // Prepend TLV.
        ndefMessage = ndefTLV.concat(ndefMessage);

        // Append terminator and trailing 0x00
        ndefMessage = ndefMessage.concat([0xfe]);
        while (ndefMessage.length % 4 > 0) ndefMessage = ndefMessage.concat([0x00])

        // Determine number of ic blocks.
        // var icBlockWithLastNdefRecord = Math.ceil(ndefMessage.length / 16);

        // Prepend 16 bytes for first 4 registers.
        let completeMemory = helpers._hexToBytes('00'.repeat(16)).concat(ndefMessage);

        return completeMemory;
    },
    _nfcNdefRegistrationCheck: function() {
        NetInfo.fetch().then(state => {
            // console.log(this.state.nfcData.localDevice)
            // console.log(this.state.nfcData.hardwareHash)
            if(state.isConnected && this.state.nfcData.localDevice && this.state.nfcData.hardwareHash) {
                console.log(`localDevice checking merkle`)
                var chainDataVal = {
                    proof: this.state.nfcData.localDevice['proof'], 
                    root: this.state.nfcData.localDevice['root'], 
                    hardwareHash: '0x' + this.state.nfcData.hardwareHash, 
                    kongAmount: '0x' + (this.state.nfcData.localDevice['kongAmount']).toString(16),
                    device: this.state.nfcData.localDevice                                  
                }

                Promise.all([
                    this._prefetchChainData('verifyDeviceProof', chainDataVal),
                    this._prefetchChainData('verifyMinter', this.state.nfcData.localDevice['entropyAddress']),
                    this._fetchChainData('blockByHash', this.state.nfcData.nfcReadOutputBlockhash)
                ])
                .then(() => {
                    if (this.state.blockchainData.verifiedProof == true) {
                        this._nfcStartQuickVerification();
                    } else if (this.state.blockchainData.verifiedProof == false) {
                        this._verifyUnknownDevice();
                    };
                }).catch((error) =>{
                    console.error(error);
                });                            
            } else if (state.isConnected) {
                console.log(`no localDevice`)
                Promise.all([
                    this._fetchChainData('contractRegistration', this.state.nfcData.nfcReadInfoPrimaryPublicKeyHash),
                    this._fetchChainData('blockByHash', this.state.nfcData.nfcReadOutputBlockhash)
                ])
                .then(() => {

                    if (this.state.blockchainData.contractRegistered == true) {
                        this._nfcStartQuickVerification();
                    } else if (this.state.blockchainData.contractRegistered == false) {
                        this._verifyUnknownDevice();
                    };
                }).catch((error) =>{
                    console.error(error);
                });                                    
            } else {
                this._verifyUnknownDevice();
            }
        });        
    },
    _nfcIOSScanStart: function() {
        if (this.state.fullVerification) {
            this._nfcIOSScanFull();
        } else {
            this._nfcIOSScanQuick();
        }
    },       
    _nfcIOSScanQuick: function() {
        
        NfcManager.requestTechnology(NfcTech.Ndef, {
                alertMessage: strings.textProcessingQuickTouchNoteIOS
        }).then((resp) => {

            NfcManager.getNdefMessage().then((tag) => {

                    // Update view.
                    this._goToScreen('atProcessing', strings.textProcessingNewTagIOS);
                    NfcManager.setAlertMessageIOS(strings.textProcessingPreparingResultsIOS);
                    
                    // Validate tag format.
                    var validRecord = nfc._nfcValidateRecords(tag);

                    // Process.
                    if (validRecord == false) {
                        this._goToFailScreen(strings.textFailUnknownTagTypeWarning, strings.textFailUnknownTagTypeDescription);
                    } else {

                        // Parse the tag, set NFC state.
                        let parsedNfcData = nfc._nfcParseNdefRecord(tag);
                        var nfcData = Object.assign({}, this.state.nfcData, parsedNfcData);
                        this.setState((prevState) => ({nfcData}));

                        NfcManager.cancelTechnologyRequest().catch(() => 0);

                        this._nfcNdefRegistrationCheck();
                    }

                },
                'Hold the bill close to the top of your iPhone.',
                {
                    invalidateAfterFirstRead: true
                }
            )
            .catch((err) => {
                NfcManager.setAlertMessageIOS(strings.textProcessingPreparingResultsIOS);
                NfcManager.cancelTechnologyRequest().catch(() => 0);
                this._goToFailScreen(strings.textFailUnknownTagTypeWarning, strings.textFailUnknownTagTypeDescription);
            }) 
        }) 

    },
    _nfcAndroidProcessQuickScan: function() {

        console.log(`ANDROID QUICK SCAN CALLED: ${Date.now()}`);

        NfcManager.requestTechnology(NfcTech.Ndef).then((resp) => {

            NfcManager.getNdefMessage().then((tag) => {

                    // Update view.
                    this._goToScreen('atProcessing', strings.textProcessingNewTagIOS);

                    // Validate tag format.
                    var validRecord = nfc._nfcValidateRecords(tag);
                    
                    // Process.
                    if (validRecord == false) {
                        this._goToFailScreen(strings.textFailUnknownTagTypeWarning, strings.textFailUnknownTagTypeDescription);
                    } else {

                        // Parse the tag, set NFC state.
                        let parsedNfcData = nfc._nfcParseNdefRecord(tag);
                        var nfcData = Object.assign({}, this.state.nfcData, parsedNfcData);
                        this.setState((prevState) => ({nfcData}));

                        console.log(nfcData);

                        NfcManager.cancelTechnologyRequest().catch(() => 0);

                        this._nfcNdefRegistrationCheck();
                    }

                },
                'Hold the bill close to the top of your phone.',
                {
                    isReaderModeEnabled: true
                }
            )
            .catch((err) => {
                NfcManager.cancelTechnologyRequest().catch(() => 0);
                this._goToFailScreen(strings.textFailUnknownTagTypeWarning, strings.textFailUnknownTagTypeDescription);
            }) 
        }) 

    },
    _nfcIOSScanFull: function() {

        console.log(`iOS FULL SCAN CALLED: ${Date.now()}`);

        this._prefetchChainData('latestBlock').then(() => {

        //NfcManager.registerTagEventEx().then(() => {
            console.log(`TECH CALLED: ${Date.now()}`);
            NfcManager.requestTechnology(NfcTech.MifareIOS, {
                alertMessage: strings.textProcessingTouchNoteIOS
            }).then((resp) => {
                
                NfcManager.getTag().then((tag) => {
                    console.log(`GOT TAG: ${Date.now()} with tech ${tag.techTypes}`);
                    this._goToScreen('atProcessing', strings.textProcessingNewTagIOS);

                    NfcManager.setAlertMessageIOS(strings.textProcessingNoteDetectedIOS);

                    //this._transcieve([0x30, 0xe8]).then((configBytes) => {
                    NfcManager.sendMifareCommandIOS([0x30, 0xe8]).then((configBytes) => {

                        this.setState({nfcData: Object.assign({}, this.state.nfcData, {
                            icBlockWithLastNdefRecord: configBytes[1]
                        })});

                        /************
                        * Get Keys. *
                        ************/

                        NfcManager.setAlertMessageIOS(strings.textProcessingUniqueInfoIOS);

                        NfcManager.sendMifareCommandIOS([0x3a, 0x15, 0x42]).then((ret) => {

                            let mifareRecord = nfc._nfcMifareParseRecord(ret);
                            this.setState({nfcData: Object.assign({}, this.state.nfcData, mifareRecord)});

                                generateSecureRandom(32).then(randomBytes => Buffer.from(randomBytes).toString('hex')).then(randomNumber => {

                                    console.log(`BLOCKCHAIN DATA AFTER GEN RANDOM: ${Date.now()}`);
                                    console.log(this.state.blockchainData)

                                    // Create short-hand names for block variables.
                                    var blockHash = this.state.blockchainData.blockHash;
                                    var blockTime = this.state.blockchainData.blockTime;
                                    console.log(`blockHash ${blockHash}`)

                                    // Create combined hash for input record.
                                    var combinedHash = crypto.createHash('sha256').update(
                                        '0x' + randomNumber + blockHash
                                    ).digest('hex');

                                    var completeMemory = nfc._structureNdefMessage(randomNumber, blockHash, combinedHash);

                                    // DEBUG: Print entire memory with registers and byte offsets.
                                    // for (i = 0; i < completeMemory.length; i ++ ) {
                                    //    console.log(`register: ${Math.floor(i / 4).toString(16)}, offset: ${i}, val: ${parseInt(completeMemory[i], 16)}`)
                                    // }

                                    // Create array with register numbers.
                                    var registers = [...Array(Math.ceil(completeMemory.length / 4)).keys()]

                                    // Remove registers that won't be written; The input record begins at register 0xB0.
                                    registers = registers.filter(register => register >= 0xB0);
                                    //console.log(registers)

                                    // Update state.
                                    this.setState({nfcData: Object.assign({}, this.state.nfcData, {
                                        nfcWrittenInputExternalRandomNumber: randomNumber,
                                        nfcWrittenInputBlockhash: blockHash,
                                        nfcWrittenInputCombinedHash: combinedHash
                                    })});

                                    console.log(`nfcData: ${this.state.nfcData}`)

                                    // Write.
                                    Promise.all(
                                        registers.map(i => {
                                            return NfcManager.sendMifareCommandIOS([0xa2]
                                                .concat(i)                      // Register number.
                                                .concat(completeMemory.slice(
                                                    i * 4,                      // Start position in payload.
                                                    (i + 1) * 4)                // End position in payload.
                                                )
                                            )
                                        })
                                    ).then(() => {

                                        //console.log(`going to msg`)
                                        NfcManager.setAlertMessageIOS(strings.textProcessingSendingChallengeIOS);

                                        // Read lastIcBlock to finish input.
                                        NfcManager.sendMifareCommandIOS([0x30, (this.state.nfcData.icBlockWithLastNdefRecord + 1) * 4 - 1]).then(() => {

                                        console.log(`READ END OF MEM CALLED: ${Date.now()}`);
                                            /***************************
                                            * Timeout for Calculation. *
                                            ***************************/

                                            helpers._delay(3000).then(() => {

                                                /****************
                                                * Read Results. *
                                                ****************/

                                                NfcManager.sendMifareCommandIOS([0x3A, 0x64, 0x84]).then((hashByteArray) => {

                                                NfcManager.setAlertMessageIOS(strings.textProcessingReadingResultsIOS);

                                                console.log(`READ HASH BYTE ARRAY CALLED: ${Date.now()}`);

                                                    NfcManager.sendMifareCommandIOS([0x3A, 0x84, 0xA4]).then((signatureByteArray) => {

                                                        console.log(`READ Signature CALLED: ${Date.now()}`);
                                                        console.log(helpers._bytesToHex(hashByteArray));
                                                        console.log(helpers._bytesToHex(signatureByteArray));

                                                        var mifareData = nfc._nfcMifareReadPayload(hashByteArray, signatureByteArray);

                                                        // Update state.
                                                        this.setState({nfcData: Object.assign({}, this.state.nfcData, mifareData)});

                                                        // DEBUG prints.
                                                        console.log(`NFC DATA AFTER RESULTS READ: ${Date.now()}`);

                                                        /*********************
                                                        * Confirmation Read. *
                                                        *********************/

                                                        NfcManager.sendMifareCommandIOS([0x30, (this.state.nfcData.icBlockWithLastNdefRecord + 1) * 4 - 1]).then(() => {

                                                            /****************
                                                            * Verification. *
                                                            ****************/

                                                            NfcManager.setAlertMessageIOS(strings.textProcessingPreparingResultsIOS);

                                                            console.log(`Starting verification (in ms): ${Date.now()}`)
                                                            this._goToScreen('atProcessing', strings.textProcessingVerificationStartIOS);
                                                            this._nfcStartFullVerification();

                                                        }).catch((err) => {this._goToNfcFailScreen('nfcFailReadLastNdef', err)})
                                                    }).catch((err) => {this._goToNfcFailScreen('nfcFailNfcReadSignatures', err)})
                                                }).catch((err) => {this._goToNfcFailScreen('nfcFailNfcReadHashes', err)})
                                            }).catch((err) => {this._goToNfcFailScreen('nfcFailTimeout', err)})
                                        }).catch((err) => {this._goToNfcFailScreen('nfcFailReadLastNdef', err)})

                                    }).catch((err) => {
                                        console.log(`error from write: ${err}`)
                                        this._goToNfcFailScreen('nfcFailWriteInput', err)
                                    })

                                }).catch((err) => {this._goToNfcFailScreen('nfcFailRng', err)})



                        }).catch((err) => {this._goToNfcFailScreen('nfcFailReadHashesWarning', err)})

                    }).catch((err) => {
                        this._goToNfcFailScreen('nfcFailReadConfigWarning', err)
                        NfcManager.cancelTechnologyRequest().catch(() => 0);
                        NfcManager.unregisterTagEvent().catch(() => 0); 
                    })

                });
            });            
        //})        

        }).catch((err) => {

            NfcManager.setAlertMessageIOS(strings.textProcessingPreparingResultsIOS);
            this._goToFailScreen(
                strings.textFailBlockchainGetLatestBlockAndRegistrationWarning,
                strings.textFailBlockchainGetLatestBlockAndRegistrationDescription + '\n(' + err + ')'
            );


        })

    },
    _nfcAndroidScan: async function() {

        // Close technology if it is still running.
        NfcManager.cancelTechnologyRequest().catch((err) => console.warn(err))

        // Start listening to new incoming events.
        if (this.state.fullVerification) {
            NfcManager.registerTagEvent().then(() => this._nfcAndroidProcessFullScan())
        } else {
            NfcManager.registerTagEvent().then(() => this._nfcAndroidProcessQuickScan())
        }    

    },
    _nfcAndroidProcessFullScan: async function() {

        /*********************
        * Start NFC Handler. *
        *********************/

        NfcManager.isSupported(NfcTech.NfcA).then(() => {

            console.log(`CHECK SUPPORT: ${Date.now()}`);

            NfcManager.requestTechnology(NfcTech.NfcA).then(() => {

                console.log(`TECH REQUEST: ${Date.now()}`);

                // Update view.
                this._goToScreen('atProcessing', strings.textProcessingStartAndroid);

                /******************
                * Check Tag Type. *
                ******************/

                NfcManager.transceive([0x3a, 0x11, 0x15]).then((ret) => {

                    console.log(`CHECKING TAG TYPE: ${Date.now()}`);

                    var validTag = (
                        JSON.stringify(ret.slice(2, -2)) == JSON.stringify([1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3])
                    );

                    // This should be removed once we have settled on an appropriate tag type check...
                    var validTag = true;

                    if (validTag) {

                        /******************************
                        * Get Configuration Register. *
                        ******************************/

                        NfcManager.transceive([0x30, 0xe8]).then((configBytes) => {

                            this.setState({nfcData: Object.assign({}, this.state.nfcData, {
                                icBlockWithLastNdefRecord: configBytes[1]
                            })});

                            /************
                            * Get Keys. *
                            ************/

                            NfcManager.transceive([0x3a, 0x15, 0x42]).then((ret) => {

                                let mifareRecord = nfc._nfcMifareParseRecord(ret);
                                this.setState({nfcData: Object.assign({}, this.state.nfcData, mifareRecord)});

                                this._fetchChainData('latestBlock').then(() => {

                                    generateSecureRandom(32).then(randomBytes => Buffer.from(randomBytes).toString('hex')).then(randomNumber => {

                                        // Create short-hand names for block variables.
                                        var blockHash = this.state.blockchainData.blockHash;
                                        var blockTime = this.state.blockchainData.blockTime;

                                        // Create combined hash for input record.
                                        var combinedHash = crypto.createHash('sha256').update(
                                            '0x' + randomNumber + blockHash
                                        ).digest('hex');

                                        var completeMemory = nfc._structureNdefMessage(randomNumber, blockHash, combinedHash);

                                        // Create array with register numbers.
                                        var registers = [...Array(Math.ceil(completeMemory.length / 4)).keys()]

                                        // Remove registers that won't be written; The input record begins at register 0xB0.
                                        registers = registers.filter(register => register >= 0xB0);

                                        // Update state.
                                        this.setState({nfcData: Object.assign({}, this.state.nfcData, {
                                            nfcWrittenInputExternalRandomNumber: randomNumber,
                                            nfcWrittenInputBlockhash: blockHash,
                                            nfcWrittenInputCombinedHash: combinedHash
                                        })});

                                        // Write.
                                        Promise.all(
                                            registers.map(i => {

                                                return NfcManager.transceive([0xa2]
                                                    .concat(i)                      // Register number.
                                                    .concat(completeMemory.slice(
                                                        i * 4,                      // Start position in payload.
                                                        (i + 1) * 4)                // End position in payload.
                                                    )
                                                );

                                            })

                                        ).then(() => {

                                            // Read lastIcBlock to finish input.
                                            NfcManager.transceive([0x30, (this.state.nfcData.icBlockWithLastNdefRecord + 1) * 4 - 1]).then(() => {

                                                /***************************
                                                * Timeout for Calculation. *
                                                ***************************/

                                                helpers._delay(2500).then(() => {

                                                    /****************
                                                    * Read Results. *
                                                    ****************/

                                                    NfcManager.transceive([0x3A, 0x64, 0x84]).then((hashByteArray) => {

                                                        NfcManager.transceive([0x3A, 0x84, 0xA4]).then((signatureByteArray) => {

                                                            var mifareData = nfc._nfcMifareReadPayload(hashByteArray, signatureByteArray);

                                                            // Update state.
                                                            this.setState({nfcData: Object.assign({}, this.state.nfcData, mifareData)});

                                                            /*********************
                                                            * Confirmation Read. *
                                                            *********************/

                                                            NfcManager.transceive([0x30, (this.state.nfcData.icBlockWithLastNdefRecord + 1) * 4 - 1]).then(() => {

                                                                /****************
                                                                * Verification. *
                                                                ****************/

                                                                console.log(`Starting verification (in ms): ${Date.now()}`)

                                                                this._goToScreen('atProcessing', strings.textProcessingVerificationStartAndroid);
                                                                this._nfcStartFullVerification();

                                                            }).catch((err) => {this._goToNfcFailScreen('nfcFailReadLastNdef', err)})

                                                        }).catch((err) => {this._goToNfcFailScreen('nfcFailNfcReadSignatures', err)})

                                                    }).catch((err) => {this._goToNfcFailScreen('nfcFailNfcReadHashes', err)})

                                                }).catch((err) => {this._goToNfcFailScreen('nfcFailTimeout', err)})

                                            }).catch((err) => {this._goToNfcFailScreen('nfcFailReadLastNdef', err)})

                                        }).catch((err) => {this._goToNfcFailScreen('nfcFailWriteInput', err)})

                                    }).catch((err) => {this._goToNfcFailScreen('nfcFailRng', err)})

                                }).catch((err) => {

                                    this._goToFailScreen(
                                        strings.textFailBlockchainGetLatestBlockAndRegistrationWarning,
                                        strings.textFailBlockchainGetLatestBlockAndRegistrationDescription + '\n(' + err + ')');
                                    NfcManager.cancelTechnologyRequest();

                                })

                            }).catch((err) => {this._goToNfcFailScreen('nfcFailReadHashesWarning', err)})

                        }).catch((err) => {this._goToNfcFailScreen('nfcFailReadConfigWarning', err)})

                    } else {

                        this._goToFailScreen(strings.textFailUnknownTagTypeWarning, strings.textFailUnknownTagTypeDescription);
                        NfcManager.cancelTechnologyRequest();

                    }

                }).catch((err) => {

                    this._goToFailScreen(strings.textFailUnknownTagTypeWarning, strings.textFailUnknownTagTypeDescription + '\n(' + err + ')');
                    NfcManager.cancelTechnologyRequest();

                })

            }).catch((err) => {

                this._goToFailScreen(strings.textFailNfcTechRequestWarning, strings.textFailNfcTechRequestDescription + '\n(' + err + ')');
                NfcManager.cancelTechnologyRequest();

            })

        }).catch((err) => {

            this._goToFailScreen(strings.textFailNfcSupportWarning, strings.textFailNfcSupportDescription + '\n(' + err + ')');
            NfcManager.cancelTechnologyRequest();

        })

    },
    _nfcStartFullVerification: async function() {

        /******************************************
        * Check Registration and Begin Challenge. *
        ******************************************/

        var localDevice = helpers._getLocalDevice('0x' + this.state.nfcData.nfcReadInfoPrimaryPublicKeyHash);
        var hardwareHash = null;

        var promises = [];

        if (localDevice) {
            hardwareHash = helpers._createHardwareHash('0x' + this.state.nfcData.nfcReadInfoPrimaryPublicKeyHash, '0x' + this.state.nfcData.nfcReadInfoSecondaryPublicKeyHash, localDevice['tertiaryPublicKeyHash'], '0x' + this.state.nfcData.nfcReadInfoHardwareSerialHash)

            var nfcData = Object.assign({}, this.state.nfcData, {
                hardwareHash: hardwareHash
            });
            this.setState((prevState) => ({nfcData})); 

            localDevice.hardwareSerial = this.state.nfcData.nfcReadInfoHardwareSerial;

            let chainDataVal = {
                proof: localDevice['proof'], 
                root: localDevice['root'], 
                hardwareHash: '0x' + hardwareHash, 
                kongAmount: '0x' + (localDevice['kongAmount']).toString(16),
                device: localDevice                                  
            }

            promises = [
                this._prefetchChainData('verifyDeviceProof', chainDataVal),
                this._prefetchChainData('verifyMinter', localDevice['entropyAddress'])
            ]
        } else {
            promises = [
                this._fetchChainData('contractRegistration', this.state.nfcData.nfcReadInfoPrimaryPublicKeyHash) 
            ]
        }

        Promise.all(
            promises
        ).then(() => {
            if (this.state.blockchainData.verifiedProof == true) {

                if (Platform.OS == 'android') {
                    NfcManager.transceive([0x3A, 0xAC, 0xAF]).then((stateBytes) => {
                        var debugCode = helpers._hexToAscii(helpers._bytesToHex(stateBytes));
                        var nfcData = Object.assign({}, this.state.nfcData, {
                            debugCode: debugCode
                        });
                        this.setState((prevState) => ({nfcData}));     
                    }).catch((err) => {
                        console.log(`error from transceive: ${err}`);
                    })

                    NfcManager.cancelTechnologyRequest().catch((err) => {console.log('Could not close NFC technology: ' + err)});

                    this._fetchChainData('contractCode', this.state.blockchainData.contractVerifierAddress).then(() => {
                        // TODO: fetch against server to see if there is any registered content
                        this._getBridgeData(this.state.nfcData.nfcReadInfoPrimaryPublicKey).then(() => {
                            this._verifyMerkleProof();                            
                        })
                    })                
                    .catch((err) => {
                        this._goToFailScreen(strings.textFailBlockchainGetStateAndCodeWarning, strings.textFailBlockchainGetStateAndCodeDescription + '\n(' + err + ')');
                    })
                } else {
                    NfcManager.sendMifareCommandIOS([0x3A, 0xAC, 0xAF]).then((stateBytes) => {
                        var debugCode = helpers._hexToAscii(helpers._bytesToHex(stateBytes));
                        var nfcData = Object.assign({}, this.state.nfcData, {
                            debugCode: debugCode
                        });
                        this.setState((prevState) => ({nfcData}));
                    }).catch((err) => {
                        console.log();
                    })

                    NfcManager.cancelTechnologyRequest().catch((err) => {console.log('Could not close NFC technology: ' + err)});

                    this._fetchChainData('contractCode', this.state.blockchainData.contractVerifierAddress).then(() => {
                        // TODO: fetch against server to see if there is any registered content
                        this._getBridgeData(this.state.nfcData.nfcReadInfoPrimaryPublicKey).then(() => {
                            this._verifyMerkleProof();                            
                        })
                    })                
                    .catch((err) => {
                        this._goToFailScreen(strings.textFailBlockchainGetStateAndCodeWarning, strings.textFailBlockchainGetStateAndCodeDescription + '\n(' + err + ')');
                    })
                }
                
            // NOTE: this covers the deprecated contract flow.
            } else if (this.state.blockchainData.contractRegistered == true) {
                Promise.all([
                    this._fetchChainData('escrowContractState'),
                    this._fetchChainData('contractCode', this.state.blockchainData.contractAddress)
                ]).then(() => {

                    Promise.all([
                        this._fetchChainData('ERC20Balance')
                        //this._fetchChainData('ERC20IncomingTransfer'),
                        //this._fetchChainData('ERC20OutgoingTransfer')
                    ]).then(() => {
                        // Attempt to get debug code.
                        if (Platform.OS == 'android') {
                            NfcManager.transceive([0x3A, 0xAC, 0xAF]).then((stateBytes) => {

                                var debugCode = helpers._hexToAscii(helpers._bytesToHex(stateBytes));
                                var nfcData = Object.assign({}, this.state.nfcData, {
                                    debugCode: debugCode
                                });
                                this.setState((prevState) => ({nfcData}));
                            }).catch((err) => {
                                console.log(`error from transceive: ${err}`)
                            })

                            console.log('Beginning ios verification.');
                            this._verifyEscrow();
                        } else {
                            NfcManager.sendMifareCommandIOS([0x3A, 0xAC, 0xAF]).then((stateBytes) => {
                                var debugCode = helpers._hexToAscii(helpers._bytesToHex(stateBytes));
                                var nfcData = Object.assign({}, this.state.nfcData, {
                                    debugCode: debugCode
                                });
                                this.setState((prevState) => ({nfcData}));
                            }).catch((err) => {
                                console.log(`error from transceive: ${err}`)
                            })

                            NfcManager.cancelTechnologyRequest().catch((err) => {console.log('Could not close NFC technology: ' + err)});
                            console.log('Beginning ios verification.');
                            this._verifyEscrow();
                        }
                    })
                    .catch((err) => {
                        this._goToFailScreen(strings.textFailBlockchainGetERC20DataWarning, strings.textFailBlockchainGetERC20DataDescription + '\n(' + err + ')');
                        NfcManager.cancelTechnologyRequest().catch((err) => {console.log('Could not close NFC technology: ' + err)});
                    })
                })
                .catch((err) => {
                    this._goToFailScreen(strings.textFailBlockchainGetStateAndCodeWarning, strings.textFailBlockchainGetStateAndCodeDescription + '\n(' + err + ')');
                    NfcManager.cancelTechnologyRequest().catch((err) => {console.log('Could not close NFC technology: ' + err)});
                })

            } else {

                if (Platform.OS == 'ios') {

                    NfcManager.sendMifareCommandIOS([0x3A, 0xAC, 0xAF]).then((stateBytes) => {
                        debugCode = helpers._hexToAscii(helpers._bytesToHex(stateBytes));
                        var nfcData = Object.assign({}, this.state.nfcData, {
                            debugCode: debugCode
                        });
                        this.setState((prevState) => ({nfcData}));

                        NfcManager.cancelTechnologyRequest().catch((err) => {console.log('Could not close NFC technology: ' + err)});
                        this._verifyUnknownDevice();
                    }).catch((err) => {
                        NfcManager.cancelTechnologyRequest().catch((err) => {console.log('Could not close NFC technology: ' + err)});
                        this._verifyUnknownDevice();
                    })

                } else {

                    NfcManager.transceive([0x3A, 0xAC, 0xAF]).then((stateBytes) => {
                        debugCode = helpers._hexToAscii(helpers._bytesToHex(stateBytes));
                        var nfcData = Object.assign({}, this.state.nfcData, {
                            debugCode: debugCode
                        });
                        this.setState((prevState) => ({nfcData}));

                        this._verifyUnknownDevice();
                    }).catch((err) => {
                        // Commneting out because of simulated mode.
                        //this._goToFailScreen(
                            //'',
                            //'\n(' + err + ' / Could not get debug code / Unregistered device.)'
                        //);
                        //NfcManager.cancelTechnologyRequest().catch((err) => {console.log('Could not close NFC technology: ' + err)});
                        this._verifyUnknownDevice();
                    })

                }
            }            
        })

    },
    _nfcStartQuickVerification: async function() {

        if (this.state.blockchainData.verifiedProof == true) {

            Promise.all([
                this._fetchChainData('contractCode', this.state.blockchainData.contractVerifierAddress),
                this._getBridgeData(this.state.nfcData.nfcReadInfoPrimaryPublicKey)
            ]).then(() => {
                console.log(this.state.blockchainData.cid)
                this._verifyMerkleProof();
            })
            .catch((err) => {
                this._goToFailScreen(strings.textFailBlockchainGetStateAndCodeWarning, strings.textFailBlockchainGetStateAndCodeDescription + '\n(' + err + ')');
                NfcManager.cancelTechnologyRequest().catch((err) => {console.log('Could not close NFC technology: ' + err)});
            })
            
        // NOTE: this covers the deprecated contract flow.
        } else if (this.state.blockchainData.contractRegistered == true) {

            Promise.all([
                this._fetchChainData('escrowContractState'),
                this._fetchChainData('contractCode', this.state.blockchainData.contractAddress)
            ]).then(() => {

                Promise.all([
                    this._fetchChainData('ERC20Balance')
                    //this._fetchChainData('ERC20IncomingTransfer'),
                    //this._fetchChainData('ERC20OutgoingTransfer')
                ]).then(() => {
                    this._verifyEscrow();
                })
                .catch((err) => {
                    this._goToFailScreen(strings.textFailBlockchainGetERC20DataWarning, strings.textFailBlockchainGetERC20DataDescription + '\n(' + err + ')');
                    NfcManager.cancelTechnologyRequest().catch((err) => {console.log('Could not close NFC technology: ' + err)});
                })

            })
            .catch((err) => {
                this._goToFailScreen(strings.textFailBlockchainGetStateAndCodeWarning, strings.textFailBlockchainGetStateAndCodeDescription + '\n(' + err + ')');
                NfcManager.cancelTechnologyRequest().catch((err) => {console.log('Could not close NFC technology: ' + err)});
            })

        } else {
            this._verifyUnknownDevice();
        }

    },    
    _goToNfcSetting: function() {

        NfcManager.goToNfcSetting()
        .then(result => {
            console.log('goToNfcSetting OK', result)
        })
        .catch(err => {
            console.warn('goToNfcSetting fail', err)
        })

    },
    _goToNfcFailScreen: function(failType, err) {

        NfcManager.setAlertMessageIOS(strings.textProcessingPreparingResultsIOS);

        // TODO: catch actual NFC error message from system, notable in timeouit

        if (failType == 'nfcFailReadLastNdef') {
            var warning = strings.textFailNfcReadLastNdefWarning;
            var description = strings.textFailNfcReadLastNdefDescription;
        } else if (failType == 'nfcFailReadInfo') {
            var warning = strings.textFailNfcReadInfoWarning;
            var description = strings.textFailNfcReadInfoDescription;
        } else if (failType == 'nfcFailReadSignatures') {
            var warning = strings.textFailNfcReadSignaturesWarning;
            var description = strings.textFailNfcReadSignaturesDescription;
        } else if (failType == 'nfcFailReadHashes') {
            var warning = strings.textFailNfcReadHashesWarning;
            var description = strings.textFailNfcReadHashesDescription;
        } else if (failType = 'nfcFailTimeout') {
            var warning = strings.textFailTimeoutWarning;
            var description = strings.textFailTimeoutDescription;
        } else if (failType == 'nfcFailReadLastNdef') {
            var warning = strings.textFailNfcReadLastNdefWarning;
            var description = strings.textFailNfcReadLastNdefDescription;
        } else if (failType == 'nfcFailWriteInput') {
            var warning = strings.textFailNfcWriteInputWarning;
            var description = strings.textFailNfcWriteInputDescription;
        } else if (failTye == 'nfcFailRng') {
            var warning = strings.textFailRngWarning;
            var description = strings.textFailRngDescription;
        }

        // Print out current state.
        // console.log('Fail state:');
        // console.log(this.state);
        // for (i = 0; i <= this.state.length; i ++) {
        //     console.log(this.state[i]);
        // }

        // Set prev error so we pass along
        var passedErr = err

        if (Platform.OS == 'ios' && this.state.fullVerification) {
            NfcManager.sendMifareCommandIOS([0x3A, 0xAC, 0xAF]).then((stateBytes) => {

                debugCode = helpers._hexToAscii(helpers._bytesToHex(stateBytes));
                console.warn(debugCode);
                this._goToFailScreen(
                    warning,
                    description + '\n\n(System: ' + err + ' /' + debugCode + ')'
                );
                NfcManager.cancelTechnologyRequest().catch((err) => {console.log('Could not cancel NFC request: ' + err)});

            }).catch((err) => {


                err = passedErr

                this._goToFailScreen(
                    warning,
                    description + '\n\n(System: ' + err + ' / Could not get debug code)'
                );
                NfcManager.cancelTechnologyRequest().catch((err) => {console.log('Could not cancel NFC request: ' + err)});

            })
        } else if (Platform.OS == 'ios') {

            debugCode = helpers._hexToAscii(helpers._bytesToHex(stateBytes));
            console.warn(debugCode);
            this._goToFailScreen(
                warning,
                description + '\n\n(System: ' + err + ' /' + debugCode + ')'
            );
            NfcManager.cancelTechnologyRequest().catch((err) => {console.log('Could not cancel NFC request: ' + err)});

        } else if (Platform.OS == 'android') {
            NfcManager.transceive([0x3A, 0xAC, 0xAF]).then((stateBytes) => {

                debugCode = helpers._hexToAscii(helpers._bytesToHex(stateBytes));
                console.warn(debugCode);
                this._goToFailScreen(
                    warning,
                    description + '\n\n(System: ' + err + ' /' + debugCode + ')'
                );
                NfcManager.cancelTechnologyRequest().catch((err) => {console.log('Could not close NFC technology: ' + err)});

            }).catch((err) => {

                this._goToFailScreen(
                    warning,
                    description + '\n\n(System: ' + err + ' / Could not get debug code)'
                );
                NfcManager.cancelTechnologyRequest().catch((err) => {console.log('Could not close NFC technology: ' + err)});

            })            
        }


    }
}

export default nfc;
