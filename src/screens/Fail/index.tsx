import {NativeStackNavigationProp} from '@react-navigation/native-stack/lib/typescript/src/types';
import React, {FC} from 'react';
import {Dimensions, Image, StyleSheet, Text, View} from 'react-native';
import strings from '../../../assets/text/strings';
import {RootStackParamList} from '../Routes/RootStackParamList';
import {SafeAreaView} from 'react-native-safe-area-context';
import {RouteProp} from '@react-navigation/native';
import buttonStyles from '../../../assets/styles/buttonStyles';
import {Button} from 'react-native-elements';
import {useHeaderHeight} from '@react-navigation/elements';
import {useGlobalStore} from '../../hooks/use-global-store';
import {scale} from '../../common/utils';
const {height, width} = Dimensions.get('screen');
interface IHome {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Fail'>;
  route: RouteProp<RootStackParamList, 'Fail'>;
}

const ASSETS = '../../../assets';

export const Fail: FC<IHome> = ({route, navigation}) => {
  const {warning, description} = route.params;
  const headerHeight = useHeaderHeight();
  const FailStyles = FailStylesFn(headerHeight);
  const {
    methods: {resetState},
  } = useGlobalStore();
  return (
    <SafeAreaView style={FailStyles.viewFail}>
      <View style={FailStyles.viewFailContainer}>
        <View>
          <Image source={require(ASSETS + '/img/error-emoji.png')} />
          <Text style={FailStyles.textFailWarning}>{warning}</Text>
          <Text style={FailStyles.textFailDescription}>{description}</Text>
        </View>
      </View>
      <View style={FailStyles.viewFailButtonContainer}>
        <View style={{display: 'flex', alignItems: 'center'}}>
          <Button
            title={strings.textButtonRetry}
            titleStyle={FailStyles.textFailRetry}
            buttonStyle={buttonStyles.buttonTertiary}
            onPress={() => {
              navigation.navigate('Home');
              resetState();
            }}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

// Styles
const FailStylesFn = (headerHeight: number) =>
  StyleSheet.create({
    viewFail: {
      backgroundColor: '#000000',
      height: height - headerHeight,
    },
    viewFailContainer: {
      display: 'flex',
      position: 'absolute',
      // justifyContent: 'center',
      paddingTop: scale(150),
      height: height - headerHeight,
      width: width - 2 * scale(25),
      marginLeft: scale(25),
    },
    viewFailButtonContainer: {
      display: 'flex',
      position: 'absolute',
      justifyContent: 'flex-end',
      height: height - headerHeight,
      width: width - 2 * scale(25),
      marginLeft: scale(25),
      paddingBottom: scale(50),
    },
    viewHomeButtonContainer: {display: 'flex', alignItems: 'center'},
    textFailWarning: {
      color: '#FFFFFF',
      fontFamily: 'EduFavoritExpanded-Regular',
      fontSize: scale(25),
      textAlign: 'left',
      maxWidth: width * 0.5,
      marginTop: scale(21),
      marginBottom: scale(21),
    },
    textFailDescription: {
      color: '#FFFFFF',
      fontFamily: 'RobotoMono-Regular',
      fontSize: scale(16),
      lineHeight: scale(28),
      textAlign: 'left',
    },
    textFailRetry: {
      color: '#000000',
      fontFamily: 'EduFavoritExpanded-Regular',
      fontSize: scale(15),
      fontWeight: 'bold',
    },
  });
