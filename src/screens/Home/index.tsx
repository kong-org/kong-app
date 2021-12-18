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
import {VerifyBeforeClaimModal} from './VerifiyBeforeClaimModal';
import {useWallet} from '../../hooks/useWallet';
import {scale} from '../../common/utils';
import {useWalletConnect} from '@walletconnect/react-native-dapp';

const {height, width} = Dimensions.get('screen');
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
      fullVerification,
    },
    methods: {
      nfc: {nfcScanStart, nfcClaim},
    },
  } = useGlobalStore();
  const connector = useWalletConnect();
  const {walletAddress, connected} = useWallet(connector);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const claimHandler = async () => {
    console.log(connected);
    if (!connected) {
      setIsModalVisible(true);
    } else {
      await nfcClaim(walletAddress!);
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
              onPress={nfcSupported ? nfcScanStart : () => {}}
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
      <VerifyBeforeClaimModal
        isVisible={isModalVisible}
        setIsVisible={setIsModalVisible}
      />
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
      position: 'absolute',
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
