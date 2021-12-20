import {NativeStackNavigationProp} from '@react-navigation/native-stack/lib/typescript/src/types';
import React, {FC, useEffect, useRef} from 'react';
import {
  Animated,
  Dimensions,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {Button} from 'react-native-elements';
import buttonStyles from '../../../assets/styles/buttonStyles';
import {RootStackParamList} from '../Routes/RootStackParamList';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useHeaderHeight} from '@react-navigation/elements';
import {RouteProp} from '@react-navigation/native';
import {scale} from '../../common/utils';
import {Video} from '../../components/Video';
import {useGlobalStore} from '../../hooks/use-global-store';

const {height, width} = Dimensions.get('window');
interface IReveal {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Reveal'>;
  route: RouteProp<RootStackParamList, 'Reveal'>;
}

export const Reveal: FC<IReveal> = ({route, navigation}) => {
  const {
    revealDetails: {tokenId, image},
  } = route.params;

  const headerHeight = useHeaderHeight();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const RevealStyles = RevealStylesFn(headerHeight);
  const imageId = image?.split('/')[2];
  const {
    state: {nfcData},
    methods: {
      blockchain: {getBridgeData},
      verification: {verifyMerkleProof},
    },
  } = useGlobalStore();
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 5000,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);
  const verificationFn = async () => {
    await getBridgeData(nfcData.nfcReadInfoPrimaryPublicKey!);
    await verifyMerkleProof();
  };
  return (
    <View style={{...RevealStyles.viewReveal}}>
      <StatusBar barStyle="light-content" />
      <Animated.View style={{opacity: fadeAnim}}>
        <SafeAreaView style={RevealStyles.viewRevealBody}>
          <Video
            source={{
              uri: `https://ipfs.io/ipfs/${imageId}`,
            }}
            style={{width, height: 350}}
            isLooping
          />
          <Text
            style={
              RevealStyles.textRevealWelcome
            }>{`WELCOME,\n CITIZEN #${parseInt(tokenId, 16)}`}</Text>
          <View
            style={{
              width: width - 2 * 25,
            }}>
            <Button
              title={'VERIFICATION DETAILS'}
              titleStyle={RevealStyles.textButtonVerification}
              buttonStyle={buttonStyles.buttonSecondary}
              onPress={verificationFn}
            />
          </View>
        </SafeAreaView>
      </Animated.View>
    </View>
  );
};
// Styles
const RevealStylesFn = (headerHeight: number) =>
  StyleSheet.create({
    viewReveal: {
      backgroundColor: '#000000',
      color: '#FFFFFF',
      height: height,
      width: width,
    },
    viewRevealBody: {
      position: 'absolute',
      height: height - headerHeight,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: width,
    },
    textRevealWelcome: {
      color: '#FFFFFF',
      textAlign: 'center',
      fontFamily: 'EduFavoritExpanded-Bold',
      fontSize: 26,
    },
    textButtonVerification: {
      color: '#2BFF88',
      fontFamily: 'EduFavoritExpanded-Regular',
      fontSize: scale(15),
      fontWeight: 'bold',
    },
  });
