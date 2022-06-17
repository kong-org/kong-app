import React, {useEffect} from 'react';
import {createContext, ReactNode, useContext, useState} from 'react';
import {useMMKVBoolean} from 'react-native-mmkv';
import WalletConnect from '@walletconnect/client';
import defaultSettings from '../../../assets/data/defaultSettings';
import buttonStyles from '../../../assets/styles/buttonStyles';
import strings from '../../../assets/text/strings';
import {MMKV, MMKVKeys} from '../../common/mmkv';
import {
  BlockChainData,
  ChainSettings,
  CurrentState,
  CurveData,
  NfcData,
  NfcSettings,
  PrefetchChainDataType,
  VerificationData,
} from '../../common/types';
import {getBlockchainFns} from './blockchain';
import {ec} from 'elliptic';
import {getVerificationFns} from './verification';
import {getNfcFns} from './nfc';
import {Platform} from 'react-native';
import {isJSONable} from '../../common/utils';
const GlobalStateContext = createContext<IStore | undefined>(undefined);

interface IStore {
  state: IState;
  setters: ISetters;
  methods: IMethods;
}

interface IState {
  pauseIntro: boolean;
  launchStatus: string | null;
  getStartedButtonText: string;
  getStartedButtonStyle: any;
  resetButtonText: string;
  nfcData: NfcData;
  curveData: CurveData;
  nfcSettings: NfcSettings;
  chainSettings: ChainSettings;
  blockchainData: BlockChainData;
  verificationData: VerificationData;
  fullVerification: boolean;
}
interface ISetters {
  setPauseIntro: (input: boolean) => void;
  setLaunchStatus: (input: string | null) => void;
  setGetStartedButtonStyle: (input: any) => void;
  setGetStartedButtonText: (input: string) => void;
  setResetButtonText: (input: string) => void;
  setNfcData: (input: any) => void;
  setCurveData: (input: CurveData) => void;
  setNfcSettings: (input: NfcSettings) => void;
  setChainSettings: (input: ChainSettings) => void;
  setBlockchainData: (input: BlockChainData) => void;
  setVerificationData: (input: VerificationData) => void;
  setFullVerification: (input: boolean) => void;
}
interface IMethods {
  resetToDefaultSettings: () => Promise<void>;
  createCurves: () => Promise<CurveData>;
  refreshDeviceProofs: () => Promise<void>;
  resetState: () => void;
  blockchain: {
    getBridgeData: (publicKey: string) => Promise<void>;
    loadContracts: (connector?: any) => Promise<void>;
  };
  verification: {
    verifyEscrow: () => void;
    verifyInternalSignature: (
      internalRandomNumber: string,
      externalRandomNumber: string,
      publicKey: string,
      signature: string,
    ) => boolean;
    verifyMerkleProof: () => Promise<void>;

    verifySignature: (
      msgHash: string,
      publicKeyLong: string,
      signatureLong: string,
    ) => boolean;
    verifyUnknownDevice: () => Promise<void>;
  };
  nfc: {
    nfcClaim: (walletAddress: string) => Promise<void>;
    nfcReveal: (
      walletAddress: string,
      connector: WalletConnect,
    ) => Promise<void>;
    nfcStart: () => Promise<void>;
    nfcScanStart: () => void;
    nfcQuickScan: () => Promise<void>;
    goToNfcSetting: () => Promise<void>;
  };
}

export const GlobalStoreProvider: React.FunctionComponent<{
  children: ReactNode;
  value: IStore;
}> = ({children, value}) => {
  return (
    <GlobalStateContext.Provider value={value}>
      {children}
    </GlobalStateContext.Provider>
  );
};

