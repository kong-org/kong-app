import React, {FC, useEffect} from 'react';
import {Image, StyleSheet, Text, View, Dimensions} from 'react-native';
import {Button} from 'react-native-elements';
import {Video} from 'expo-av';
import {RootStackParamList} from '../Routes/RootStackParamList';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {StatusBar} from 'react-native';
import {useGlobalStore} from '../../hooks/use-global-store';
import strings from '../../../assets/text/strings';
import {useVideoRef} from '../../hooks/useVideoRef';
import {isIOS, scale} from '../../common/utils';
const {height} = Dimensions.get('screen');
interface IFirstLaunch {
  navigation: NativeStackNavigationProp<RootStackParamList, 'FirstLaunch'>;
}
const ASSETS = '../../../assets';
export const FirstLaunch: FC<IFirstLaunch> = ({navigation}) => {
  const {
    state: {
      launchStatus,
      getStartedButtonText,
      getStartedButtonStyle,
      chainSettings,
    },
    methods: {refreshDeviceProofs},
  } = useGlobalStore();
  const {video} = useVideoRef();
  useEffect(() => {
    chainSettings.registerMerkleRootContract && refreshDeviceProofs();
  }, [chainSettings.registerMerkleRootContract]);

  return (
    <View style={FirstLaunchStyles.viewFirstLaunchVideo}>
      <StatusBar barStyle="light-content" />

      <Video
        ref={video}
        source={require(ASSETS + '/kong_chip.mp4')}
        style={{width: 350, height: 350}}
        isLooping
        resizeMode="cover"
      />
      <View style={FirstLaunchStyles.viewFirstLaunchOverlay}>
        <React.Fragment>
          <View style={FirstLaunchStyles.viewFirstLaunchOverlayImage}>
            <Image source={require(ASSETS + '/img/kong-white.png')} />
          </View>

          <View>
            <Text style={FirstLaunchStyles.textLaunchStatus}>
              {launchStatus}
            </Text>

            <Button
              title={getStartedButtonText}
              titleStyle={{
                ...FirstLaunchStyles.textButtonGetStarted,
                ...{
                  color:
                    getStartedButtonText === strings.textButtonLoading
                      ? '#2BFF88'
                      : '#000000',
                },
              }}
              buttonStyle={getStartedButtonStyle}
              onPress={() => navigation.navigate('Home')}
            />
          </View>
        </React.Fragment>
      </View>
    </View>
  );
};

// Styles
const FirstLaunchStyles = StyleSheet.create({
  textLaunchStatus: {
    color: '#FFFFFF',
    fontFamily: 'RobotoMono-Regular',
    fontSize: scale(16),
    lineHeight: scale(28),
    marginBottom: scale(10),
    textAlign: 'center',
  },
  viewFirstLaunchVideo: {
    backgroundColor: '#000000',
    height: height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewFirstLaunchOverlayImage: {
    alignItems: 'center',
    marginTop: scale(20),
  },
  viewFirstLaunchOverlay: {
    position: 'absolute',
    height: 0.9 * height,
    paddingBottom: isIOS ? 0 : 0.1 * height,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  textButtonGetStarted: {
    fontFamily: 'EduFavoritExpanded-Regular',
    fontSize: scale(15),
    fontWeight: 'bold',
  },
});
