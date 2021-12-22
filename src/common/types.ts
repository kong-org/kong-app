import {ethers} from 'ethers';
import {ec} from 'elliptic';

export type ChainSettings = {
  ethNode: string;
  ipfsNode: string;
  bridgeNode: string;
  registerAddress: {
    registerMerkleRoot: string;
    oldRegistry: string;
    citizenERC20: string;
    citizenERC721: string;
    revealCitizen: string;
  };
  registerMerkleRootContract?: ethers.Contract;
  citizenERC20Contract?: ethers.Contract;
  citizenERC721Contract?: ethers.Contract;
  revealCitizenContract?: ethers.Contract;
  provider?: ethers.providers.JsonRpcProvider;
};

export type BlockChainData = {
  cid: string;
  name: string;
  root?: string;
  hardwareHash?: string;
  publicKeyHash?: string;
  description: string;
  contractAddress: string;
  verifiedProof?: boolean;
  contractERC20Address?: string;
  tokenSymbol?: string;
  tokenName?: string;
  tokenId?: string;
  hardwareManufacturer?: string;
  hardwareModel?: string;
  hardwareSerial?: string;
  hardwareConfig?: string;
  unscaledERC20Balance?: number;
  scaledERC20Balance?: number;
  registeredMintable?: string | boolean;
  contractReleaseTimestamp?: number;
  entropyContractIsMinter?: boolean;
  contractVerifierAddress?: string;
  contractEntropyAddress?: any;
  contractRegistered?: boolean;
  blockNumber?: number;
  blockHash?: string;
  blockTime?: number;
  token?: {
    nonce?: string;
    tokenAddress?: string;
    tokenId?: string;
    name?: string;
    description?: string;
    attributes?: {[key: string]: string};
    image?: string;
    revealAddress?: string;
    revealCid?: string;
  };
  contractSecondaryPublicKeyHash?: string;
  expectedUnscaledERC20Balance?: number;
  contractPublicKeyX: string;
  contractPublicKeyY: string;
  contractState?: boolean;
  contractCode?: any;
  contractVersion?: string;
  contractType?: any;
  signedBlockTime?: number | null;
  signedBlockValid?: boolean;
  ERC20OutgoingTransfer?: boolean;
  ERC20IncomingTransfer?: boolean;
};

export type NfcSettings = {
  nfcSupported?: boolean;
  nfcEnabled?: boolean;
};

export type NfcData = {
  // inputRecord
  nfcReadInputCommandCode?: string;
  nfcReadInputExternalRandomNumber?: string;
  nfcReadInputBlockhash?: string;
  nfcReadInputCombinedHash?: string;
  // outputRecord
  nfcReadOutputCommandCode?: string;
  nfcReadOutputExternalRandomNumber?: string;
  nfcReadOutputBlockhash?: string;
  nfcReadOutputCombinedHash?: string;
  nfcReadOutputInternalRandomNumber?: string;
  nfcReadOutputExternalSignature?: string;
  nfcReadOutputInternalSignature?: string;
  // infoRecord
  nfcReadInfoPrimaryPublicKey?: string;
  nfcReadInfoSecondaryPublicKey?: string;
  nfcReadInfoPrimaryPublicKeyHash?: string;
  nfcReadInfoSecondaryPublicKeyHash?: string;
  nfcReadInfoHardwareSerial?: string;
  nfcReadInfoHardwareSerialHash?: string;
  // Device information.
  localDevice?: string;
  hardwareHash?: string;
  //other
  debugCode?: string;
  nfcWrittenInputExternalRandomNumber?: string;
  nfcWrittenInputCombinedHash?: string;
  nfcWrittenInputBlockhash?: string;
  icBlockWithLastNdefRecord?: number;
  nfcReadOutputCounter?: string;
};

export type VerificationData = {
  verificationResults: {
    key: string;
    type: string;
    status: VerificationTypes;
    descriptionShort: string;
  }[];
  verificationResultsValue: {
    key: string;
    type: string;
    status: VerificationTypes;
    descriptionShort: string;
  }[];
  verificationResultsHardware: {
    key: string;
    type: string;
    status: VerificationTypes;
    descriptionShort: string;
  }[];
  verificationResult: VerificationTypes;
  verificationResultValue: VerificationTypes;
  verificationResultHardware: VerificationTypes;
  verificationResultContracts: VerificationTypes;
  verificationResultColor: string;
};

export type CurveData = {curveP256: ec};

export interface CurrentState {
  nfcData: NfcData;
  nfcSettings: NfcSettings;
  curveData: CurveData;
  chainSettings: ChainSettings;
  blockchainData: BlockChainData;
  verificationData: VerificationData;
  headlessVerification: boolean;
  fullVerification: boolean;
}

export enum PrefetchChainDataType {
  GET_DEVICE_ROOT_COUNT = 'getDeviceRootCount',
  GET_DEVICE_PROOFS = 'getDeviceProofs',
  VERIFY_DEVICE_PROOF = 'verifyDeviceProof',
  VERIFY_MINTER = 'verifyMinter',
  LATEST_BLOCK = 'latestBlock',
}
export enum FetchChainDataType {
  CONTRACT_REGISTRATION = 'contractRegistration',
  ESCROW_CONTRACT_STATE = 'escrowContractState',
  CONTRACT_CODE = 'contractCode',
  ERC20_BALANCE = 'ERC20Balance',
  ERC20_INCOMING_TRANSFER = 'ERC20IncomingTransfer',
  ERC20_OUTGOING_TRANSFER = 'ERC20OutgoingTransfer',
  LATEST_BLOCK = 'latestBlock',
  BLOCK_BY_HASH = 'blockByHash',
  GET_CITIZEN_TOKEN_ID = 'getCitizenTokenId',
}

export enum ChainMethods {
  REVEAL_CTIZEN_REVEAL_ORACLE = 'revealCitizenrevealOracle',
}

export enum NfcFailType {
  NFC_FAIL_READ_CONFIG_WARNING = 'nfcFailReadConfigWarning',
  NFC_FAIL_READ_LAST_NDEF = 'nfcFailReadLastNdef',
  NFC_FAIL_READ_INFO = 'nfcFailReadInfo',
  NFC_FAIL_READ_SIGNATURES = 'nfcFailReadSignatures',
  NFC_FAIL_READ_HASHES = 'nfcFailReadHashes',
  NFC_FAIL_TIMEOUT = 'nfcFailTimeout',
  NFC_FAIL_WRITE_INPUT = 'nfcFailWriteInput',
  NFC_FAIL_RNG = 'nfcFailRng',
}

export enum VerificationTypes {
  PASS = 'pass',
  FAIL = 'fail',
  IMPOSSIBLE = 'impossible',
  WARNING = 'warning',
}
