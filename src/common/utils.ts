import {Dimensions, Platform} from 'react-native';
import {MMKV} from './mmkv';
import {utils} from 'ethers';
import Web3 from 'web3';

export const scale = (size: number) => {
  var {height, width} = Dimensions.get('window');

  return Math.floor(size * (height / 812) ** 0.5);
};

export const bytesToHex = (byteArray: Uint8Array | number[]) => {
  return Array.from(byteArray, function (byte) {
    return ('0' + (byte & 0xff).toString(16)).slice(-2);
  }).join('');
};
export const delay = (t: number, v = undefined) => {
  console.log(`delay called for ${t}`);
  return new Promise(function (resolve) {
    setTimeout(resolve.bind(null, v), t);
  });
};
export const hexToBytes = (hex: string) => {
  for (var bytes = [], c = 0; c < hex.length; c += 2) {
    bytes.push(parseInt(hex.substr(c, 2), 16));
  }
  return bytes;
};
export const hexToAscii = (hex: string) => {
  let str = '';
  for (let n = 0; n < hex.length; n += 2) {
    str += String.fromCharCode(parseInt(hex.substr(n, 2), 16));
  }
  return str;
};
export const createHardwareHash = (
  primaryPublicKeyHash: string,
  secondaryPublicKeyHash: string,
  tertiaryPublicKeyHash: string,
  hardwareSerialHash: string,
) => {
  const joinedHash =
    primaryPublicKeyHash +
    secondaryPublicKeyHash +
    tertiaryPublicKeyHash +
    hardwareSerialHash;
  return utils.sha256('0x' + joinedHash).slice(2);
};
export const getLocalDevice = (primaryPublicKeyHash: any) => {
  const jsonString = MMKV.getString('0x' + primaryPublicKeyHash);
  if (jsonString) {
    return JSON.parse(jsonString);
  } else {
    return undefined;
  }
};
export const asyncWrapper = async <Type>(
  promise: Promise<Type>,
  errorHandler: (error: any) => any,
) => {
  try {
    const result = await promise;
    return result;
  } catch (error) {
    errorHandler(error);
    throw error;
  }
};

export const truncateAddress = (address: string) => {
  return address.slice(0, 5) + '...' + address.slice(address.length - 4);
};
export const truncateDescription = (desc: string) => {
  if (desc.length > 150) {
    return desc.slice(0, 150) + '...';
  } else {
    return desc;
  }
};
export const createNumArray = (low: number, high: number) => {
  const array = [];
  for (let i = low; i < high; i++) {
    array.push(i);
  }
  return array;
};

export const isIOS = Platform.OS === 'ios';

export const isJSONable = (jsonString: string) => {
  try {
    var o = JSON.parse(jsonString);

    // Handle non-exception-throwing cases:
    // Neither JSON.parse(false) or JSON.parse(1234) throw errors, hence the type-checking,
    // but... JSON.parse(null) returns null, and typeof null === "object",
    // so we must check for that, too. Thankfully, null is falsey, so this suffices:
    if (o && typeof o === 'object') {
      return true;
    }
  } catch (e) {
    return false;
  }

  return false;
};

export const web3 = new Web3();
