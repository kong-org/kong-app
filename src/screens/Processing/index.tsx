import {NativeStackNavigationProp} from '@react-navigation/native-stack/lib/typescript/src/types';
import React, {FC} from 'react';
import {
  Dimensions,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import strings from '../../../assets/text/strings';
import {RootStackParamList} from '../Routes/RootStackParamList';
import {SafeAreaView} from 'react-native-safe-area-context';
import {isIOS, scale} from '../../common/utils';
import {RouteProp} from '@react-navigation/native';
import {LinearProgress} from 'react-native-elements';
const {height, width} = Dimensions.get('window');
interface IProcessing {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Processing'>;
  route: RouteProp<RootStackParamList, 'Processing'>;
}

const ASSETS = '../../../assets';

export const Processing: FC<IProcessing> = ({route}) => {
  const message = route.params?.message;
  console.log(message);
  return (
    <View style={ProcessingStyles.viewProcessing}>
      <StatusBar barStyle="light-content" />

      <SafeAreaView style={ProcessingStyles.viewProcessingContainer}>
        <Image source={require(ASSETS + '/img/processing.png')} />
        <Text style={ProcessingStyles.textProcessingHeading}>
          {strings.textProcessingHeading}
        </Text>
        <Text style={ProcessingStyles.textProcessingBody}>
          {message ? message : strings.textProcessingBody}
        </Text>
      </SafeAreaView>
      {!isIOS && message && (
        <View
          style={{
            height: height,
            width,
            display: 'flex',
            position: 'absolute',
            flexDirection: 'column',
            justifyContent: 'center',
          }}>
          <LinearProgress
            style={{marginTop: scale(50)}}
            color="#2BFF88"
            trackColor="#434348"
            value={50}
          />
        </View>
      )}
    </View>
  );
};
// Styles
const ProcessingStyles = StyleSheet.create({
  viewProcessing: {
    backgroundColor: '#000000',
    color: '#FFFFFF',
    height: height,
    width: width,
  },
  viewProcessingContainer: {
    display: 'flex',
    alignItems: 'center',
    marginTop: scale(60),
  },
  textProcessingHeading: {
    color: '#FFFFFF',
    fontFamily: 'EduFavoritExpanded-Bold',
    fontSize: scale(20),
    lineHeight: scale(28),
    marginTop: scale(37),
  },
  textProcessingBody: {
    color: '#EDEDFD',
    fontFamily: 'RobotoMono-Regular',
    fontSize: scale(16),
    lineHeight: scale(32),
    marginTop: scale(11),
    textAlign: 'center',
  },
});
