import {
  LinkingOptions,
  NavigationContainer,
  useNavigation,
} from '@react-navigation/native';
import React, {useEffect} from 'react';
import {Linking, Platform, Text} from 'react-native';
import {MMKV, MMKVKeys} from './src/common/mmkv';
import {Routes} from './src/screens/Routes';
import {
  GlobalStoreProvider,
  initializeGlobalStore,
  useGlobalStore,
} from './src/hooks/use-global-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import WalletConnectProvider from '@walletconnect/react-native-dapp';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {navigationRef} from './src/common/RootNavigation';
import {RootStackParamList} from './src/screens/Routes/RootStackParamList';
import {isIOS} from './src/common/utils';

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['kong://'],
  config: {
    screens: {
      Home: 'home',
    },
  },
};

const Inner = () => {
  const navigation = useNavigation();
  const {
    setters: {setCurveData},
    methods: {
      createCurves,
      blockchain: {loadContracts},
      nfc: {nfcStart},
    },
  } = useGlobalStore();

  const initLoad = async () => {
    Linking.addEventListener('url', (event: {url: any}) =>
      console.log(event.url),
    );

    await nfcStart();

    createCurves().then(curveData => {
      setCurveData(curveData);
    });
    await loadContracts();
    navigation.navigate('FirstLaunch' as any);
  };

  useEffect(() => {
    initLoad();
  }, []);

  return <Routes />;
};

const App = () => {
  const globalStore = initializeGlobalStore();

  return (
    <GlobalStoreProvider value={globalStore}>
      <SafeAreaProvider>
        <NavigationContainer
          linking={linking}
          ref={navigationRef}
          fallback={<Text>Loading...</Text>}>
          <WalletConnectProvider
            redirectUrl={
              Platform.OS === 'web'
                ? //@ts-ignore
                  window.location.origin
                : 'KONG://'
            }
            clientMeta={{
              description: 'Kong Land',
              url: 'https://kong.land',
              icons: ['https://kong.land/images/logo.svg'],
              name: 'Kong',
            }}
            storageOptions={{
              asyncStorage: AsyncStorage as any,
            }}>
            <Inner />
          </WalletConnectProvider>
        </NavigationContainer>
      </SafeAreaProvider>
    </GlobalStoreProvider>
  );
};

export default App;
