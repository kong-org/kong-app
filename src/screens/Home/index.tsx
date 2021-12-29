import {NativeStackNavigationProp} from '@react-navigation/native-stack/lib/typescript/src/types';
import React, {FC, useState} from 'react';
import {
  Dimensions,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {Button} from 'react-native-elements';
import buttonStyles from '../../../assets/styles/buttonStyles';
import strings from '../../../assets/text/strings';
import {RootStackParamList} from '../Routes/RootStackParamList';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useGlobalStore} from '../../hooks/use-global-store';
import {useHeaderHeight} from '@react-navigation/elements';
import {Modal} from './Modal';
import {useWallet} from '../../hooks/useWallet';
import {isIOS, scale} from '../../common/utils';
import {useWalletConnect} from '@walletconnect/react-native-dapp';
import NfcManager from 'react-native-nfc-manager';
import {navigate} from '../../common/RootNavigation';
const {height, width} = Dimensions.get('window');
interface IHome {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
}

const ASSETS = '../../../assets';

export const Home: FC<IHome> = ({navigation}) => {
  const headerHeight = useHeaderHeight();
  const HomeStyles = HomeStylesFn(headerHeight);

  const {
    state: {
      nfcSettings: {nfcSupported},
    },
    methods: {
      nfc: {nfcScanStart, nfcClaim, goToNfcSetting, nfcStart},
    },
  } = useGlobalStore();
  const connector = useWalletConnect();
  const {walletAddress, connected} = useWallet(connector);
  const [isConnectWalletModalVisible, setIsConnectWalletModalVisible] =
    useState(false);

  const [isConfigureNFCVisible, setIsConfigureNFCVisible] = useState(false);

  const claimHandler = async () => {
    if (!connected) {
      setIsConnectWalletModalVisible(true);
    } else {
      await nfcClaim(walletAddress!);
    }
  };

  const nfcStartHandler = async () => {
    if (isIOS) {
      nfcScanStart();
    } else {
      const isNfcEnabled = await NfcManager.isEnabled();
      if (!isNfcEnabled) {
        setIsConfigureNFCVisible(true);
      } else {
        await nfcStart();
        nfcScanStart();
      }
    }
  };

  const connectWalletModalFn = async () => {
    try {
      await connector.connect();
    } catch (e) {
      console.log(e);
    }
  };

  return (
    <View style={HomeStyles.viewHome}>
      <StatusBar barStyle="light-content" />
      <View style={HomeStyles.ViewHomeImage}>
        <Image
          source={require(ASSETS + '/img/kong-scan.png')}
          style={{width: '100%', height: '100%'}}
        />
      </View>
      <SafeAreaView style={HomeStyles.viewHomeBody}>
        <View style={HomeStyles.viewHomeContainer}>
          <Text style={HomeStyles.textHomeQuestion}>
            {strings.textHomeHeading}
          </Text>
          <Text style={HomeStyles.textHomeDescription}>
            {strings.textHomeDescription}
          </Text>
          <View style={HomeStyles.viewHomeButtonContainer}>
            <Button
              title={
                nfcSupported
                  ? strings.textButtonScan
                  : strings.textHomeNfcNotSupported
              }
              titleStyle={HomeStyles.textButtonScan}
              buttonStyle={buttonStyles.buttonPrimary}
              onPress={nfcSupported ? nfcStartHandler : () => {}}
            />
            {nfcSupported && (
              <Button
                type="outline"
                title={strings.textButtonClaim}
                titleStyle={HomeStyles.textButtonClaim}
                buttonStyle={buttonStyles.buttonSecondary}
                onPress={claimHandler}
              />
            )}
          </View>
        </View>
      </SafeAreaView>
      <Modal
        isVisible={isConnectWalletModalVisible}
        setIsVisible={setIsConnectWalletModalVisible}
        header={'CONNECT YOUR WALLET'}
        body={
          ' Your account is not associated with any wallet. Please add your wallet to continue claiming an item.'
        }
        onPressFn={connectWalletModalFn}
      />
      {!isIOS && (
        <Modal
          isVisible={isConfigureNFCVisible}
          setIsVisible={setIsConfigureNFCVisible}
          header={'Enable NFC'}
          body={
            'Your device is capable of NFC scanning but NFC is disabled. To enable NFC, press the button below'
          }
          onPressFn={goToNfcSetting}
        />
      )}
    </View>
  );
};

// Styles
const HomeStylesFn = (headerHeight: number) =>
  StyleSheet.create({
    viewHome: {
      backgroundColor: '#000000',
      color: '#FFFFFF',
      height: height,
      width: width,
    },
    ViewHomeImage: {
      position: 'absolute',
      width,
      height: height * 0.5,
    },
    viewHomeBody: {
      // position: 'absolute',
      height: height - headerHeight,
      display: 'flex',
      justifyContent: 'flex-end',
    },
    viewHomeContainer: {
      paddingLeft: 25,
      paddingRight: 25,
    },
    viewHomeButtonContainer: {display: 'flex', alignItems: 'center'},
    textHomeQuestion: {
      color: '#FFFFFF',
      fontFamily: 'EduFavoritExpanded-Bold',
      fontSize: scale(20),
      lineHeight: scale(28),
      marginBottom: scale(10),
    },
    textHomeDescription: {
      color: '#9C9CB0',
      fontFamily: 'RobotoMono-Regular',
      fontSize: scale(16),
      lineHeight: scale(28),
      marginBottom: scale(24),
    },
    textButtonScan: {
      color: '#000000',
      fontFamily: 'EduFavoritExpanded-Regular',
      fontSize: scale(15),
      fontWeight: 'bold',
    },
    textButtonClaim: {
      color: '#2BFF88',
      fontFamily: 'EduFavoritExpanded-Regular',
      fontSize: scale(15),
      fontWeight: 'bold',
    },
  });
