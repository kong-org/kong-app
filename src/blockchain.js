var crypto = require('crypto');

import MMKVStorage from "react-native-mmkv-storage";

// Load ethers.js
import "@ethersproject/shims"

// Import the ethers library
import { ethers } from "ethers";

import helpers from './helpers.js';
import hashedInterfaces from '../assets/data/hashedInterfaces.json';
import registerMerkleRootABI from '../assets/data/RegisterMerkleRootABI.json';
import kongEntropyMerkle from '../assets/data/KongEntropyMerkle.json';
import kongERC20ABI from '../assets/data/KongERC20ABI.json';
import knownValues from '../assets/data/knownValues.js';
knownTokens = knownValues['knownTokens'];
knownHardwareModels = knownValues['knownHardwareModels'];
knownContractVersions = knownValues['knownContractVersions'];
knownHardwareManufacturers = knownValues['knownHardwareManufacturers'];

// Import text.
import strings from '../assets/text/strings.js';

const MMKV = new MMKVStorage.Loader().initialize();

const blockchain = {

    _loadContracts: async function() {
        console.log(`ethNode is ${this.state.chainSettings.ethNode}`)
        provider = new ethers.providers.JsonRpcProvider(this.state.chainSettings.ethNode);
        registerMerkleRootContract = new ethers.Contract(this.state.chainSettings.registerAddress, registerMerkleRootABI["abi"], provider);
 
        var chainSettings = Object.assign({}, this.state.chainSettings, {
            provider: provider,
            registerMerkleRootContract: registerMerkleRootContract,
            oldRegisterAddress: '0x41a81c92F019EbB05D3365A0E7b56D868eD2318e'
        });
        console.log(`_loadContracts: ${chainSettings.registerMerkleRootContract}`)

        this.setState((prevState) => ({chainSettings}));
    },
    _getBridgeData: async function(publicKey) {

        var pub = {
            x: publicKey.slice(0, publicKey.length/2),
            y: publicKey.slice(publicKey.length/2)
        };

        // TODO: move to strings
        await fetch(`${this.state.chainSettings.bridgeNode}/device?x=${pub.x}&y=${pub.y}`)
            .then(response => response.json())
            .then(data => {

                var blockchainData = Object.assign({}, this.state.blockchainData, {
                    cid: data.cid,
                    name: data.name,
                    description: data.description,
                    contractAddress: data.contractAddress
                });

                this.setState((prevState) => ({blockchainData}));
            });

    },
    _prefetchChainData: async function(chainDataType, chainDataVal = '0') {
        switch(chainDataType) {
            case 'getDeviceRootCount':

                console.log('getDeviceRootCount called')

                var deviceRootCount = 0;

                await this.state.chainSettings.registerMerkleRootContract._deviceRootCount().then((result) => {
                    deviceRootCount = parseInt(result);
                }, (error) => {
                    console.log(`error from getDeviceRootCount: ${error}`)
                })

                return deviceRootCount;

                break;
            case 'getDeviceProofs':

                var deviceRootCount = 0;

                await this.state.chainSettings.registerMerkleRootContract._deviceRootCount().then((result) => {
                    deviceRootCount = parseInt(result);
                    console.log("root count")
                    console.log(deviceRootCount)

                    MMKV.setInt("deviceRootCount", deviceRootCount);
                }, (error) => {
                    console.log(`error from getDeviceProofs: ${error}`)
                })

                // We start at index 1 for device roots.
                for (i = 1; i <= deviceRootCount; i++) {

                    // Get merkle root details by index.
                    var deviceRoot = await this.state.chainSettings.registerMerkleRootContract.getRootByIndex(i);

                    // Ignore non-existant roots.
                    if (deviceRoot != "0x0000000000000000000000000000000000000000000000000000000000000000") {

                        var deviceRootDetails = await this.state.chainSettings.registerMerkleRootContract.getRootDetails(deviceRoot);
                        console.log(deviceRootDetails[4])

                        await MMKV.setMapAsync(deviceRoot, deviceRootDetails);

                        console.log(`${this.state.chainSettings.ipfsNode}/${deviceRootDetails[4]}`)

                        // Get IPFS file with proofs.
                        let response = await fetch(
                          `${this.state.chainSettings.ipfsNode}/${deviceRootDetails[4]}`
                        );
                        let json = await response.json();

                        console.log(`json loaded for root`)
                        for (device in json['devices']) {
                            let d = json['devices'][device];
                            if (json['devices'][device]['primaryPublicKeyHash']) {
                                let deviceDetails = {
                                    root: deviceRoot,
                                    kongAmount:             parseInt(deviceRootDetails[0]),
                                    contractAddress:        d.contractAddress,
                                    entropyAddress:         json['tree']['entropyAddress'],
                                    proof:                  d.proof,
                                    secondaryPublicKeyHash: d.secondaryPublicKeyHash,
                                    tertiaryPublicKeyHash:  d.tertiaryPublicKeyHash,
                                    hardwareManufacturer:   d.hardwareManufacturer,
                                    hardwareModel:          d.hardwareModel,
                                    hardwareConfig:         d.hardwareConfig
                                }
                                // Store device proofs.
                                MMKV.setMapAsync(d.primaryPublicKeyHash, deviceDetails);                                
                            } 
                        }
                    }

                    // We set the deviceRootCount incrementally as we need to deal with flaky nodes that error out.
                    MMKV.setInt("deviceRootCount", i);
                    if (deviceRootCount == i) {
                        this.setState({
                            _resetButtonText: `${strings.textSettingsReset}`
                        }); 
                    } else {
                        this.setState({
                            _resetButtonText: `${strings.textSettingsResetProgress} ${i}/${deviceRootCount}...`,
                            _launchStatus: `${strings.textLaunchProgress} ${i}/${deviceRootCount}...`,
                        });                        
                    }

                    console.log(`internal root count now: ${i}`)

                }

                break;
            case 'verifyDeviceProof':
                console.log(`verifyDeviceProof called with ${chainDataVal['root']} and ${chainDataVal['hardwareHash']}`)
                
                var contractERC20Address = '0x0000000000000000000000000000000000000000';
                var verifyDeviceProof = false;
                var deviceRootDetails = null;
                var isDeviceMintable = false;
                var contractAddress = '0x0000000000000000000000000000000000000000';

                await this.state.chainSettings.registerMerkleRootContract._kongERC20Address().then((result) => {
                    contractERC20Address = result;
                }, (error) => {
                    console.log(`unable to verify ERC20 address`) // TODO: offline verify?
                });

                await this.state.chainSettings.registerMerkleRootContract.getRootDetails(chainDataVal['root']).then((result) => {
                    deviceRootDetails = result;
                }, (error => {
                    console.log(`unable to get root details`)
                }));

                await this.state.chainSettings.registerMerkleRootContract.verifyProof(chainDataVal['proof'], chainDataVal['root'], chainDataVal['hardwareHash'], chainDataVal['kongAmount']).then((result) => {
                    verifyDeviceProof = true;
                }, (error) => {
                    console.log(`unable to verifyProof`) // TODO: offline verify?
                });

                await this.state.chainSettings.registerMerkleRootContract.isDeviceMintable(chainDataVal['hardwareHash']).then((result) => {
                    isDeviceMintable = result;
                }, (error) => {
                    console.log(`unable to get device mintable details`)
                });
                
                await this.state.chainSettings.registerMerkleRootContract.getDeviceAddress(chainDataVal['hardwareHash']).then((result) => {
                    contractAddress = result;
                }, (error) => {
                    console.log(`unable to get contract address`)
                });

                // Set up token.
                var tokenSymbol = knownTokens[contractERC20Address] ? knownTokens[contractERC20Address].symbol : '-';
                var tokenName = knownTokens[contractERC20Address] ? knownTokens[contractERC20Address].name : 'Unknown Token';

                // Set up ERC20 balance.
                var unscaledERC20Balance = 0;
                var contractReleaseTimestamp = 0;

                if(deviceRootDetails) {
                    unscaledERC20Balance = parseInt(deviceRootDetails[0]);
                    contractReleaseTimestamp = parseInt(deviceRootDetails[3]);                    
                }

                var decimals = null;

                if (knownTokens[contractERC20Address]) {
                    decimals = knownTokens[contractERC20Address].decimals;
                }

                if (decimals) {
                    var scaledERC20Balance = unscaledERC20Balance / (10 ** decimals);
                } else {
                    var scaledERC20Balance = unscaledERC20Balance;
                }

                // Get machine-readable version of hardware info.
                var hardwareManufacturer = knownHardwareManufacturers[chainDataVal.device.hardwareManufacturer] ? knownHardwareManufacturers[chainDataVal.device.hardwareManufacturer]: 'Unknown hardware manufacturer.';
                var hardwareModel = knownHardwareModels[chainDataVal.device.hardwareModel] ? knownHardwareModels[chainDataVal.device.hardwareModel]: 'Unknown hardware model.';

                var blockchainData = Object.assign({}, this.state.blockchainData, {
                    verifiedProof: verifyDeviceProof,
                    contractAddress: contractAddress,
                    contractERC20Address: contractERC20Address,
                    tokenSymbol: tokenSymbol,
                    tokenName: tokenName,
                    hardwareManufacturer: hardwareManufacturer,
                    hardwareModel: hardwareModel,
                    hardwareSerial: chainDataVal.device.hardwareSerial,
                    hardwareConfig: chainDataVal.device.hardwareConfig,
                    unscaledERC20Balance: unscaledERC20Balance,
                    scaledERC20Balance: scaledERC20Balance,
                    registeredMintable: isDeviceMintable,
                    contractReleaseTimestamp: contractReleaseTimestamp
                });

                console.log(`BLOCKCHAIN DATA AFTER VERIFY PROOF: ${Date.now()}`);

                this.setState((prevState) => ({blockchainData}));


                break;
            case 'verifyMinter':
                console.log(`verifyMinter called with ${chainDataVal}`)

                var entropyContractIsMinter = null;

                await this.state.chainSettings.registerMerkleRootContract._minters(chainDataVal).then((result) => {
                    entropyContractIsMinter = result;
                }, (error) => {
                    console.log(`no entropyContract found.`)
                });


                const entropyContract = new ethers.Contract(chainDataVal, kongEntropyMerkle["abi"], this.state.chainSettings.provider);
                var eccAddress = '0x0000000000000000000000000000000000000000'

                await entropyContract._eccAddress().then((result) => {
                    eccAddress = result;
                }, (error) => {
                    console.log(`ecc address cannot be verified`)
                });
                // var entropyContractIsMinterBool = (entropyContractIsMinter == "true")

                var blockchainData = Object.assign({}, this.state.blockchainData, {
                    entropyContractIsMinter: entropyContractIsMinter,
                    contractVerifierAddress: eccAddress,
                    contractEntropyAddress: chainDataVal
                });

                console.log(`BLOCKCHAIN DATA AFTER VERIFY MINTER: ${Date.now()}`);

                this.setState((prevState) => ({blockchainData}));

                break;

            case 'latestBlock':
                console.log(`latestBlock async called`)

                var latestBlock = await this.state.chainSettings.provider.getBlockNumber();
                var blockDetails = await this.state.chainSettings.provider.getBlock(latestBlock);
                console.log(latestBlock)

                var blockHash = blockDetails.hash.slice(2);
                var blockTime = parseInt(blockDetails.timestamp, 16);

                console.log(`blockHash from lib ${blockHash}`)
                var blockchainData = Object.assign({}, this.state.blockchainData, {
                    blockHash: blockHash,
                    blockTime: blockTime
                });
                this.setState((prevState) => ({blockchainData}));

                break;                
            default:
                break;
        }
    },
    _fetchChainData: function(chainDataType, chainDataVal = '0') {
        switch(chainDataType) {
               
            case 'contractRegistration':

                return fetch(
                    this.state.chainSettings.ethNode,
                    {
                        method: 'POST',
                        headers: {Accept: 'application/json', 'Content-Type': 'application/json'},
                        body: JSON.stringify({
                            jsonrpc: '2.0',
                            method: 'eth_call',
                            params: [{
                                to: this.state.chainSettings.oldRegisterAddress, // TODO: replace this this a variable that gets returned
                                data: hashedInterfaces.registerDevice.getRegistrationDetails + (chainDataVal.length == 66 ? chainDataVal.slice(2) : chainDataVal)
                            }, "latest"],
                            id: 1
                        })
                    }
                )
                .then((response) => response.json())
                .then((responseJson) => {

                    // Only parse non-zero results.
                    if (responseJson.result == '0x' || parseInt(responseJson.result, 16) == 0 || responseJson.result == undefined) {

                        var blockchainData = Object.assign({}, this.state.blockchainData, {
                            contractRegistered: false
                        });

                    } else {

                        console.log(`responseJSON ${responseJson.result}`)

                        // Parse keys.
                        var contractSecondaryPublicKeyHash = '0x' + responseJson.result.slice(2, 66);
                        var contractTertiaryPublicKeyHash = '0x' + responseJson.result.slice(66, 130);

                        // Parse contract address
                        var contractAddress = '0x' + responseJson.result.slice(154, 194); // Skipping the leading 0s.

                        // Parse hardware info.
                        var hardwareManufacturer = '0x' + responseJson.result.slice(194, 258);
                        var hardwareModel = '0x' + responseJson.result.slice(258, 322);
                        var hardwareSerial = '0x' + responseJson.result.slice(322, 386);
                        var hardwareConfig = '0x' + responseJson.result.slice(386, 450);

                        // Get machine-readable version of hardware info.
                        hardwareManufacturer = knownHardwareManufacturers[hardwareManufacturer] ? knownHardwareManufacturers[hardwareManufacturer]: 'Unknown hardware manufacturer.';
                        hardwareModel = knownHardwareModels[hardwareModel] ? knownHardwareModels[hardwareModel]: 'Unknown hardware model.';

                        // Parse token amount.
                        var expectedUnscaledERC20Balance = parseInt('0x' + responseJson.result.slice(450, 514));
                        var registeredMintable = '0x' + responseJson.result.slice(514, 578);

                        // Update state.
                        var blockchainData = Object.assign({}, this.state.blockchainData, {
                            contractSecondaryPublicKeyHash: contractSecondaryPublicKeyHash,
                            contractAddress: contractAddress,
                            hardwareManufacturer: hardwareManufacturer,
                            hardwareModel: hardwareModel,
                            hardwareSerial: hardwareSerial,
                            hardwareConfig: hardwareConfig,
                            contractRegistered: true,
                            expectedUnscaledERC20Balance: expectedUnscaledERC20Balance,
                            registeredMintable: registeredMintable
                        });

                    }

                    console.log(`BLOCKCHAIN DATA AFTER REGISTRATION CHECK: ${Date.now()}`);
                    console.log(blockchainData);

                    this.setState((prevState) => ({blockchainData}));

                })            
                break;
            case 'escrowContractState':
                return fetch(
                    this.state.chainSettings.ethNode,
                    {
                        method: 'POST',
                        headers: {Accept: 'application/json', 'Content-Type': 'application/json'},
                        body: JSON.stringify({
                            jsonrpc: '2.0',
                            method: 'eth_call',
                            params: [{
                                to: this.state.blockchainData.contractAddress,
                                data: hashedInterfaces.getContractState
                            }, "latest"],
                            id: 1
                        })
                    }
                )
                .then(response => response.json())
                .then(responseJson => {

                    // Get registered token address.
                    var contractERC20Address = ('0x' + responseJson.result.slice(282, 322));

                    // Get token information.
                    var tokenSymbol = knownTokens[contractERC20Address] ? knownTokens[contractERC20Address].symbol : '-';
                    var tokenName = knownTokens[contractERC20Address] ? knownTokens[contractERC20Address].name : 'Unknown Token';

                    // Adjust state.
                    var newData = {
                        contractPublicKeyX: responseJson.result.slice(0, 66),
                        contractPublicKeyY: '0x' + responseJson.result.slice(66, 130),
                        contractVerifierAddress: '0x' + responseJson.result.slice(154, 194),
                        contractReleaseTimestamp: parseInt(responseJson.result.slice(194, 258), 16),
                        contractERC20Address: contractERC20Address,
                        tokenSymbol: tokenSymbol,
                        tokenName: tokenName,

                        contractState: true
                    };
                    var blockchainData = Object.assign({}, this.state.blockchainData, newData);
                    this.setState((prevState) => ({blockchainData}));

                    console.log('NEW BLOCKCHAIN DATA FROM STATE CHECK');
                    // console.log(newData);

                })            
                break;
            case 'contractCode':
                return fetch(
                    this.state.chainSettings.ethNode,
                    {
                        method: 'POST',
                        headers: {Accept: 'application/json', 'Content-Type': 'application/json'},
                        body: JSON.stringify({
                            jsonrpc: '2.0',
                            method: 'eth_getCode',
                            params: [chainDataVal, "latest"],
                            id: 1
                        })
                    }
                )
                .then(response => response.json())
                .then(responseJson => {

                    // Get version info as hash of code.
                    var contractVersion = '0x' + crypto.createHash('sha256').update(responseJson.result.slice(2), 'hex').digest('hex');
                    console.log(`contractVersion: ${contractVersion}`)
                    // Get version information.
                    var contractType = knownContractVersions[contractVersion].type ? knownContractVersions[contractVersion].type: 'Unknown Contract Type';

                    var newData = {
                        contractCode: responseJson.result,
                        contractVersion: contractVersion,
                        contractType: contractType
                    };

                    // Update state.
                    var blockchainData = Object.assign({}, this.state.blockchainData, newData);
                    this.setState((prevState) => ({blockchainData}));

                    console.log('NEW BLOCKCHAIN DATA FROM CODE CHECK');
                    // console.log(newData);

                })            
                break;
            case 'ERC20Balance':
                return fetch(
                    this.state.chainSettings.ethNode,
                    {
                        method: 'POST',
                        headers: {Accept: 'application/json', 'Content-Type': 'application/json'},
                        body: JSON.stringify({
                            jsonrpc: '2.0',
                            method: 'eth_call',
                            params: [{
                                to: this.state.blockchainData.contractERC20Address,
                                data: hashedInterfaces.balanceOf + '0'.repeat(24) + this.state.blockchainData.contractAddress.slice(2)
                            }, "latest"],
                            id: 1
                        })
                    }
                )
                .then(response => response.json())
                .then(responseJson => {

                    var unscaledERC20Balance = parseInt(responseJson.result, 16);
                    var decimals = knownTokens[this.state.blockchainData.contractERC20Address].decimals;

                    if (decimals) {
                        var scaledERC20Balance = unscaledERC20Balance / (10 ** decimals);
                    } else {
                        var scaledERC20Balance = unscaledERC20Balance;
                    }

                    var newData = {
                        unscaledERC20Balance: unscaledERC20Balance,
                        scaledERC20Balance: scaledERC20Balance
                    };

                    var blockchainData = Object.assign({}, this.state.blockchainData, newData);
                    this.setState((prevState) => ({blockchainData}));

                    console.log('NEW DATA FROM BALANCE CHECK');
                    console.log(newData);

                })            
                break;
            case 'ERC20IncomingTransfer':
                console.log('GETTING INCOMING TRANSFERS');

                return fetch(
                    this.state.chainSettings.ethNode,
                    {
                        method: 'POST',
                        headers: {Accept: 'application/json', 'Content-Type': 'application/json'},
                        body: JSON.stringify({
                            jsonrpc: '2.0',
                            method: 'eth_getLogs',
                            params: [{
                                'fromBlock': 'earliest',
                                'toBlock': 'latest',
                                'address': this.state.blockchainData.contractERC20Address,
                                'topics': [
                                    hashedInterfaces.erc20Transfer,
                                    null,
                                    '0x' + '0'.repeat(24) + this.state.blockchainData.contractAddress.slice(2)
                                ]
                            }],
                            id: 1
                        })
                    }

                )
                .then(response => response.json())
                .then(responseJson => {

                    console.log('INCOMING TRANSFERS');
                    console.log(responseJson);

                    var blockchainData = Object.assign({}, this.state.blockchainData, {ERC20IncomingTransfer: responseJson.result.length == 1});
                    this.setState((prevState) => ({blockchainData}));

                })            
                break;
            case 'ERC20OutgoingTransfer':
                console.log('GETTING OUTGOING TRANSFERS');

                return fetch(
                    this.state.chainSettings.ethNode,
                    {
                        method: 'POST',
                        headers: {Accept: 'application/json', 'Content-Type': 'application/json'},
                        body: JSON.stringify({
                            jsonrpc: '2.0',
                            method: 'eth_getLogs',
                            params: [{
                                'fromBlock': 'earliest',
                                'toBlock': 'latest',
                                'address': this.state.blockchainData.contractERC20Address,
                                'topics': [
                                    hashedInterfaces.erc20Transfer,
                                    '0x000000000000000000000000' + this.state.blockchainData.contractAddress.slice(2),
                                    null
                                ]
                            }],
                            id: 1
                        })
                    }

                )
                .then(response => response.json())
                .then(responseJson => {

                    console.log('OUTGOING TRANSFERS');
                    console.log(responseJson);

                    var blockchainData = Object.assign({}, this.state.blockchainData, {ERC20OutgoingTransfer: responseJson.result.length == 1});
                    this.setState((prevState) => ({blockchainData}));

                })            
                break;
            case 'latestBlock':
                console.log(`get latestBlock`)
                return fetch(
                    this.state.chainSettings.ethNode,
                    {
                        method: 'POST',
                        headers: {Accept: 'application/json', 'Content-Type': 'application/json'},
                        body: JSON.stringify({
                            jsonrpc: '2.0',
                            method: 'eth_getBlockByNumber',
                            params: [
                                'latest',
                                true
                            ],
                            id: 1
                        })
                    }
                )
                .then(response => response.json())
                .then(responseJson => {

                    var blockHash = responseJson.result.hash.slice(2);
                    var blockTime = parseInt(responseJson.result.timestamp, 16);

                    console.log(`blockHash ${blockHash}`)
                    var blockchainData = Object.assign({}, this.state.blockchainData, {
                        blockHash: blockHash,
                        blockTime: blockTime
                    });
                    this.setState((prevState) => ({blockchainData}));

                })            
                break;
            case 'blockByHash':
                var blockHash = '0x' + chainDataVal;
                console.log(`blockByHash called`)
                return fetch(
                    this.state.chainSettings.ethNode,
                    {
                        method: 'POST',
                        headers: {Accept: 'application/json', 'Content-Type': 'application/json'},
                        body: JSON.stringify({
                            jsonrpc: '2.0',
                            method: 'eth_getBlockByHash',
                            params: [
                                blockHash,
                                true
                            ],
                            id: 1
                        })
                    }
                )
                .then(response => response.json())
                .then(responseJson => {
                    console.log(`blockByHash response`)
                    let blockchainData = Object.assign({}, this.state.blockchainData, {
                        signedBlockTime: responseJson.result == null ? null : parseInt(responseJson.result.timestamp, 16),
                        signedBlockValid: responseJson.result != null
                    });
                    this.setState((prevState) => ({blockchainData}));

                })
                break;
            default:
                console.log(`default case.`)
                break;

        }

    }

}

export default blockchain;
