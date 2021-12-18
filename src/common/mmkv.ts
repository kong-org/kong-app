import {MMKV as MMKVLibrary} from 'react-native-mmkv';

export const MMKV = new MMKVLibrary();

export enum MMKVKeys {
  PREVIOUSLY_LAUNCHED = 'previouslyLaunched',
  FULL_VERIFICATION = 'fullVerification',
  ETH_NODE = 'ethNode',
  IPFS_NODE = 'ipfsNode',
  BRIDGE_NODE = 'bridgeNode',
  REGISTER_ADDRESS = 'registerAddress',
  DEVICE_ROOT_COUNT = 'deviceRootCount',
}
