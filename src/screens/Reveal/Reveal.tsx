import {NativeStackNavigationProp} from '@react-navigation/native-stack/lib/typescript/src/types';
import React, {FC} from 'react';
import {Dimensions, StatusBar, StyleSheet, Text, View} from 'react-native';
import {Button} from 'react-native-elements';
import buttonStyles from '../../../assets/styles/buttonStyles';
import {RootStackParamList} from '../Routes/RootStackParamList';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useHeaderHeight} from '@react-navigation/elements';
import {Video} from 'expo-av';
import {useVideoRef} from '../../hooks/useVideoRef';
import {RouteProp} from '@react-navigation/native';
import {scale} from '../../common/utils';

const {height, width} = Dimensions.get('screen');
interface IReveal {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Reveal'>;
  route: RouteProp<RootStackParamList, 'Reveal'>;
}

export const Reveal: FC<IReveal> = ({route, navigation}) => {
  const {
    revealDetails: {tokenId, image},
  } = route.params;

  const headerHeight = useHeaderHeight();
  const {video} = useVideoRef();
  const imageId = image?.split('/')[2];
  const RevealStyles = RevealStylesFn(headerHeight);
  return (
    <View style={RevealStyles.viewReveal}>
      <StatusBar barStyle="light-content" />

      <SafeAreaView style={RevealStyles.viewRevealBody}>
        <View
          style={{
            display: 'flex',
            alignItems: 'center',
          }}>
          <Video
            ref={video}
            source={{
              uri: `https://ipfs.io/ipfs/${imageId}`,
            }}
            style={{width: width, height: 350, marginBottom: 29}}
            isLooping
            resizeMode="cover"
          />
        </View>
        <Text
          style={
            RevealStyles.textRevealWelcome
          }>{`WELCOME,\n CITIZEN #${tokenId}`}</Text>
        <View
          style={{
            width: width - 2 * 25,
          }}>
          <Button
            title={'VERIFICATION DETAILS'}
            titleStyle={RevealStyles.textButtonVerification}
            buttonStyle={buttonStyles.buttonSecondary}
            onPress={() => navigation.navigate('Polling')}
          />
        </View>
      </SafeAreaView>
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
