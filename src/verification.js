
import helpers from './helpers.js';
import { Platform } from 'react-native';
import knownValues from '../assets/data/knownValues.js';
knownTokens = knownValues['knownTokens'];
knownContractVersions = knownValues['knownContractVersions'];

var crypto = require('crypto');


const verification = {

    _verifyEscrow: async function() {

        console.log(this.state.blockchainData);

        // Arrays for results.
        var verificationResults = [];

        /*****************************
         * Shorthand variable names. *
         ****************************/

        var tokenName = this.state.blockchainData.tokenName;
        var tokenSymbol = this.state.blockchainData.tokenSymbol;

        var contractCode = this.state.blockchainData.contractCode;
        var contractVersion = this.state.blockchainData.contractVersion;
        var contractType = this.state.blockchainData.contractType;
        var contractState = this.state.blockchainData.contractState;
        var contractRegistered = this.state.blockchainData.contractRegistered;
        var contractVerifierAddress = this.state.blockchainData.contractVerifierAddress;
        var contractReleaseTimestamp = this.state.blockchainData.contractReleaseTimestamp;

        var scaledERC20Balance = this.state.blockchainData.scaledERC20Balance;
        var unscaledERC20Balance = this.state.blockchainData.unscaledERC20Balance;
        var expectedUnscaledERC20Balance = this.state.blockchainData.expectedUnscaledERC20Balance;

        //var ERC20IncomingTransfer = this.state.blockchainData.ERC20IncomingTransfer;
        //var ERC20OutgoingTransfer = this.state.blockchainData.ERC20OutgoingTransfer;

        /**************************
         * Smart Contract Checks. *
         *************************/

        // Contract code.
        var versionInfo = knownContractVersions[contractVersion];
        var contractVersionCheck = versionInfo != undefined;

        verificationResults.push({
            key: 'contractVersionCheck',
            type: 'contracts',
            status: `${contractVersionCheck ? 'pass': 'fail'}`,
            descriptionShort: `Ownership contract ${contractVersionCheck ? 'verified': 'not verified'}.`
        });

        // Elliptic contract address.
        var ellipticCurveContractCheck = contractVerifierAddress.toUpperCase() == versionInfo.expectedECCAddress.toUpperCase();

        verificationResults.push({
            key: 'ellipticAddressCheck',
            type: 'contracts',
            status: `${ellipticCurveContractCheck ? 'pass': 'fail'}`,
            descriptionShort: `ECC contract ${ellipticCurveContractCheck ? 'verified': 'not verified'}.`
        });

        /******************************
         * Balance and timing checks. *
         *****************************/

        if ((expectedUnscaledERC20Balance <= unscaledERC20Balance) && (unscaledERC20Balance > 0)) {

            verificationResults.push({
                key: 'erc20BalanceCheck',
                type: 'value',
                status: 'pass',
                descriptionShort: `Token ownership verified.`
            });

        } else if (expectedUnscaledERC20Balance > unscaledERC20Balance) {

            var balanceCheck = false;
            verificationResults.push({
                key: 'erc20BalanceCheck',
                type: 'value',
                status: 'fail',
                descriptionShort: `Tokens owned too low ${unscaledERC20Balance} (exp. ${expectedUnscaledERC20Balance / (tokenName == 'Kong' ? (10 ** 18) : 1)}) ${tokenName}.`
            });

        } else if ((unscaledERC20Balance == 0)) {//&& (ERC20IncomingTransfer == false)) {

            var balanceCheck = false;
            verificationResults.push({
                key: 'erc20BalanceCheck',
                type: 'value',
                status: 'fail',
                descriptionShort: `Contract has not been charged with ${tokenName} tokens yet.`
            });

        }
//        else if ((unscaledERC20Balance == 0) && (ERC20IncomingTransfer == true) && (ERC20OutgoingTransfer == true)) {
//
//            var balanceCheck = false;
//            verificationResults.push({
//                key: 'erc20BalanceCheck',
//                type: 'value',
//                status: 'fail',
//                descriptionShort: `${tokenName} tokens have been claimed.`
//            });
//
//        }

        // Timing.
        var timeToUnlock = contractReleaseTimestamp - Math.floor(Date.now() / 1000);
        var contractIsLocked = contractReleaseTimestamp > Math.floor(Date.now() / 1000);
        var contractIsUnlocked = contractReleaseTimestamp <= Math.floor(Date.now() / 1000);

        // String date.
        var releaseTimeStamp = new Date(contractReleaseTimestamp * 1000);
        var releaseTimeStampFormatted = (releaseTimeStamp.getMonth() + 1) + '/' + releaseTimeStamp.getDate() + '/' + releaseTimeStamp.getFullYear();

        // Contract is locked.
        if ((timeToUnlock > 7 * 24 * 60 * 60) && contractIsLocked) {

            verificationResults.push({
                key: 'timeCheck',
                type: 'value',
                status: 'pass',
                descriptionShort: `Token lock verified.`
            });

        }

        // Contract is close to unlocking.
        if ((timeToUnlock <= 7 * 24 * 60 * 60) && (contractIsLocked)) {

            verificationResults.push({
                key: 'timeCheck',
                type: 'value',
                status: 'warning',
                descriptionShort: `Tokens become transferable on ${releaseTimeStampFormatted}.`
            });

        }

        // Contract is unlocked.
        if (contractIsUnlocked) {

            verificationResults.push({
                key: 'timeCheck',
                type: 'value',
                status: 'warning',
                descriptionShort: `Tokens are transferable.`
            });

        }

        /**************************
        * Hardware verification. *
        **************************/

        // External signature.
        var validExternalSignature = this._verifySignature(
            this.state.nfcData.nfcReadOutputCombinedHash,
            this.state.nfcData.nfcReadInfoPrimaryPublicKey,
            this.state.nfcData.nfcReadOutputExternalSignature
        );

        // Internal signature.
        var validInternalSignature = this._verifyInternalSignature(
            this.state.nfcData.nfcReadOutputInternalRandomNumber,
            this.state.nfcData.nfcReadOutputExternalRandomNumber,
            this.state.nfcData.nfcReadInfoSecondaryPublicKey,
            this.state.nfcData.nfcReadOutputInternalSignature
        );

        if (this.state.blockchainData.signedBlockValid) {
            var signedBlockDate = new Date(this.state.blockchainData.signedBlockTime * 1000);
            var signedBlockDateFormatted = signedBlockDate.toLocaleDateString("en-US");
            console.log(`GOT BLOCK DATE: ${signedBlockDate} formatted ${signedBlockDateFormatted}`);
        };

        if (this.state.fullVerification) {
            console.log(`full verify`)
            var inputOutputCheck = (
                (this.state.nfcData.nfcReadOutputExternalRandomNumber == this.state.nfcData.nfcWrittenInputExternalRandomNumber) &&
                (this.state.nfcData.nfcReadOutputBlockhash == this.state.nfcData.nfcWrittenInputBlockhash) &&
                (this.state.nfcData.nfcReadOutputCombinedHash == this.state.nfcData.nfcWrittenInputCombinedHash)
            );



            console.log(`read in/out strings`)
            console.log(this.state.nfcData.nfcReadOutputExternalRandomNumber)
            console.log(this.state.nfcData.nfcWrittenInputExternalRandomNumber)
            console.log(this.state.nfcData.nfcReadOutputBlockhash)
            console.log(this.state.nfcData.nfcWrittenInputBlockhash)
            console.log(this.state.nfcData.nfcReadOutputCombinedHash)
            console.log(this.state.nfcData.nfcWrittenInputCombinedHash)
            
            verificationResults.push({
                key: 'challenge_integrity',
                type: 'hardware',
                status: inputOutputCheck ? 'pass' : 'fail',
                descriptionShort: inputOutputCheck ? `Challenge input verified.` : 'Challenge input != output.'
            });

            // TODO: adapt to full quick verifiy
            verificationResults.push({
                key: 'external_signature',
                type: 'hardware',
                status: validExternalSignature ? 'pass' : 'fail',
                descriptionShort: validExternalSignature ? `Valid external signature.` : 'Invalid external signature.'
            });

            verificationResults.push({
                key: 'internal_signature',
                type: 'hardware',
                status: validInternalSignature ? 'pass' : 'fail',
                descriptionShort: validInternalSignature ? `Valid internal signature.` : 'Invalid internal signature.'
            });

        } else {
            console.log(`partial verify`)

            var inputOutputCheck = (
                (this.state.nfcData.nfcReadOutputExternalRandomNumber == this.state.nfcData.nfcReadInputExternalRandomNumber) &&
                (this.state.nfcData.nfcReadOutputBlockhash == this.state.nfcData.nfcReadInputBlockhash) &&
                (this.state.nfcData.nfcReadOutputCombinedHash == this.state.nfcData.nfcReadInputCombinedHash)
            );

            verificationResults.push({
                key: 'external_signature',
                type: 'hardware',
                status: validExternalSignature ? 'impossible' : 'fail',
                descriptionShort: validExternalSignature ? `Found valid block signature (block date: ${signedBlockDateFormatted}).` : 'Invalid block signature.'
            });

            verificationResults.push({
                key: 'internal_signature',
                type: 'hardware',
                status: validInternalSignature ? 'impossible' : 'fail',
                descriptionShort: validInternalSignature ? `Found valid random signature.` : 'Invalid random signature.'
            });

        }

        /**********************
         * Summarize results. *
         *********************/

        // Value.
        var verificationResultsValue = verificationResults.filter(item => item.type == 'value');
        var verificationResultValue = (
            verificationResultsValue.filter(item => item.status == 'fail').length == 0 &&
            verificationResultsValue.filter(item => item.status == 'pass').length > 0
        ) ? 'pass' : 'fail';

        // Contracts.
        var verificationResultsContracts = verificationResults.filter(item => item.type == 'contracts');
        var verificationResultContracts = (
            verificationResultsContracts.filter(item => item.status == 'fail').length == 0 &&
            verificationResultsContracts.filter(item => item.status == 'pass').length > 0
        ) ? 'pass' : 'fail';

        // Hardware.
        var verificationResultsHardware = verificationResults.filter(item => item.type == 'hardware');

        if (
            verificationResultsHardware.filter(item => item.status == 'fail').length > 0
        ) {
            var verificationResultHardware = 'fail';
        } else if (
            verificationResultsHardware.filter(item => item.status == 'impossible').length == 0 &&
            verificationResultsHardware.filter(item => item.status == 'pass').length > 0
        ) {
            var verificationResultHardware = 'pass';
        } else if (
            verificationResultsHardware.filter(item => item.status == 'impossible').length > 0 &&
            verificationResultsHardware.filter(item => item.status == 'pass').length >= 0
        ) {
            var verificationResultHardware = 'impossible';
        };

        // Overall result.
        var verificationResult = (
            verificationResults.filter(item => item.status == 'fail').length == 0 &&
            verificationResults.filter(item => item.status == 'impossible').length >= 0 &&
            verificationResults.filter(item => item.status == 'pass').length > 0
        ) ? 'pass' : 'fail';

        // Set verification status.
        var verificationData = Object.assign({}, this.state.verificationData, {
            verificationResults: verificationResults,
            verificationResultsValue: verificationResultsValue,
            verificationResultsHardware: verificationResultsHardware,
            verificationResultsContracts: verificationResultsContracts,

            verificationResult: verificationResult,
            verificationResultValue: verificationResultValue,
            verificationResultHardware: verificationResultHardware,
            verificationResultContracts: verificationResultContracts
        });

        this.setState((prevState) => ({verificationData}));

        console.log('VERIFICATION RESULT');
        console.log(verificationData);

        this._goToScreen('atResult', '');

    },
    _verifyMerkleProof: async function() {
        // TODO: new result screen?
        console.log(`_verifyMerkleProof called.`)

        // Arrays for results.
        var verificationResults = [];

        /*****************************
         * Shorthand variable names. *
         ****************************/

        var tokenName = this.state.blockchainData.tokenName;
        var tokenSymbol = this.state.blockchainData.tokenSymbol;

        var contractCode = this.state.blockchainData.contractCode;
        var contractVersion = this.state.blockchainData.contractVersion;
        var contractType = this.state.blockchainData.contractType;
        // var contractState = this.state.blockchainData.contractState;
        // var contractRegistered = this.state.blockchainData.contractRegistered;
        var contractVerifierAddress = this.state.blockchainData.contractVerifierAddress;
        var contractReleaseTimestamp = this.state.blockchainData.contractReleaseTimestamp;

        var scaledERC20Balance = this.state.blockchainData.scaledERC20Balance;
        var unscaledERC20Balance = this.state.blockchainData.unscaledERC20Balance;
        var expectedUnscaledERC20Balance = this.state.blockchainData.expectedUnscaledERC20Balance;

        /**************************
         * Smart Contract Checks. *
         *************************/

        // Contract code.
        var versionInfo = knownContractVersions[contractVersion];
        var contractVersionCheck = versionInfo != undefined;

        verificationResults.push({
            key: 'contractVersionCheck',
            type: 'contracts',
            status: `${contractVersionCheck ? 'pass': 'fail'}`,
            descriptionShort: `Minting contract ${contractVersionCheck ? 'verified': 'not verified'}.`
        });

        // Elliptic contract address.
        var ellipticCurveContractCheck = contractVerifierAddress.toUpperCase() == versionInfo.expectedECCAddress.toUpperCase();

        verificationResults.push({
            key: 'ellipticAddressCheck',
            type: 'contracts',
            status: `${ellipticCurveContractCheck ? 'pass': 'fail'}`,
            descriptionShort: `ECC contract ${ellipticCurveContractCheck ? 'verified': 'not verified'}.`
        });

        /******************************
         * Balance and timing checks. *
         *****************************/

        if ((expectedUnscaledERC20Balance <= unscaledERC20Balance) && (unscaledERC20Balance > 0)) {

            verificationResults.push({
                key: 'erc20BalanceCheck',
                type: 'value',
                status: 'pass',
                descriptionShort: `Token ownership verified.`
            });

        }

        // Timing.
        var timeToUnlock = contractReleaseTimestamp - Math.floor(Date.now() / 1000);
        var contractIsLocked = contractReleaseTimestamp > Math.floor(Date.now() / 1000);
        var contractIsUnlocked = contractReleaseTimestamp <= Math.floor(Date.now() / 1000);

        // String date.
        var releaseTimeStamp = new Date(contractReleaseTimestamp * 1000);
        var releaseTimeStampFormatted = (releaseTimeStamp.getMonth() + 1) + '/' + releaseTimeStamp.getDate() + '/' + releaseTimeStamp.getFullYear();

        // Contract is locked.
        if ((timeToUnlock > 7 * 24 * 60 * 60) && contractIsLocked) {

            verificationResults.push({
                key: 'timeCheck',
                type: 'value',
                status: 'pass',
                descriptionShort: `Token lock verified.`
            });

        }

        // Contract is close to unlocking.
        if ((timeToUnlock <= 7 * 24 * 60 * 60) && (contractIsLocked)) {

            verificationResults.push({
                key: 'timeCheck',
                type: 'value',
                status: 'warning',
                descriptionShort: `Tokens become transferable on ${releaseTimeStampFormatted}.`
            });

        }

        // Contract is unlocked.
        if (contractIsUnlocked) {

            verificationResults.push({
                key: 'timeCheck',
                type: 'value',
                status: 'warning',
                descriptionShort: `Tokens are transferable.`
            });

        }

        /**************************
        * Hardware verification. *
        **************************/

        // External signature.
        var validExternalSignature = this._verifySignature(
            this.state.nfcData.nfcReadOutputCombinedHash,
            this.state.nfcData.nfcReadInfoPrimaryPublicKey,
            this.state.nfcData.nfcReadOutputExternalSignature
        );

        // Internal signature.
        var validInternalSignature = this._verifyInternalSignature(
            this.state.nfcData.nfcReadOutputInternalRandomNumber,
            this.state.nfcData.nfcReadOutputExternalRandomNumber,
            this.state.nfcData.nfcReadInfoSecondaryPublicKey,
            this.state.nfcData.nfcReadOutputInternalSignature
        );

        if (this.state.blockchainData.signedBlockValid) {
            var signedBlockDate = new Date(this.state.blockchainData.signedBlockTime * 1000);
            var signedBlockDateFormatted = signedBlockDate.toLocaleDateString("en-US");
            console.log(`GOT BLOCK DATE: ${signedBlockDate} formatted ${signedBlockDateFormatted}`);
        };

        if (this.state.fullVerification) {

            var inputOutputCheck = (
                (this.state.nfcData.nfcReadOutputExternalRandomNumber == this.state.nfcData.nfcWrittenInputExternalRandomNumber) &&
                (this.state.nfcData.nfcReadOutputBlockhash == this.state.nfcData.nfcWrittenInputBlockhash) &&
                (this.state.nfcData.nfcReadOutputCombinedHash == this.state.nfcData.nfcWrittenInputCombinedHash)
            );

            console.log(`read in/out strings`)
            console.log(this.state.nfcData.nfcReadOutputExternalRandomNumber)
            console.log(this.state.nfcData.nfcWrittenInputExternalRandomNumber)
            console.log(this.state.nfcData.nfcReadOutputBlockhash)
            console.log(this.state.nfcData.nfcWrittenInputBlockhash)
            console.log(this.state.nfcData.nfcReadOutputCombinedHash)
            console.log(this.state.nfcData.nfcWrittenInputCombinedHash)

            verificationResults.push({
                key: 'challenge_integrity',
                type: 'hardware',
                status: inputOutputCheck ? 'pass' : 'fail',
                descriptionShort: inputOutputCheck ? `Challenge input verified.` : 'Challenge input != output.'
            });

            // TODO: adapt to full quick verifiy
            verificationResults.push({
                key: 'external_signature',
                type: 'hardware',
                status: validExternalSignature ? 'pass' : 'fail',
                descriptionShort: validExternalSignature ? `Valid external signature.` : 'Invalid external signature.'
            });

            verificationResults.push({
                key: 'internal_signature',
                type: 'hardware',
                status: validInternalSignature ? 'pass' : 'fail',
                descriptionShort: validInternalSignature ? `Valid internal signature.` : 'Invalid internal signature.'
            });

        } else {

            var inputOutputCheck = (
                (this.state.nfcData.nfcReadOutputExternalRandomNumber == this.state.nfcData.nfcReadInputExternalRandomNumber) &&
                (this.state.nfcData.nfcReadOutputBlockhash == this.state.nfcData.nfcReadInputBlockhash) &&
                (this.state.nfcData.nfcReadOutputCombinedHash == this.state.nfcData.nfcReadInputCombinedHash)
            );

            verificationResults.push({
                key: 'external_signature',
                type: 'hardware',
                status: validExternalSignature ? 'impossible' : 'fail',
                descriptionShort: validExternalSignature ? `Found valid block signature (block date: ${signedBlockDateFormatted}).` : 'Invalid block signature.'
            });

            verificationResults.push({
                key: 'internal_signature',
                type: 'hardware',
                status: validInternalSignature ? 'impossible' : 'fail',
                descriptionShort: validInternalSignature ? `Found valid random signature.` : 'Invalid random signature.'
            });

        }

        /**********************
         * Summarize results. *
         *********************/

        // Value.
        var verificationResultsValue = verificationResults.filter(item => item.type == 'value');
        var verificationResultValue = (
            verificationResultsValue.filter(item => item.status == 'fail').length == 0 &&
            (verificationResultsValue.filter(item => item.status == 'pass').length > 0 ||
             verificationResultsValue.filter(item => item.status == 'warning').length > 0)
        ) ? 'pass' : 'fail';

        // Contracts.
        var verificationResultsContracts = verificationResults.filter(item => item.type == 'contracts');
        var verificationResultContracts = (
            verificationResultsContracts.filter(item => item.status == 'fail').length == 0 &&
            verificationResultsContracts.filter(item => item.status == 'pass').length > 0
        ) ? 'pass' : 'fail';

        // Hardware.
        var verificationResultsHardware = verificationResults.filter(item => item.type == 'hardware');

        if (
            verificationResultsHardware.filter(item => item.status == 'fail').length > 0
        ) {
            var verificationResultHardware = 'fail';
        } else if (
            verificationResultsHardware.filter(item => item.status == 'impossible').length == 0 &&
            verificationResultsHardware.filter(item => item.status == 'pass').length > 0
        ) {
            var verificationResultHardware = 'pass';
        } else if (
            verificationResultsHardware.filter(item => item.status == 'impossible').length > 0 &&
            verificationResultsHardware.filter(item => item.status == 'pass').length >= 0
        ) {
            var verificationResultHardware = 'impossible';
        };

        // Overall result.
        var verificationResult = (
            verificationResults.filter(item => item.status == 'fail').length == 0 &&
            verificationResults.filter(item => item.status == 'impossible').length >= 0 &&
            verificationResults.filter(item => item.status == 'pass').length > 0
        ) ? 'pass' : 'fail';

        // Set verification status.
        var verificationData = Object.assign({}, this.state.verificationData, {
            verificationResults: verificationResults,
            verificationResultsValue: verificationResultsValue,
            verificationResultsHardware: verificationResultsHardware,
            verificationResultsContracts: verificationResultsContracts,

            verificationResult: verificationResult,
            verificationResultValue: verificationResultValue,
            verificationResultHardware: verificationResultHardware,
            verificationResultContracts: verificationResultContracts
        });

        this.setState((prevState) => ({verificationData}));

        console.log('VERIFICATION RESULT');
        console.log(verificationData);

        this._goToScreen('atResult', '');

    },
    _verifyUnknownDevice: async function() {

        // Arrays for results.
        var verificationResults = [];

        /**************************
        * Hardware verification. *
        **************************/

        // External signature.
        var validExternalSignature = this._verifySignature(
            this.state.nfcData.nfcReadOutputCombinedHash,
            this.state.nfcData.nfcReadInfoPrimaryPublicKey,
            this.state.nfcData.nfcReadOutputExternalSignature
        );

        // Internal signature.
        var validInternalSignature = this._verifyInternalSignature(
            this.state.nfcData.nfcReadOutputInternalRandomNumber,
            this.state.nfcData.nfcReadOutputExternalRandomNumber,
            this.state.nfcData.nfcReadInfoSecondaryPublicKey,
            this.state.nfcData.nfcReadOutputInternalSignature
        );

        if (this.state.blockchainData.signedBlockValid) {
            var signedBlockDate = new Date(this.state.blockchainData.signedBlockTime * 1000);
            var signedBlockDateFormatted = signedBlockDate.toLocaleDateString("en-US");
            console.log(`GOT BLOCK DATE: ${signedBlockDate} formatted ${signedBlockDateFormatted}`);
        };

        if (this.state.fullVerification) {

            var inputOutputCheck = (
                (this.state.nfcData.nfcReadOutputExternalRandomNumber == this.state.nfcData.nfcWrittenInputExternalRandomNumber) &&
                (this.state.nfcData.nfcReadOutputBlockhash == this.state.nfcData.nfcWrittenInputBlockhash) &&
                (this.state.nfcData.nfcReadOutputCombinedHash == this.state.nfcData.nfcWrittenInputCombinedHash)
            );

            verificationResults.push({
                key: 'challenge_integrity',
                type: 'hardware',
                status: inputOutputCheck ? 'pass' : 'fail',
                descriptionShort: inputOutputCheck ? `Challenge input verified.` : 'Challenge input != output.'
            });

            // TODO: adapt to full quick verifiy
            verificationResults.push({
                key: 'external_signature',
                type: 'hardware',
                status: validExternalSignature ? 'pass' : 'fail',
                descriptionShort: validExternalSignature ? `Valid external signature.` : 'Invalid external signature.'
            });

            verificationResults.push({
                key: 'internal_signature',
                type: 'hardware',
                status: validInternalSignature ? 'pass' : 'fail',
                descriptionShort: validInternalSignature ? `Valid internal signature.` : 'Invalid internal signature.'
            });

        } else {

            var inputOutputCheck = (
                (this.state.nfcData.nfcReadOutputExternalRandomNumber == this.state.nfcData.nfcReadInputExternalRandomNumber) &&
                (this.state.nfcData.nfcReadOutputBlockhash == this.state.nfcData.nfcReadInputBlockhash) &&
                (this.state.nfcData.nfcReadOutputCombinedHash == this.state.nfcData.nfcReadInputCombinedHash)
            );

            verificationResults.push({
                key: 'external_signature',
                type: 'hardware',
                status: validExternalSignature ? 'impossible' : 'fail',
                descriptionShort: validExternalSignature ? `Found valid block signature (block date: ${signedBlockDateFormatted}).` : 'Invalid block signature.'
            });

            verificationResults.push({
                key: 'internal_signature',
                type: 'hardware',
                status: validInternalSignature ? 'impossible' : 'fail',
                descriptionShort: validInternalSignature ? `Found valid random signature.` : 'Invalid random signature.'
            });

        }

        /**********************
         * Summarize results. *
         *********************/

        // Hardware.
        var verificationResultsHardware = verificationResults.filter(item => item.type == 'hardware');

        if (
            verificationResultsHardware.filter(item => item.status == 'fail').length > 0
        ) {
            var verificationResultHardware = 'fail';
        } else if (
            verificationResultsHardware.filter(item => item.status == 'impossible').length == 0 &&
            verificationResultsHardware.filter(item => item.status == 'pass').length > 0
        ) {
            var verificationResultHardware = 'pass';
        } else if (
            verificationResultsHardware.filter(item => item.status == 'impossible').length > 0 &&
            verificationResultsHardware.filter(item => item.status == 'pass').length >= 0
        ) {
            var verificationResultHardware = 'impossible';
        };

        // Overall result.
        var verificationResult = (
            verificationResults.filter(item => item.status == 'fail').length == 0 &&
            verificationResults.filter(item => item.status == 'impossible').length >= 0 &&
            verificationResults.filter(item => item.status == 'pass').length > 0
        ) ? 'pass' : 'fail';

        // Set verification status.
        var verificationData = Object.assign({}, this.state.verificationData, {
            verificationResults: verificationResults,
            verificationResultsHardware: verificationResultsHardware,

            verificationResult: verificationResult,
            verificationResultHardware: verificationResultHardware
        });

        this.setState((prevState) => ({verificationData}));

        console.log('VERIFICATION RESULT (UNKNOWN DEVICE)');
        console.log(verificationData);

        this._goToScreen('atResult', '');

    },
    _verifyInternalSignature(internalRandomNumber, externalRandomNumber, publicKey, signature) {

        console.log('INTERNAL SIGNATURE VERIFICATION');
        console.log('internalRandomNumber ', internalRandomNumber);
        console.log('externalRandomNumber', externalRandomNumber);
        console.log('publicKey ', publicKey);
        console.log('signature ', signature);

        // Version in bytes.
        var internalRandomNumberBytes = helpers._hexToBytes(internalRandomNumber);
        var externalRandomNumberBytes = helpers._hexToBytes(externalRandomNumber);
        var publicKeyBytes = helpers._hexToBytes(publicKey);

        // Create hash 1
        var temp = [];
        temp = temp.concat(internalRandomNumberBytes);
        temp = temp.concat(externalRandomNumberBytes.slice(0, 20));

        temp = temp.concat([
            0x16,             // OpCode (Nonce command)
            0x00,             // Param1 (mode)
            0x00              // LSB of Param2
        ])

        var hashOne = crypto.createHash('sha256').update(Buffer.from(temp)).digest('hex');

        // Create hash 2
        temp = helpers._hexToBytes(hashOne).concat([
            0x40,                           // OpCode (Genkey command)
            externalRandomNumberBytes[29],  // 29th byte of random input
            externalRandomNumberBytes[30],  // 30th byte of random input
            externalRandomNumberBytes[31],  // 31st byte of random input
            0xee,                           // SN[8]
            0x01,                           // SN[0]
            0x23,                           // SN[1]
            Array(25).fill(0x00),           // 25 x 0x00
            helpers._hexToBytes(publicKey)  // Pubkey
        ]).flat();

        var hashTwo = crypto.createHash('sha256').update(Buffer.from(temp)).digest('hex');

        // Create hash 3
        temp = helpers._hexToBytes(hashTwo).concat([
            0x41,                // OpCode (Sign command)
            0x00,                // Param1 (mode)
            0x01,                // Param2 (keyID LSB)
            0x00,                // Param2 (keyID MSB)
            0x00,                // SlotConfig[Internal public keyID]
            0x00,                // SlotConfig[Internal public keyID]
            0x70,                // KeyConfig[Internal public keyID]
            0x00,                // KeyConfig[Internal public keyID]
            0x4a,                // TempKey flags
            0x00,                // zero
            0x00,                // zero
            0xee,                // SN[8]
            0x00,                // SN[4] zeroed
            0x00,                // SN[5] zeroed
            0x00,                // SN[6] zeroed
            0x00,                // SN[7] zeroed
            0x01,                // SN[0]
            0x23,                // SN[1]
            0x00,                // SN[2]
            0x00,                // SN[3]
            0x00,                // SlotLocked
            0x00,                // PubKey valid
            0x00                 // zero
        ]);

        tempSlotUnlocked = helpers._hexToBytes(hashTwo).concat([
            0x41,                // OpCode (Sign command)
            0x00,                // Param1 (mode)
            0x01,                // Param2 (keyID LSB)
            0x00,                // Param2 (keyID MSB)
            0x00,                // SlotConfig[Internal public keyID]
            0x00,                // SlotConfig[Internal public keyID]
            0x70,                // KeyConfig[Internal public keyID]
            0x00,                // KeyConfig[Internal public keyID]
            0x4a,                // TempKey flags
            0x00,                // zero
            0x00,                // zero
            0xee,                // SN[8]
            0x00,                // SN[4] zeroed
            0x00,                // SN[5] zeroed
            0x00,                // SN[6] zeroed
            0x00,                // SN[7] zeroed
            0x01,                // SN[0]
            0x23,                // SN[1]
            0x00,                // SN[2]
            0x00,                // SN[3]
            0x01,                // SlotLocked
            0x00,                // PubKey valid
            0x00                 // zero
        ]);        

        var hashThree = crypto.createHash('sha256').update(Buffer.from(temp)).digest('hex');

        // Call signature verification - works with either slot locked or not
        if (!this._verifySignature(hashThree, publicKey, signature)) {
            var hashThreeSlotUnlocked = crypto.createHash('sha256').update(Buffer.from(tempSlotUnlocked)).digest('hex');
            return this._verifySignature(hashThreeSlotUnlocked, publicKey, signature);
        } else {
            return this._verifySignature(hashThree, publicKey, signature);
        }

    },
    _verifySignature: function(msgHash, publicKeyLong, signatureLong) {

        console.log(`BEGIN SIGNATURE VERIFICATION (in ms): ${Date.now()}`)

        // Return false if format of variables is unexpected.
        if (msgHash.length != 66 && msgHash.length != 64) {return false};
        if (signatureLong.length != 128) {return false};
        if (publicKeyLong.length != 130 && publicKeyLong.length != 128) {return false};

        // Remove leading '0x' in msgHash.
        if (msgHash.length == 66 && msgHash.slice(0, 2) == '0x') {
            msgHash = msgHash.slice(2);
        };

        // Remove leading '04' in publicKey.
        if (publicKeyLong.length == 130 && publicKeyLong.slice(0, 2) == '04') {
            publicKeyLong = publicKeyLong.slice(2);
        };

        // Reformat key and signature so elliptic package can handle them.
        var pub = {
            x: publicKeyLong.slice(0, publicKeyLong.length/2),
            y: publicKeyLong.slice(publicKeyLong.length/2)
        };
        var key = this.state.curveData.curveP256.keyFromPublic(pub, 'hex');

        // Reformat signature to one of several acceptable formats: {r :r , s: s}
        var signature = {
            r: signatureLong.slice(0, signatureLong.length/2),
            s: signatureLong.slice(signatureLong.length/2)
        };

        // Verify.
        var verified = key.verify(msgHash, signature);
        console.log(`END SIGNATURE VERIFICATION (in ms): ${Date.now()}`)

        return verified;
    },

}

  export default verification;
