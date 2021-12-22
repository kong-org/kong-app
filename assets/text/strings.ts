import LocalizedStrings from 'react-native-localization';

const strings = new LocalizedStrings({
  'en-US': {
    // Launch.
    textLaunchOpen: 'Syncing with nodes...',
    textLaunchProgress: 'Caching merkle roots',

    // Buttons.
    textButtonScan: 'SCAN',
    textButtonClaim: 'CLAIM',
    textButtonRetry: 'RETRY',
    textButtonGetStarted: 'GET STARTED',
    textButtonLoading: 'SKIP SYNC',
    textButtonDetails: 'GET INSTRUCTIONS',

    // Home.
    textHomeDescription:
      'A KONG SiLo is a physical NFT. Scan a SiLo tag via NFC to make sure it is authentic.', // 'Kong is a physical cryptocurrency. Scan Kong notes via NFC to make sure they are real.'
    textHomeHeading: 'WHAT IS KONG?',
    textHomeNfcDisabled:
      'Your device is capable of NFC scanning but NFC is disabled. To enable NFC, ',
    textHomeNfcDisabledClick: 'CLICK HERE',
    textHomeNfcNotSupported: 'NFC NOT SUPPORTED',
    textHomeHoldScan: 'Hold Tag to Scan',

    // Settings
    textSettingsHeading: 'THIS IS KONG.',
    textSettingsDescription:
      'KONG SiLos are physical crypto assets. This app verifies the authenticity of SiLos including KONG Cash, Passports and merch using elliptic curve cryptography and the Ethereum blockchain.',
    textSettingsTellMeMore: 'TELL ME MORE!',
    textSettingsFAQ: 'FAQ & PRIVACY',
    textSettingsScanTypeHeading: 'SCAN TYPE',
    textSettingsWalletHeading: 'WALLET',
    textSettingsScanFullVerification: 'Full verfication scan',
    textSettingsScanQuickVerification: 'Quick verification scan',
    textSettingsSettingsHeading: 'GATEWAY NODES',
    textSettingsReset: '\nTap here to reset to default.',
    textSettingsResetPending:
      '\nSyncing with nodes, this will take a moment...',
    textSettingsResetProgress: '\nSyncing device merkle root',
    textSettingsResetFail: '\nFailed to sync, tap to retry.',
    textScanTypeDescriptionQuickOnly:
      'Full verfication is only available on iOS 13+.',
    textScanTypeDescription:
      'Quick verfication confirms the SiLo signed a recent blockhash, but it does not challenge the note directly. Full verfication challenges the secure element, but it is slower, and may not work on all smartphones.',

    // Processing
    textProcessingHeading: 'STAY STILL',
    textProcessingBody: 'Keep your phone on the device',
    // NFC Scan: iOS Specific.
    textProcessingNewTag: 'Beginning verification...',
    textProcessingTouchNote: 'Hold phone near SiLo to scan',
    textProcessingQuickTouchNote: 'Hold phone near SiLo to scan',
    textProcessingNoteDetected: "Tag detected, don't move while scanning",
    textProcessingUniqueInfo:
      "Getting unique tag information, don't move while scanning",
    textProcessingSendingChallenge:
      "Sending challenge, this will take a moment, don't move while scanning",
    textProcessingReadingResults: "Reading results, don't move while scanning",
    textProcessingPreparingResults: 'Scan complete, preparing results...',
    textProcessingVerificationStart: 'Preparing results...',

    // Results.
    textResultsBlockchainNodeDescription:
      'Blockchain checks based on data from node at',
    textResultsUnknownDevice:
      'The tag you scanned is not registered or the blockchain is currently unreachable. The checks below therefore only verify the presence of cryptographic keys, assuming the format a registered tag would have. The checks do not provide ANY guarantees.',
    textResultsKongVerificationDescription:
      '' +
      'You can use the results of this scan to manually verify the authenticity of your SiLo. Tap below to get detailed verification instructions:',
    textResultsKongVerificationInstructions:
      '' +
      '== KONG VERIFICATION ==' +
      '\n\n' +
      'This readme walks you through the steps needed to verify the authenticity of your SiLo. The data below is from your latest scan. Every SiLo and every scan will change some part of the data. This is expected. The rationale behind the steps below is explored in more detail on our website.' +
      '\n\n' +
      '----' +
      '\n\n' +
      'HARDWARE / KEY VERIFICATION.' +
      '\n\n' +
      'A unique cryptographic key provides the secure link between your SiLo and the digital Kong token it owns. Verifying the authenticity of a SiLo thus requires verification of the key`s presence.' +
      '\n\n' +
      'Your SiLo stores public key 0x{0}. The app has asked the SiLo to sign a randomly generate challenge to verify that the SiLo indeed houses this key. The challenge was built in two steps:' +
      '\n\n' +
      'First, the phone used the internal random number generator to create a random number:\n' +
      '0x{1}' +
      '\n\n' +
      'Next, the app downloaded the most recent block from the Ethereum blockchain. The obtained blockhash was:\n' +
      '0x{2}' +
      '\n\n' +
      'The phone then combined these two variables into the following hash:\n' +
      '0x{3}' +
      '\n\n' +
      'Finally, the phone asked the SiLo to sign this hash. The SiLo returned the following signature:\n' +
      '0x{4}' +
      '\n\n' +
      'To verify the integrity of this challenge and the response, do the following:\n' +
      '   - verify the recency of the signed blockhash\n' +
      '   - verify that the combined hash is the sha256 hash of the random number generated by the phone and the blockhash\n' +
      '   - verify that the signature is valid\n' +
      '\n\n' +
      'Passing all steps indicates that the SiLo indeed houes this public key.' +
      '\n\n' +
      '----' +
      '\n\n' +
      'BLOCKCHAIN VERIFICATION' +
      '\n\n' +
      'Your SiLo is linked to a smart contract on the Ethereum blockchain at address {5}. This smart contract owns {6} {7}.' +
      '\n\n' +
      'To check the smart contract`s code, visit etherscan.io or any other blockchain explorer and paste in the contract`s address. The contract`s logic is extremely simple and should reveal that only the public key associated with this SiLo will ultimately be able to claim the contract`s balance.' +
      '\n\n' +
      'The contract also contains the addresses of the elliptic curve contract that verifies the SiLo`s signatures as well as the address of the associated token contract. To verify that the smart contract indeed owns the abovementioned balance, use etherscan.io or any other blockchain explorer, paste the address of the token contract at {8} and check the balance of address {5}.',

    // Fail texts.
    // Unknown tag type.
    textFailDefaultWarning: 'Something went wrong',
    textFailDefaultDescription: 'Please retry',
    // Unknown tag type.
    textFailUnknownTagTypeWarning: 'UNKNOWN TAG FORMAT',
    textFailUnknownTagTypeDescription: 'Could not identify the tag format.',

    // NFC Tech Support.
    textFailNfcSupportWarning: 'NFC NOT SUPPORTED',
    textFailNfcSupportDescription: 'This device does not seem to support NFC.',

    // NFC Tech Request.
    textFailNfcTechRequestWarning: 'NFC TECH REQUEST FAILURE',
    textFailNfcTechRequestDescription: 'Failed to request NFC tech.',

    // NFC Timeout.
    textFailTimeoutWarning: 'NFC CONNECTION FAILURE',
    textFailTimeoutDescription:
      'Failed to reopen NFC connection after timeout. Change SiLo orientation and rescan.',

    // NFC Read Tag Configuration.
    textFailNfcReadConfigWarning: 'NFC READ CONFIG FAILURE',
    textFailNfcReadConfigDescription: 'Could not read tag configuration.',

    // NFC Read Tag Configuration.
    textFailNfcReadInfoWarning: 'NFC READ INFO FAILURE',
    textFailNfcReadInfoDescription: 'Could not read tag info.',

    // NFC Read Hash.
    textFailNfcReadHashesWarning: 'NFC READ FAILURE',
    textFailNfcReadHashesDescription: 'Could not read hashes.',

    // NFC Write Input.
    textFailNfcWriteInputWarning: 'NFC WRITE FAILURE',
    textFailNfcWriteInputDescription: 'Could not write NFC challenge.',

    // NFC read last NDEF warning.
    textFailNfcReadLastNdefWarning: 'NFC READ FAILURE',
    textFailNfcReadLastNdefDescription: 'Could not read last NDEF block.',

    // NFC read signatures.
    textFailNfcReadSignaturesWarning: 'NFC READ FAILURE',
    textFailNfcReadSignaturesDescription: 'Could not read signatures.',

    // Blockchain Check Registration.
    textFailBlockchainCheckRegistrationWarning: 'BLOCKCHAIN FAILURE',
    textFailBlockchainCheckRegistrationDescription:
      'Could not check contract registration.',

    // Blockchain Get Latest Block.
    textFailBlockchainGetLatestBlockAndRegistrationWarning:
      'BLOCKCHAIN FAILURE',
    textFailBlockchainGetLatestBlockAndRegistrationDescription:
      'Could not get blockchain data (Latest Block / Registration).',

    // Blockchain Get State and Code.
    textFailBlockchainGetStateAndCodeWarning: 'BLOCKCHAIN FAILURE',
    textFailBlockchainGetStateAndCodeDescription:
      'Could not get contract code and state.',

    // Blockchain Get ERC20 data.
    textFailBlockchainGetERC20DataWarning: 'BLOCKCHAIN FAILURE',
    textFailBlockchainGetERC20DataDescription: 'Could not get ERC20 data.',

    // Blockchain Contract Type.
    textFailBlockchainUnknownContractWarning: 'BLOCKCHAIN FAILURE',
    textFailBlockchainUnknownContractDescription: 'Unknown contract type.',

    // RNG.
    textFailRngWarning: 'RNG Failure',
    textFailRngDescription:
      'Could not create random number using operating system of phone.',

    // Delay.
    textFailDelayWarning: 'Timing Failure',
    textFailDelayDescription: 'Failed during timeout.',

    // FAQ.
    textFAQQuestion1: 'What happens to my data?',
    textFAQAnswer1:
      'This app does not store any of your scans or personal data.',

    textFAQQuestion3: 'Why do my NFC scans fail?',
    textFAQAnswer3:
      'The reliability of NFC varies between phones. When scanning, be sure to position the SiLo close to the NFC antenna and try to hold it still during the scanning process. Consult the internet if you do not know where the NFC antenna is located in your phone.',

    textFAQQuestion4: 'The app says my SiLo is invalid - What do I do?',
    textFAQAnswer4:
      'You may sometimes see invalid results due to technical issues during the scanning process. Try scanning multiple times if this happens or re-syncing the gateway nodes via the tap to reset option. Consult our website for more information on the verification process.',

    textFAQQuestion5: 'What is verification checking when I scan a SiLo?',
    textFAQAnswer5:
      'Scanning a KONG SiLo checks several pieces of information including the ability of the SiLo to sign a random number and the existing of a smart contract backing the SiLo. Tap "Get Instructions" on the bottom of a valid scan for more information on what information is verified.',

    textFAQQuestion6: 'What does "Synching Nodes" mean?',
    textFAQAnswer6:
      'Details about devices are stored in merkle trees linked via smart contract and available via IPFS. Periodically the app must sync new merkle tree data from these nodes.',

    textFAQQuestion7: 'Why is the app failing to sync nodes?',
    textFAQAnswer7:
      'The Ethereum node may not respond correctly due to rate limiting or your location. Try re-syncing the nodes or changing the Ethereum node the app is attempting to sync from.',
  },
});

export default strings;