export const initializeGlobalStore = (): IStore => {
  // State/Setter
  const [pauseIntro, setPauseIntro] = useState(true);
  const [launchStatus, setLaunchStatus] = useState<string | null>(
    strings.textLaunchOpen,
  );
  const [getStartedButtonText, setGetStartedButtonText] = useState(
    strings.textButtonLoading,
  );
  const [getStartedButtonStyle, setGetStartedButtonStyle] = useState<any>(
    buttonStyles.buttonSecondary,
  );
  const [resetButtonText, setResetButtonText] = useState(
    strings.textSettingsReset,
  );
  const [nfcData, setNfcData] = useState({});
  const [curveData, setCurveData] = useState({} as CurveData);
  const [nfcSettings, setNfcSettings] = useState({});
  const [chainSettings, setChainSettings] = useState<ChainSettings>(
    {} as ChainSettings,
  );

  const fetchDefaults = async () => {
    let data: any;
    try {
      const response = await (
        await fetch(`${chainSettings.bridgeNode}/defaults`)
      ).text();
      data = isJSONable(response) && JSON.parse(response);
    } catch (e) {
      console.log(e);
    }
    // chainSettings set in order of MMKV > bridgeDefaults > localDefaults
    setChainSettings(prevState => ({
      ...prevState,
      ethNode:
        MMKV.getString(MMKVKeys.ETH_NODE) ??
        data?.ethNode ??
        defaultSettings.ethNode,
      ipfsNode:
        MMKV.getString(MMKVKeys.IPFS_NODE) ??
        data?.ipfsNode ??
        defaultSettings.ipfsNode,
      bridgeNode:
        MMKV.getString(MMKVKeys.BRIDGE_NODE) ?? defaultSettings.bridgeNode,
      registerAddress:
        (MMKV.getString(MMKVKeys.REGISTER_ADDRESS) &&
          JSON.parse(MMKV.getString(MMKVKeys.REGISTER_ADDRESS)!)) ??
        data?.contracts ??
        defaultSettings.registerAddress,
    }));
  };
  useEffect(() => {
    fetchDefaults();
  }, [chainSettings.bridgeNode]);

  const [blockchainData, setBlockchainData] = useState<BlockChainData>(
    {} as BlockChainData,
  );
  const [verificationData, setVerificationData] = useState(
    {} as VerificationData,
  );
  const [fullVerification, setFullVerification] =
    useMMKVBoolean('fullVerification');

  const [headlessVerification, setHeadlessVerification] =
    useState<boolean>(false);

  // TODO: fix anti-pattern => loading state into a object to be used amongst methods
  // since state is async and will not update within a single render
  const currentState: CurrentState = {
    nfcData,
    nfcSettings,
    curveData,
    chainSettings,
    blockchainData,
    verificationData,
    fullVerification,
    headlessVerification,
  };

  // Methods
  const {
    fetchChainData,
    getBridgeData,
    loadContracts,
    prefetchChainData,
    writeChainData,
  } = getBlockchainFns({
    state: currentState,
    setBlockchainData,
    setChainSettings,
    setLaunchStatus,
    setResetButtonText,
  });

  const {
    verifyEscrow,
    verifyInternalSignature,
    verifyMerkleProof,
    verifySignature,
    verifyUnknownDevice,
  } = getVerificationFns({
    state: currentState,
    setVerificationData,
  });

  const {
    nfcClaim,
    nfcStart,
    nfcScanStart,
    nfcQuickScan,
    goToNfcSetting,
    nfcReveal,
  } = getNfcFns({
    state: currentState,
    prefetchChainData,
    fetchChainData,
    setNfcData,
    setHeadlessVerification,
    setNfcSettings,
    verifyUnknownDevice,
    verifyMerkleProof,
    getBridgeData,
    verifyEscrow,
    writeChainData,
  });

  const resetToDefaultSettings = async () => {
    try {
      await loadContracts();
      await prefetchChainData(PrefetchChainDataType.GET_DEVICE_PROOFS);
    } catch (error) {
      setResetButtonText(strings.textSettingsResetFail);
    }
  };

  const createCurves: () => Promise<CurveData> = async () => {
    return new Promise(function (resolve) {
      const curveP256 = new ec('p256');
      const interval = setInterval(function () {
        if (curveP256 !== undefined) {
          clearInterval(interval);
          const result = {curveP256: curveP256};
          resolve(result);
        }
      }, 50);
    });
  };

  const refreshDeviceProofs = async () => {
    // Compare the stored device root count to the server number to see if we need to retrieve.
    let latestDeviceRootCount = await prefetchChainData(
      PrefetchChainDataType.GET_DEVICE_ROOT_COUNT,
    );

    // textButtonLoading -- should be default
    const storedDeviceRootCount = MMKV.getNumber(MMKVKeys.DEVICE_ROOT_COUNT);

    if (
      storedDeviceRootCount < 1 ||
      storedDeviceRootCount != latestDeviceRootCount
    ) {
      // TODO: block user? show indication that roots are loading?
      console.log(
        `proof count ${storedDeviceRootCount} does not match ${latestDeviceRootCount}, reload.`,
      );
      try {
        await prefetchChainData(PrefetchChainDataType.GET_DEVICE_PROOFS);

        console.log(`swap button info after getting proofs.`);
      } catch (err) {
        console.log(err);
        console.log(`warning, error in sync.`);
      }
    } else {
      console.log(`proof count matches, swap.`);
    }
    setLaunchStatus(null);
    setGetStartedButtonText(strings.textButtonGetStarted);
    setGetStartedButtonStyle(buttonStyles.buttonPrimary);
  };

  const resetState = () => {
    // Ensure that Android phone restarts scanning.
    if (Platform.OS === 'android') {
      // this._nfcAndroidScan();
    }

    // Maintain chainSettings and nfcSettings.
    setNfcData({} as NfcData);
    setBlockchainData({} as BlockChainData);
    setVerificationData({} as VerificationData);
    setHeadlessVerification(false);
    nfcStart();
  };

  return {
    state: {
      pauseIntro,
      launchStatus,
      getStartedButtonText,
      getStartedButtonStyle,
      resetButtonText,
      nfcData,
      curveData,
      nfcSettings,
      chainSettings,
      blockchainData,
      verificationData,
      fullVerification,
    },
    setters: {
      setPauseIntro,
      setLaunchStatus,
      setGetStartedButtonStyle,
      setGetStartedButtonText,
      setResetButtonText,
      setNfcData,
      setCurveData,
      setNfcSettings,
      setChainSettings,
      setBlockchainData,
      setVerificationData,
      setFullVerification,
    },
    methods: {
      resetToDefaultSettings,
      createCurves,
      refreshDeviceProofs,
      resetState,
      blockchain: {
        loadContracts,
        getBridgeData,
      },
      verification: {
        verifyEscrow,
        verifyInternalSignature,
        verifyMerkleProof,
        verifySignature,
        verifyUnknownDevice,
      },
      nfc: {
        nfcClaim,
        nfcReveal,
        nfcStart,
        nfcScanStart,
        nfcQuickScan,
        goToNfcSetting,
      },
    },
  };
};

export const useGlobalStore = (): IStore => {
  const globalStore = useContext(GlobalStateContext);
  if (!globalStore) {
    throw new Error(
      'useGlobalContext init error, you may have tried to use context outside of a provider',
    );
  }
  return globalStore;
};
