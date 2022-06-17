import {
  BlockChainData,
  CurrentState,
  VerificationData,
  VerificationTypes,
} from '../../common/types';
import knownValues from '../../../assets/data/knownValues.js';
import {hexToBytes} from '../../common/utils';
import {utils} from 'ethers';
import {navigate} from '../../common/RootNavigation';

const knownContractVersions = knownValues['knownContractVersions'] as any;

interface IGetVerificationFns {
  state: CurrentState;
  setVerificationData: (input: VerificationData) => void;
}
const {FAIL, IMPOSSIBLE, PASS, WARNING} = VerificationTypes;

const getverificationResultColor = (
  blockchainData: BlockChainData,
  fullVerification: boolean,
  result: VerificationTypes,
) => {
  if (!fullVerification && !FAIL) return '#2BFF88';
  if (!blockchainData.contractRegistered && !blockchainData.verifiedProof)
    return '#D2D2DA';
  switch (result) {
    case PASS:
      return '#2BFF88';
    case FAIL:
      return '#EF5A45';

    case IMPOSSIBLE:
    default:
      return '#D2D2DA';
  }
};

export const getVerificationFns = ({
  state,
  setVerificationData,
}: IGetVerificationFns) => {
  let verificationData = state.verificationData;

  const updateVerificationData = (updatedObject: VerificationData) => {
    state.verificationData = Object.assign({}, verificationData, updatedObject);
    setVerificationData(state.verificationData);
    verificationData = state.verificationData;
  };

  const verifyEscrow = () => {
    // Arrays for results.
    const verificationResults = [];

    const {
      tokenName,
      contractVersion,
      contractVerifierAddress,
      contractReleaseTimestamp,
      unscaledERC20Balance,
      expectedUnscaledERC20Balance,
    } = state.blockchainData;

    /**************************
     * Smart Contract Checks. *
     *************************/

    // Contract code.
    const versionInfo =
      contractVersion && knownContractVersions[contractVersion];
    const contractVersionCheck = versionInfo != undefined;

    verificationResults.push({
      key: 'contractVersionCheck',
      type: 'contracts',
      status: `${contractVersionCheck ? PASS : FAIL}`,
      descriptionShort: `Ownership contract ${
        contractVersionCheck ? 'verified' : 'not verified'
      }`,
    });
    // Elliptic contract address.
    const ellipticCurveContractCheck =
      contractVerifierAddress?.toUpperCase() ==
      versionInfo.expectedECCAddress.toUpperCase();

    verificationResults.push({
      key: 'ellipticAddressCheck',
      type: 'contracts',
      status: `${ellipticCurveContractCheck ? PASS : FAIL}`,
      descriptionShort: `ECC contract ${
        ellipticCurveContractCheck ? 'verified' : 'not verified'
      }`,
    });
    /******************************
     * Balance and timing checks. *
     *****************************/

    if (expectedUnscaledERC20Balance && unscaledERC20Balance) {
      if (
        expectedUnscaledERC20Balance <= unscaledERC20Balance &&
        unscaledERC20Balance > 0
      ) {
        verificationResults.push({
          key: 'erc20BalanceCheck',
          type: 'value',
          status: PASS,
          descriptionShort: `Token ownership verified`,
        });
      } else if (expectedUnscaledERC20Balance > unscaledERC20Balance) {
        // var balanceCheck = false;
        verificationResults.push({
          key: 'erc20BalanceCheck',
          type: 'value',
          status: FAIL,
          descriptionShort: `Tokens owned too low ${unscaledERC20Balance} (exp. ${
            expectedUnscaledERC20Balance / (tokenName === 'Kong' ? 10 ** 18 : 1)
          }) ${tokenName}`,
        });
      } else if (unscaledERC20Balance === 0) {
        //&& (ERC20IncomingTransfer === false)) {
        // var balanceCheck = false;
        verificationResults.push({
          key: 'erc20BalanceCheck',
          type: 'value',
          status: FAIL,
          descriptionShort: `Contract has not been charged with ${tokenName} tokens yet`,
        });
      }
    }

    // Timing.
    const timeToUnlock =
      contractReleaseTimestamp &&
      contractReleaseTimestamp - Math.floor(Date.now() / 1000);
    const contractIsLocked =
      contractReleaseTimestamp &&
      contractReleaseTimestamp > Math.floor(Date.now() / 1000);
    const contractIsUnlocked =
      contractReleaseTimestamp &&
      contractReleaseTimestamp <= Math.floor(Date.now() / 1000);

    // String date.
    const releaseTimeStamp = new Date(contractReleaseTimestamp! * 1000);
    const releaseTimeStampFormatted =
      releaseTimeStamp?.getMonth() +
      1 +
      '/' +
      releaseTimeStamp?.getDate() +
      '/' +
      releaseTimeStamp?.getFullYear();

    // Contract is locked.
    if (timeToUnlock && timeToUnlock > 7 * 24 * 60 * 60 && contractIsLocked) {
      verificationResults.push({
        key: 'timeCheck',
        type: 'value',
        status: PASS,
        descriptionShort: `Token lock verified`,
      });
    }

    // Contract is close to unlocking.
    if (timeToUnlock && timeToUnlock <= 7 * 24 * 60 * 60 && contractIsLocked) {
      verificationResults.push({
        key: 'timeCheck',
        type: 'value',
        status: WARNING,
        descriptionShort: `Tokens become transferable on ${releaseTimeStampFormatted}`,
      });
    }

    // Contract is unlocked.
    if (contractIsUnlocked) {
      verificationResults.push({
        key: 'timeCheck',
        type: 'value',
        status: WARNING,
        descriptionShort: `Tokens are transferable`,
      });
    }

    /**************************
     * Hardware verification. *
     **************************/

    // External signature.
    const validExternalSignature = verifySignature(
      state.nfcData.nfcReadOutputCombinedHash!,
      state.nfcData.nfcReadInfoPrimaryPublicKey!,
      state.nfcData.nfcReadOutputExternalSignature!,
    );

    // Internal signature.
    const validInternalSignature = verifyInternalSignature(
      state.nfcData.nfcReadOutputInternalRandomNumber!,
      state.nfcData.nfcReadOutputExternalRandomNumber!,
      state.nfcData.nfcReadInfoSecondaryPublicKey!,
      state.nfcData.nfcReadOutputInternalSignature!,
    );
    let signedBlockDateFormatted;
    if (state.blockchainData.signedBlockValid) {
      const signedBlockDate = new Date(
        state.blockchainData.signedBlockTime! * 1000,
      );
      signedBlockDateFormatted = signedBlockDate.toLocaleDateString('en-US');
      console.log(
        `GOT BLOCK DATE: ${signedBlockDate} formatted ${signedBlockDateFormatted}`,
      );
    }

    if (state.fullVerification) {
      const inputOutputCheck =
        state.nfcData.nfcReadOutputExternalRandomNumber?.toUpperCase() ==
          state.nfcData.nfcWrittenInputExternalRandomNumber
            ?.padEnd(64, '0')
            .toUpperCase() &&
        state.nfcData.nfcReadOutputBlockhash ===
          state.nfcData.nfcWrittenInputBlockhash &&
        state.nfcData.nfcReadOutputCombinedHash ==
          state.nfcData.nfcWrittenInputCombinedHash;

      console.log(`read in/out strings`);
      console.log(state.nfcData.nfcReadOutputExternalRandomNumber);
      console.log(state.nfcData.nfcWrittenInputExternalRandomNumber);
      console.log(state.nfcData.nfcReadOutputBlockhash);
      console.log(state.nfcData.nfcWrittenInputBlockhash);
      console.log(state.nfcData.nfcReadOutputCombinedHash);
      console.log(state.nfcData.nfcWrittenInputCombinedHash);

      verificationResults.push({
        key: 'challenge_integrity',
        type: 'hardware',
        status: inputOutputCheck ? PASS : FAIL,
        descriptionShort: inputOutputCheck
          ? `Challenge input verified`
          : 'Challenge input != output',
      });

      // TODO: adapt to full quick verifiy
      verificationResults.push({
        key: 'external_signature',
        type: 'hardware',
        status: validExternalSignature ? PASS : FAIL,
        descriptionShort: validExternalSignature
          ? `Valid external signature`
          : 'Invalid external signature',
      });

      verificationResults.push({
        key: 'internal_signature',
        type: 'hardware',
        status: validInternalSignature ? PASS : FAIL,
        descriptionShort: validInternalSignature
          ? `Valid internal signature`
          : 'Invalid internal signature',
      });
    } else {
      console.log(`partial verify`);

      //   const inputOutputCheck =
      //     nfcData.nfcReadOutputExternalRandomNumber ==
      //       nfcData.nfcReadInputExternalRandomNumber &&
      //     nfcData.nfcReadOutputBlockhash === nfcData.nfcReadInputBlockhash &&
      //     nfcData.nfcReadOutputCombinedHash === nfcData.nfcReadInputCombinedHash;

      verificationResults.push({
        key: 'external_signature',
        type: 'hardware',
        status: validExternalSignature ? IMPOSSIBLE : FAIL,
        descriptionShort: validExternalSignature
          ? `Found valid block signature (block date: ${signedBlockDateFormatted})`
          : 'Invalid block signature',
      });

      verificationResults.push({
        key: 'internal_signature',
        type: 'hardware',
        status: validInternalSignature ? IMPOSSIBLE : FAIL,
        descriptionShort: validInternalSignature
          ? `Found valid random signature`
          : 'Invalid random signature',
      });
    }

    /**********************
     * Summarize results. *
     *********************/

    // Value.
    const verificationResultsValue = verificationResults.filter(
      item => item.type === 'value',
    );
    const verificationResultValue =
      verificationResultsValue.filter(item => item.status === FAIL).length ==
        0 &&
      verificationResultsValue.filter(item => item.status === PASS).length > 0
        ? PASS
        : FAIL;

    // Contracts.
    const verificationResultsContracts = verificationResults.filter(
      item => item.type === 'contracts',
    );
    const verificationResultContracts =
      verificationResultsContracts.filter(item => item.status === FAIL)
        .length === 0 &&
      verificationResultsContracts.filter(item => item.status === PASS).length >
        0
        ? PASS
        : FAIL;

    // Hardware.
    const verificationResultsHardware = verificationResults.filter(
      item => item.type === 'hardware',
    );

    let verificationResultHardware;

    if (
      verificationResultsHardware.filter(item => item.status === FAIL).length >
      0
    ) {
      verificationResultHardware = FAIL;
    } else if (
      verificationResultsHardware.filter(item => item.status === IMPOSSIBLE)
        .length === 0 &&
      verificationResultsHardware.filter(item => item.status === PASS).length >
        0
    ) {
      verificationResultHardware = PASS;
    } else if (
      verificationResultsHardware.filter(item => item.status === IMPOSSIBLE)
        .length > 0 &&
      verificationResultsHardware.filter(item => item.status === PASS).length >=
        0
    ) {
      verificationResultHardware = IMPOSSIBLE;
    } else {
      verificationResultHardware = FAIL;
    }

    //Overall result.
    const verificationResult =
      verificationResults.filter(item => item.status === FAIL).length === 0 &&
      verificationResults.filter(item => item.status === IMPOSSIBLE).length >=
        0 &&
      verificationResults.filter(item => item.status === PASS).length > 0
        ? PASS
        : FAIL;

    // Set verification status.
    const updatedVerificationData = Object.assign({}, verificationData, {
      verificationResults,
      verificationResultsValue,
      verificationResultsHardware,
      verificationResultsContracts,
      verificationResult,
      verificationResultValue,
      verificationResultHardware,
      verificationResultContracts,
      verificationResultColor: getverificationResultColor(
        state.blockchainData,
        state.fullVerification,
        verificationResult,
      ),
    });

    updateVerificationData(updatedVerificationData);

    console.log('VERIFICATION RESULT');
    console.log(verificationData);
    if (
      !state.headlessVerification ||
      verificationResult === VerificationTypes.FAIL
    ) {
      navigate('Results');
    }
  };
  const verifyMerkleProof = async function () {
    // TODO: new result screen?
    console.log(`_verifyMerkleProof called`);

    // Arrays for results.
    const verificationResults = [];

    /*****************************
     * Shorthand variable names. *
     ****************************/

    const {
      contractVersion,
      contractVerifierAddress,
      unscaledERC20Balance,
      expectedUnscaledERC20Balance,
      contractReleaseTimestamp,
    } = state.blockchainData;
    /**************************
     * Smart Contract Checks. *
     *************************/

    // Contract code.
    const versionInfo =
      contractVersion && knownContractVersions[contractVersion];
    const contractVersionCheck = versionInfo != undefined;

    verificationResults.push({
      key: 'contractVersionCheck',
      type: 'contracts',
      status: `${contractVersionCheck ? PASS : FAIL}`,
      descriptionShort: `Minting contract ${
        contractVersionCheck ? 'verified' : 'not verified'
      }`,
    });

    // Elliptic contract address.
    const ellipticCurveContractCheck =
      contractVerifierAddress?.toUpperCase() ==
      versionInfo.expectedECCAddress.toUpperCase();

    verificationResults.push({
      key: 'ellipticAddressCheck',
      type: 'contracts',
      status: `${ellipticCurveContractCheck ? PASS : FAIL}`,
      descriptionShort: `ECC contract ${
        ellipticCurveContractCheck ? 'verified' : 'not verified'
      }`,
    });

    /******************************
     * Balance and timing checks. *
     *****************************/

    if (
      expectedUnscaledERC20Balance &&
      unscaledERC20Balance &&
      expectedUnscaledERC20Balance <= unscaledERC20Balance &&
      unscaledERC20Balance > 0
    ) {
      verificationResults.push({
        key: 'erc20BalanceCheck',
        type: 'value',
        status: PASS,
        descriptionShort: `Token ownership verified`,
      });
    }

    // Timing.
    const timeToUnlock =
      contractReleaseTimestamp &&
      contractReleaseTimestamp - Math.floor(Date.now() / 1000);
    const contractIsLocked =
      contractReleaseTimestamp &&
      contractReleaseTimestamp > Math.floor(Date.now() / 1000);

    // String date.
    const releaseTimeStamp = new Date(contractReleaseTimestamp! * 1000);
    const releaseTimeStampFormatted =
      releaseTimeStamp.getMonth() +
      1 +
      '/' +
      releaseTimeStamp.getDate() +
      '/' +
      releaseTimeStamp.getFullYear();

    // Contract is locked.
    if (timeToUnlock && timeToUnlock > 7 * 24 * 60 * 60 && contractIsLocked) {
      verificationResults.push({
        key: 'timeCheck',
        type: 'value',
        status: PASS,
        descriptionShort: `Token lock verified`,
      });
    }

    // Contract is close to unlocking.
    if (timeToUnlock && timeToUnlock <= 7 * 24 * 60 * 60 && contractIsLocked) {
      verificationResults.push({
        key: 'timeCheck',
        type: 'value',
        status: WARNING,
        descriptionShort: `Tokens become transferable on ${releaseTimeStampFormatted}`,
      });
    }

    // Contract is unlocked.
    if (!contractIsLocked) {
      verificationResults.push({
        key: 'timeCheck',
        type: 'value',
        status: WARNING,
        descriptionShort: `Tokens are transferable`,
      });
    }

    /**************************
     * Hardware verification. *
     **************************/
    // External signature.
    const validExternalSignature = verifySignature(
      state.nfcData.nfcReadOutputCombinedHash!,
      state.nfcData.nfcReadInfoPrimaryPublicKey!,
      state.nfcData.nfcReadOutputExternalSignature!,
    );

    // Internal signature.
    const validInternalSignature = verifyInternalSignature(
      state.nfcData.nfcReadOutputInternalRandomNumber!,
      state.nfcData.nfcReadOutputExternalRandomNumber!,
      state.nfcData.nfcReadInfoSecondaryPublicKey!,
      state.nfcData.nfcReadOutputInternalSignature!,
    );
    let signedBlockDateFormatted;
    if (state.blockchainData.signedBlockValid) {
      const signedBlockDate = new Date(
        state.blockchainData.signedBlockTime! * 1000,
      );
      signedBlockDateFormatted = signedBlockDate.toLocaleDateString('en-US');
      console.log(
        `GOT BLOCK DATE: ${signedBlockDate} formatted ${signedBlockDateFormatted}`,
      );
    }

    if (state.fullVerification) {
      const inputOutputCheck =
        state.nfcData.nfcReadOutputExternalRandomNumber?.toUpperCase() ==
          state.nfcData.nfcWrittenInputExternalRandomNumber
            ?.padEnd(64, '0')
            .toUpperCase() &&
        state.nfcData.nfcReadOutputBlockhash ==
          state.nfcData.nfcWrittenInputBlockhash &&
        state.nfcData.nfcReadOutputCombinedHash ==
          state.nfcData.nfcWrittenInputCombinedHash;

      console.log(`read in/out strings`);
      console.log(state.nfcData.nfcReadOutputExternalRandomNumber);
      console.log(state.nfcData.nfcWrittenInputExternalRandomNumber);
      console.log(state.nfcData.nfcReadOutputBlockhash);
      console.log(state.nfcData.nfcWrittenInputBlockhash);
      console.log(state.nfcData.nfcReadOutputCombinedHash);
      console.log(state.nfcData.nfcWrittenInputCombinedHash);

      verificationResults.push({
        key: 'challenge_integrity',
        type: 'hardware',
        status: inputOutputCheck ? PASS : FAIL,
        descriptionShort: inputOutputCheck
          ? `Challenge input verified`
          : 'Challenge input != output',
      });

      // TODO: adapt to full quick verifiy
      verificationResults.push({
        key: 'external_signature',
        type: 'hardware',
        status: validExternalSignature ? PASS : FAIL,
        descriptionShort: validExternalSignature
          ? `Valid external signature`
          : 'Invalid external signature',
      });

      verificationResults.push({
        key: 'internal_signature',
        type: 'hardware',
        status: validInternalSignature ? PASS : FAIL,
        descriptionShort: validInternalSignature
          ? `Valid internal signature`
          : 'Invalid internal signature',
      });
    } else {
      verificationResults.push({
        key: 'external_signature',
        type: 'hardware',
        status: validExternalSignature ? IMPOSSIBLE : FAIL,
        descriptionShort: validExternalSignature
          ? `Found valid block signature (block date: ${signedBlockDateFormatted})`
          : 'Invalid block signature',
      });

      verificationResults.push({
        key: 'internal_signature',
        type: 'hardware',
        status: validInternalSignature ? IMPOSSIBLE : FAIL,
        descriptionShort: validInternalSignature
          ? `Found valid random signature`
          : 'Invalid random signature',
      });
    }

    /**********************
     * Summarize results. *
     *********************/

    // Value.
    const verificationResultsValue = verificationResults.filter(
      item => item.type === 'value',
    );
    const verificationResultValue =
      verificationResultsValue.filter(item => item.status === FAIL).length ==
        0 &&
      (verificationResultsValue.filter(item => item.status === PASS).length >
        0 ||
        verificationResultsValue.filter(item => item.status === WARNING)
          .length > 0)
        ? PASS
        : FAIL;

    // Contracts.
    const verificationResultsContracts = verificationResults.filter(
      item => item.type === 'contracts',
    );
    const verificationResultContracts =
      verificationResultsContracts.filter(item => item.status === FAIL)
        .length === 0 &&
      verificationResultsContracts.filter(item => item.status === PASS).length >
        0
        ? PASS
        : FAIL;

    // Hardware.
    const verificationResultsHardware = verificationResults.filter(
      item => item.type === 'hardware',
    );
    let verificationResultHardware;
    if (
      verificationResultsHardware.filter(item => item.status === FAIL).length >
      0
    ) {
      verificationResultHardware = FAIL;
    } else if (
      verificationResultsHardware.filter(item => item.status === IMPOSSIBLE)
        .length === 0 &&
      verificationResultsHardware.filter(item => item.status === PASS).length >
        0
    ) {
      verificationResultHardware = PASS;
    } else if (
      verificationResultsHardware.filter(item => item.status === IMPOSSIBLE)
        .length > 0 &&
      verificationResultsHardware.filter(item => item.status === PASS).length >=
        0
    ) {
      verificationResultHardware = IMPOSSIBLE;
    } else {
      verificationResultHardware = FAIL;
    }

    // Overall result.
    const verificationResult =
      verificationResults.filter(item => item.status === FAIL).length === 0 &&
      verificationResults.filter(item => item.status === IMPOSSIBLE).length >=
        0 &&
      verificationResults.filter(item => item.status === PASS).length > 0
        ? PASS
        : FAIL;

    // Set verification status.
    const updatedVerificationData = Object.assign({}, verificationData, {
      verificationResults,
      verificationResultsValue,
      verificationResultsHardware,
      verificationResultsContracts,
      verificationResult,
      verificationResultValue,
      verificationResultHardware,
      verificationResultContracts,
      verificationResultColor: getverificationResultColor(
        state.blockchainData,
        state.fullVerification,
        verificationResult,
      ),
    });

    updateVerificationData(updatedVerificationData);

    console.log('VERIFICATION RESULT');
    console.log(verificationData);

    if (
      !state.headlessVerification ||
      verificationResult === VerificationTypes.FAIL
    ) {
      navigate('Results');
    }
  };

  const verifyUnknownDevice = async () => {
    // Arrays for results.
    const verificationResults = [];

    /**************************
     * Hardware verification. *
     **************************/

    // External signature.
    const validExternalSignature = verifySignature(
      state.nfcData.nfcReadOutputCombinedHash!,
      state.nfcData.nfcReadInfoPrimaryPublicKey!,
      state.nfcData.nfcReadOutputExternalSignature!,
    );

    // Internal signature.
    const validInternalSignature = verifyInternalSignature(
      state.nfcData.nfcReadOutputInternalRandomNumber!,
      state.nfcData.nfcReadOutputExternalRandomNumber!,
      state.nfcData.nfcReadInfoSecondaryPublicKey!,
      state.nfcData.nfcReadOutputInternalSignature!,
    );
    let signedBlockDateFormatted;
    if (state.blockchainData.signedBlockValid) {
      const signedBlockDate = new Date(
        state.blockchainData.signedBlockTime! * 1000,
      );
      signedBlockDateFormatted = signedBlockDate.toLocaleDateString('en-US');
      console.log(
        `GOT BLOCK DATE: ${signedBlockDate} formatted ${signedBlockDateFormatted}`,
      );
    }

    if (state.fullVerification) {
      const inputOutputCheck =
        state.nfcData.nfcReadOutputExternalRandomNumber?.toUpperCase() ==
          state.nfcData.nfcWrittenInputExternalRandomNumber
            ?.padEnd(64, '0')
            .toUpperCase() &&
        state.nfcData.nfcReadOutputBlockhash ==
          state.nfcData.nfcWrittenInputBlockhash &&
        state.nfcData.nfcReadOutputCombinedHash ==
          state.nfcData.nfcWrittenInputCombinedHash;

      verificationResults.push({
        key: 'challenge_integrity',
        type: 'hardware',
        status: inputOutputCheck ? PASS : FAIL,
        descriptionShort: inputOutputCheck
          ? `Challenge input verified`
          : 'Challenge input != output',
      });

      // TODO: adapt to full quick verifiy
      verificationResults.push({
        key: 'external_signature',
        type: 'hardware',
        status: validExternalSignature ? PASS : FAIL,
        descriptionShort: validExternalSignature
          ? `Valid external signature`
          : 'Invalid external signature',
      });

      verificationResults.push({
        key: 'internal_signature',
        type: 'hardware',
        status: validInternalSignature ? PASS : FAIL,
        descriptionShort: validInternalSignature
          ? `Valid internal signature`
          : 'Invalid internal signature',
      });
    } else {
      verificationResults.push({
        key: 'external_signature',
        type: 'hardware',
        status: validExternalSignature ? IMPOSSIBLE : FAIL,
        descriptionShort: validExternalSignature
          ? `Found valid block signature (block date: ${signedBlockDateFormatted})`
          : 'Invalid block signature',
      });

      verificationResults.push({
        key: 'internal_signature',
        type: 'hardware',
        status: validInternalSignature ? IMPOSSIBLE : FAIL,
        descriptionShort: validInternalSignature
          ? `Found valid random signature`
          : 'Invalid random signature',
      });
    }

    /**********************
     * Summarize results. *
     *********************/

    // Hardware.
    const verificationResultsHardware = verificationResults.filter(
      item => item.type === 'hardware',
    );
    let verificationResultHardware;
    if (
      verificationResultsHardware.filter(item => item.status === FAIL).length >
      0
    ) {
      verificationResultHardware = FAIL;
    } else if (
      verificationResultsHardware.filter(item => item.status === IMPOSSIBLE)
        .length === 0 &&
      verificationResultsHardware.filter(item => item.status === PASS).length >
        0
    ) {
      verificationResultHardware = PASS;
    } else if (
      verificationResultsHardware.filter(item => item.status === IMPOSSIBLE)
        .length > 0 &&
      verificationResultsHardware.filter(item => item.status === PASS).length >=
        0
    ) {
      verificationResultHardware = IMPOSSIBLE;
    }

    // Overall result.
    const verificationResult =
      verificationResults.filter(item => item.status === FAIL).length === 0 &&
      verificationResults.filter(item => item.status === IMPOSSIBLE).length >=
        0 &&
      verificationResults.filter(item => item.status === PASS).length > 0
        ? IMPOSSIBLE
        : FAIL;

    // Set verification status.
    const updatedVerificationData = Object.assign({}, verificationData, {
      verificationResults,
      verificationResultsHardware,
      verificationResult,
      verificationResultHardware,
      verificationResultColor: getverificationResultColor(
        state.blockchainData,
        state.fullVerification,
        verificationResult,
      ),
    });

    updateVerificationData(updatedVerificationData);
    console.log('VERIFICATION RESULT (UNKNOWN DEVICE)');
    console.log(verificationData);
    // TODO
    console.log(state.headlessVerification, verificationResult);
    if (
      !state.headlessVerification ||
      verificationResult === VerificationTypes.FAIL
    ) {
      navigate('Results');
    }
  };

  const verifyInternalSignature = (
    internalRandomNumber: string,
    externalRandomNumber: string,
    publicKey: string,
    signature: string,
  ) => {
    console.log('INTERNAL SIGNATURE VERIFICATION');
    console.log('internalRandomNumber ', internalRandomNumber);
    console.log('externalRandomNumber', externalRandomNumber);
    console.log('publicKey ', publicKey);
    console.log('signature ', signature);

    // Version in bytes.
    const internalRandomNumberBytes = hexToBytes(internalRandomNumber);
    const externalRandomNumberBytes = hexToBytes(externalRandomNumber);
    // const publicKeyBytes = hexToBytes(publicKey);
    // Create hash 1
    let temp: number[] = [];
    temp = temp.concat(internalRandomNumberBytes);
    temp = temp.concat(externalRandomNumberBytes.slice(0, 20));

    temp = temp.concat([
      0x16, // OpCode (Nonce command)
      0x00, // Param1 (mode)
      0x00, // LSB of Param2
    ]);

    const hashOne = utils.sha256(temp).slice(2);

    // create hash 2
    temp = hexToBytes(hashOne).concat([
      0x40, // OpCode (Genkey command)
      externalRandomNumberBytes[29], // 29th byte of random input
      externalRandomNumberBytes[30], // 30th byte of random input
      externalRandomNumberBytes[31], // 31st byte of random input
      0xee, // SN[8]
      0x01, // SN[0]
      0x23, // SN[1]
      ...Array(25).fill(0x00), // 25 x 0x00
      ...hexToBytes(publicKey), // Pubkey
    ]);
    console.log(temp);
    const hashTwo = utils.sha256(temp).slice(2);

    // Create hash 3
    temp = hexToBytes(hashTwo).concat([
      0x41, // OpCode (Sign command)
      0x00, // Param1 (mode)
      0x01, // Param2 (keyID LSB)
      0x00, // Param2 (keyID MSB)
      0x00, // SlotConfig[Internal public keyID]
      0x00, // SlotConfig[Internal public keyID]
      0x70, // KeyConfig[Internal public keyID]
      0x00, // KeyConfig[Internal public keyID]
      0x4a, // TempKey flags
      0x00, // zero
      0x00, // zero
      0xee, // SN[8]
      0x00, // SN[4] zeroed
      0x00, // SN[5] zeroed
      0x00, // SN[6] zeroed
      0x00, // SN[7] zeroed
      0x01, // SN[0]
      0x23, // SN[1]
      0x00, // SN[2]
      0x00, // SN[3]
      0x00, // SlotLocked
      0x00, // PubKey valid
      0x00, // zero
    ]);

    const tempSlotUnlocked = hexToBytes(hashTwo).concat([
      0x41, // OpCode (Sign command)
      0x00, // Param1 (mode)
      0x01, // Param2 (keyID LSB)
      0x00, // Param2 (keyID MSB)
      0x00, // SlotConfig[Internal public keyID]
      0x00, // SlotConfig[Internal public keyID]
      0x70, // KeyConfig[Internal public keyID]
      0x00, // KeyConfig[Internal public keyID]
      0x4a, // TempKey flags
      0x00, // zero
      0x00, // zero
      0xee, // SN[8]
      0x00, // SN[4] zeroed
      0x00, // SN[5] zeroed
      0x00, // SN[6] zeroed
      0x00, // SN[7] zeroed
      0x01, // SN[0]
      0x23, // SN[1]
      0x00, // SN[2]
      0x00, // SN[3]
      0x01, // SlotLocked
      0x00, // PubKey valid
      0x00, // zero
    ]);

    const hashThree = utils.sha256(temp).slice(2);
    // Call signature verification - works with either slot locked or not
    if (!verifySignature(hashThree, publicKey, signature)) {
      const hashThreeSlotUnlocked = utils.sha256(tempSlotUnlocked);
      return verifySignature(hashThreeSlotUnlocked, publicKey, signature);
    } else {
      return verifySignature(hashThree, publicKey, signature);
    }
  };
  const verifySignature = (
    msgHash: string,
    publicKeyLong: string,
    signatureLong: string,
  ) => {
    console.log(`BEGIN SIGNATURE VERIFICATION (in ms): ${Date.now()}`);
    console.log(msgHash.length, publicKeyLong.length, signatureLong.length);
    // Return false if format of variables is unexpected.
    if (msgHash.length != 66 && msgHash.length != 64) {
      return false;
    }
    if (signatureLong.length != 128) {
      return false;
    }
    if (publicKeyLong.length != 130 && publicKeyLong.length != 128) {
      return false;
    }

    // Remove leading '0x' in msgHash.
    if (msgHash.length === 66 && msgHash.slice(0, 2) === '0x') {
      msgHash = msgHash.slice(2);
    }

    // Remove leading '04' in publicKey.
    if (publicKeyLong.length === 130 && publicKeyLong.slice(0, 2) === '04') {
      publicKeyLong = publicKeyLong.slice(2);
    }

    // Reformat key and signature so elliptic package can handle them.
    const pub = {
      x: publicKeyLong.slice(0, publicKeyLong.length / 2),
      y: publicKeyLong.slice(publicKeyLong.length / 2),
    };
    console.log(pub, 'PUUB');
    const key = state.curveData.curveP256.keyFromPublic(pub, 'hex');
    // Reformat signature to one of several acceptable formats: {r :r , s: s}
    const signature = {
      r: signatureLong.slice(0, signatureLong.length / 2),
      s: signatureLong.slice(signatureLong.length / 2),
    };
    // Verify.
    const verified = key.verify(msgHash, signature);
    console.log(msgHash, signature);
    console.log(`END SIGNATURE VERIFICATION (in ms): ${Date.now()}`);

    return verified;
  };

  return {
    verifyEscrow,
    verifyMerkleProof,
    verifyUnknownDevice,
    verifyInternalSignature,
    verifySignature,
  };
};
