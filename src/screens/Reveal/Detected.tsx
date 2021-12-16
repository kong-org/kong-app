import {NativeStackNavigationProp} from '@react-navigation/native-stack/lib/typescript/src/types';
import React, {FC} from 'react';
import {Dimensions, StatusBar, StyleSheet, Text, View} from 'react-native';
import {Button} from 'react-native-elements';
import buttonStyles from '../../../assets/styles/buttonStyles';
import {RootStackParamList} from '../Routes/RootStackParamList';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useGlobalStore} from '../../hooks/use-global-store';
import {useHeaderHeight} from '@react-navigation/elements';
import {useWallet} from '../../hooks/useWallet';
import {Video} from 'expo-av';
import {useVideoRef} from '../../hooks/useVideoRef';
import {scale} from '../../common/utils';

const {height, width} = Dimensions.get('screen');
interface IDetected {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Detected'>;
}

export const Detected: FC<IDetected> = ({navigation}) => {
  const headerHeight = useHeaderHeight();
  const {walletAddress, connector} = useWallet();
  const {
    methods: {
      nfc: {nfcReveal},
    },
  } = useGlobalStore();
  const {video} = useVideoRef();

  const DetectedStyles = DetectedStylesFn(headerHeight);
  return (
    <View style={DetectedStyles.viewDetected}>
      <StatusBar barStyle="light-content" />

      <SafeAreaView style={DetectedStyles.viewDetectedBody}>
        <View style={DetectedStyles.viewDetectedContainer}>
          <Video
            ref={video}
            source={{
              uri: 'https://storage.googleapis.com/kong-assets/kong-card.mp4',
            }}
            style={{width: 350, height: 350, marginBottom: 29}}
            isLooping
            // onPlaybackStatusUpdate={status => setStatus(() => status)} used to log video info
            resizeMode="cover"
          />
          <View style={{alignItems: 'center'}}>
            <Text style={DetectedStyles.textDetectedId}>KONG ID DETECTED</Text>
            <Text style={DetectedStyles.textDetectedBody}>
              Link your ID to your wallet below, to reveal your Kong Land
              identity.
            </Text>
          </View>
        </View>
        <View style={DetectedStyles.viewDetectedButtonContainer}>
          <View style={DetectedStyles.viewDetectedButton}>
            <Button
              title={'REVEAL'}
              titleStyle={DetectedStyles.textButtonReveal}
              buttonStyle={buttonStyles.buttonPrimary}
              onPress={() => {
                nfcReveal(walletAddress!, connector);
                video.current?.pauseAsync();
              }}
            />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
};
// Styles
const DetectedStylesFn = (headerHeight: number) =>
  StyleSheet.create({
    viewDetected: {
      backgroundColor: '#000000',
      color: '#FFFFFF',
      height: height,
      width: width,
    },
    viewDetectedBody: {
      position: 'absolute',
      height: height - headerHeight,
      width: width,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    viewDetectedContainer: {
      paddingLeft: scale(30),
      paddingRight: scale(30),
    },
    viewDetectedButtonContainer: {
      paddingLeft: scale(25),
      paddingRight: scale(25),
    },
    viewDetectedButton: {display: 'flex', alignItems: 'center'},
    textDetectedId: {
      color: '#FFFFFF',
      fontFamily: 'EduFavoritExpanded-Bold',
      fontSize: scale(20),
    },
    textDetectedBody: {
      textAlign: 'center',
      color: '#FFFFFF',
      fontFamily: 'RobotoMono-Regular',
      fontSize: scale(15),
      lineHeight: scale(22),
      maxWidth: scale(260),
    },
    textButtonReveal: {
      color: '#000000',
      fontFamily: 'EduFavoritExpanded-Regular',
      fontSize: scale(15),
      fontWeight: 'bold',
    },
  });