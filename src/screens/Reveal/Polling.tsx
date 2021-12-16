import {NativeStackNavigationProp} from '@react-navigation/native-stack/lib/typescript/src/types';
import React, {FC} from 'react';
import {Dimensions, StatusBar, StyleSheet, Text, View} from 'react-native';

import {RootStackParamList} from '../Routes/RootStackParamList';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useHeaderHeight} from '@react-navigation/elements';
import {LinearProgress} from 'react-native-elements';
import {Video} from 'expo-av';
import {useVideoRef} from '../../hooks/useVideoRef';
import {scale} from '../../common/utils';

const {height, width} = Dimensions.get('screen');
interface IPolling {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Polling'>;
}

export const Polling: FC<IPolling> = ({navigation}) => {
  const headerHeight = useHeaderHeight();
  const {video} = useVideoRef();
  const PollingStyles = PollingStylesFn(headerHeight);
  return (
    <View style={PollingStyles.viewPolling}>
      <StatusBar barStyle="light-content" />

      <SafeAreaView style={PollingStyles.viewPollingBody}>
        <View style={PollingStyles.viewPollingContainer}>
          <Video
            ref={video}
            source={{
              uri: 'https://storage.googleapis.com/kong-assets/kong-card.mp4',
            }}
            style={{width: width, height: height * 0.7, marginBottom: 29}}
            isLooping
            resizeMode="cover"
          />

          <Text style={PollingStyles.textPolling}>
            Polling Wallet Connect...
          </Text>
          <LinearProgress
            style={{marginTop: 35}}
            color="#2BFF88"
            trackColor="#434348"
            value={50}
          />
        </View>
      </SafeAreaView>
    </View>
  );
};
// Styles
const PollingStylesFn = (headerHeight: number) =>
  StyleSheet.create({
    viewPolling: {
      backgroundColor: '#000000',
      color: '#FFFFFF',
      height: height,
      width: width,
    },

    viewPollingBody: {
      position: 'absolute',
      height: height - headerHeight,
    },
    viewPollingContainer: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    viewDetectedButtonContainer: {
      paddingLeft: scale(25),
      paddingRight: scale(25),
    },
    viewDetectedButton: {display: 'flex', alignItems: 'center'},
    textPolling: {
      textAlign: 'center',
      color: '#FFFFFF',
      fontFamily: 'RobotoMono-Regular',
      fontSize: scale(15),
      lineHeight: scale(22),
      maxWidth: scale(260),
    },
  });
