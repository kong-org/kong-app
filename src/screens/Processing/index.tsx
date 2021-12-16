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
import {scale} from '../../common/utils';
const {height, width} = Dimensions.get('screen');
interface IHome {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Processing'>;
}

const ASSETS = '../../../assets';

export const Processing: FC<IHome> = ({}) => {
  return (
    <View style={ProcessingStyles.viewProcessing}>
      <StatusBar barStyle="light-content" />

      <SafeAreaView style={ProcessingStyles.vieProcessingContainer}>
        <Image source={require(ASSETS + '/img/processing.png')} />
        <Text style={ProcessingStyles.textProcessingHeading}>
          {strings.textProcessingHeading}
        </Text>
        <Text style={ProcessingStyles.textProcessingBody}>
          {strings.textProcessingBody}
        </Text>
      </SafeAreaView>
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
  vieProcessingContainer: {
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
