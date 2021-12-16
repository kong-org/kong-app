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
import {Button} from 'react-native-elements';
import buttonStyles from '../../../assets/styles/buttonStyles';
import {RootStackParamList} from '../Routes/RootStackParamList';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useHeaderHeight} from '@react-navigation/elements';
import {scale} from '../../common/utils';

const {height, width} = Dimensions.get('screen');
interface IReveal {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Reveal'>;
}
const ASSETS = '../../../assets';
export const Timeout: FC<IReveal> = ({navigation}) => {
  const headerHeight = useHeaderHeight();
  const TimeoutStyles = TimeoutStylesFn(headerHeight);
  return (
    <View style={TimeoutStyles.viewTimeout}>
      <StatusBar barStyle="light-content" />

      <SafeAreaView style={TimeoutStyles.viewTimeoutBody}>
        <View style={TimeoutStyles.viewTimeoutContainer}>
          <Image source={require(ASSETS + '/img/timeout.png')} />
          <Text style={TimeoutStyles.textTimeout}>
            {'TRANSACTION TIME OUT'}
          </Text>
        </View>
        <Button
          title={'RESCAN'}
          titleStyle={TimeoutStyles.textButtonRetry}
          buttonStyle={buttonStyles.buttonPrimary}
          onPress={() => navigation.navigate('Home')}
        />
      </SafeAreaView>
    </View>
  );
};
// Styles
const TimeoutStylesFn = (headerHeight: number) =>
  StyleSheet.create({
    viewTimeout: {
      backgroundColor: '#000000',
      color: '#FFFFFF',
      height: height,
      width: width,
    },
    viewTimeoutBody: {
      height: height - headerHeight,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    viewTimeoutContainer: {
      marginTop: 100,
      width: width - 2 * 25,
      display: 'flex',
      alignItems: 'center',
    },
    textTimeout: {
      color: '#FFFFFF',
      textAlign: 'center',
      fontFamily: 'EduFavoritExpanded-Bold',
      fontSize: 25,
      marginTop: 22,
    },
    textButtonRetry: {
      color: '#000000',
      fontFamily: 'EduFavoritExpanded-Regular',
      fontSize: scale(15),
      fontWeight: 'bold',
    },
  });
