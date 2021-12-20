import {NativeStackNavigationProp} from '@react-navigation/native-stack/lib/typescript/src/types';
import React, {FC} from 'react';
import {Dimensions, StatusBar, StyleSheet, Text, View} from 'react-native';

import {RootStackParamList} from '../Routes/RootStackParamList';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useHeaderHeight} from '@react-navigation/elements';
import {LinearProgress} from 'react-native-elements';
import {useVideoRef} from '../../hooks/useVideoRef';
import {scale} from '../../common/utils';
import {Video} from '../../components/Video';
import {RouteProp} from '@react-navigation/native';

const {height, width} = Dimensions.get('window');
interface IPolling {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Polling'>;
  route: RouteProp<RootStackParamList, 'Polling'>;
}

export const Polling: FC<IPolling> = ({navigation, route}) => {
  const headerHeight = useHeaderHeight();
  const PollingStyles = PollingStylesFn(headerHeight);
  const message = route.params?.message;

  return (
    <View style={PollingStyles.viewPolling}>
      <StatusBar barStyle="light-content" />

      <SafeAreaView style={PollingStyles.viewPollingBody}>
        <View style={PollingStyles.viewPollingContainer}>
          <Video
            source={{
              uri: 'https://storage.googleapis.com/kong-assets/kong-card.mp4',
            }}
            isMuted
          />

          <Text style={PollingStyles.textPolling}>{Polling}</Text>
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
      width: width,
    },
    viewPollingContainer: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
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
