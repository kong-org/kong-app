import {createNativeStackNavigator} from '@react-navigation/native-stack';

import React, {useCallback} from 'react';
import {Image, Text, TouchableOpacity} from 'react-native';
import {FAQS} from '../FAQS';
import {Processing} from '../Processing';
import {FirstLaunch} from '../FirstLaunch';
import {Home} from '../Home';
import {Settings} from '../Settings';
import {RootStackParamList} from './RootStackParamList';
import {Button} from 'react-native-elements';
import {scale, truncateAddress} from '../../common/utils';
import {useGlobalStore} from '../../hooks/use-global-store';
import {Results} from '../Results';
import {Fail} from '../Fail';
import {useWallet} from '../../hooks/useWallet';
import {Detected} from '../Reveal/Detected';
import {Polling} from '../Reveal/Polling';
import {Timeout} from '../Reveal/Timeout';
import {Reveal} from '../Reveal/Reveal';
import {useWalletConnect} from '@walletconnect/react-native-dapp';
const Stack = createNativeStackNavigator<RootStackParamList>();

export const Routes = () => {
  const connector = useWalletConnect();
  const {walletAddress, connectWalletHandler} = useWallet(connector);
  const connectButtonTitle = connector.connected
    ? truncateAddress(walletAddress!)
    : 'CONNECT WALLET';
  const {
    state: {
      verificationData: {verificationResultColor},
    },
    methods: {resetState},
  } = useGlobalStore();

  return (
    <Stack.Navigator
      screenOptions={{
        headerTitle: props => <></>,
        animation: 'none',
        headerStyle: {
          backgroundColor: '#000000',
        },
        headerShadowVisible: false,
        gestureEnabled: false,
      }}>
      <Stack.Screen
        name="FirstLaunch"
        component={FirstLaunch}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="Settings"
        component={Settings}
        options={({navigation}) => ({
          gestureEnabled: true,
          headerLeft: () => (
            <TouchableOpacity onPress={() => navigation?.navigate('Home')}>
              <Image
                style={{height: 25, resizeMode: 'contain'}}
                source={require('../../../assets/img/back.png')}
              />
            </TouchableOpacity>
          ),
        })}
      />
      <Stack.Screen
        name="Home"
        options={({navigation}) => ({
          headerLeft: () => (
            <TouchableOpacity onPress={() => navigation?.navigate('Settings')}>
              <Image
                style={{height: 25, resizeMode: 'contain'}}
                source={require('../../../assets/settings.png')}
              />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <Button
              title={connectButtonTitle}
              buttonStyle={{borderRadius: 51, backgroundColor: '#12121B'}}
              titleStyle={{
                fontFamily: 'EduFavoritExpanded-Bold',
                fontSize: scale(13),
              }}
              onPress={connectWalletHandler}
            />
          ),
        })}
        component={Home}
      />
      <Stack.Screen
        name="FAQS"
        component={FAQS}
        options={({navigation}) => ({
          gestureEnabled: true,
          headerLeft: () => (
            <TouchableOpacity onPress={() => navigation?.navigate('Settings')}>
              <Image
                style={{height: 25, resizeMode: 'contain'}}
                source={require('../../../assets/img/back.png')}
              />
            </TouchableOpacity>
          ),
        })}
      />
      <Stack.Screen
        name="Processing"
        component={Processing}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="Results"
        component={Results}
        options={({navigation}) => ({
          headerStyle: {
            backgroundColor: verificationResultColor ?? '#D2D2DA', //default color is unknown device color
          },
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => {
                navigation?.navigate('Home');
                resetState();
              }}>
              <Image
                style={{height: 25, marginLeft: 5, resizeMode: 'contain'}}
                source={require('../../../assets/img/cross-black.png')}
              />
            </TouchableOpacity>
          ),
        })}
      />
      <Stack.Screen
        name="Fail"
        component={Fail}
        options={({navigation}) => ({
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => {
                navigation?.navigate('Home');
                resetState();
              }}>
              <Image
                style={{height: 25, resizeMode: 'contain'}}
                source={require('../../../assets/img/cross.png')}
              />
            </TouchableOpacity>
          ),
        })}
      />
      {RevealRoutes({resetState})}
    </Stack.Navigator>
  );
};

const RevealRoutes = ({resetState}: {resetState: () => void}) => {
  return (
    <>
      <Stack.Screen
        name="Detected"
        component={Detected}
        options={({navigation}) => ({
          headerTitle: props => (
            <Text
              style={{
                color: '#FFFFFF',
                fontSize: 15,
                fontFamily: 'EduFavoritExpanded-Bold',
              }}>
              CITIZEN REVEAL
            </Text>
          ),
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => {
                navigation?.navigate('Home');
                resetState();
              }}>
              <Image
                style={{height: 25, resizeMode: 'contain'}}
                source={require('../../../assets/img/cross.png')}
              />
            </TouchableOpacity>
          ),
        })}
      />
      <Stack.Screen
        name="Polling"
        component={Polling}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="Reveal"
        component={Reveal}
        options={({navigation}) => ({
          headerShown: false,
        })}
      />
      <Stack.Screen
        name="Timeout"
        component={Timeout}
        options={({navigation}) => ({
          headerTitle: props => (
            <Text
              style={{
                color: '#FFFFFF',
                fontSize: 15,
                fontFamily: 'EduFavoritExpanded-Bold',
              }}>
              CITIZEN REVEAL
            </Text>
          ),
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => {
                navigation?.navigate('Home');
                resetState();
              }}>
              <Image
                style={{height: 25, resizeMode: 'contain'}}
                source={require('../../../assets/img/cross.png')}
              />
            </TouchableOpacity>
          ),
        })}
      />
    </>
  );
};
