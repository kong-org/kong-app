import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import React, {FC, useCallback, useEffect, useState} from 'react';
import {
  Dimensions,
  Image,
  Platform,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import strings from '../../../assets/text/strings';
import {RootStackParamList} from '../Routes/RootStackParamList';
import packageInfo from '../../../package.json';
import {useGlobalStore} from '../../hooks/use-global-store';
import {MMKV, MMKVKeys} from '../../common/mmkv';
import {isIOS, scale, truncateAddress} from '../../common/utils';
import {useWallet} from '../../hooks/useWallet';
import defaultSettings from '../../../assets/data/defaultSettings';
import {SettingsStyles} from './styles';
import {EditableSettings} from './EditableSettings';
import {useWalletConnect} from '@walletconnect/react-native-dapp';
import {connected} from 'process';
var {height} = Dimensions.get('screen');
interface ISettings {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Settings'>;
}
const ASSETS = '../../../assets';

export const Settings: FC<ISettings> = ({navigation}) => {
  const {
    state: {fullVerification, chainSettings, resetButtonText},
    setters: {setFullVerification, setChainSettings, setResetButtonText},
    methods: {
      resetToDefaultSettings,
      blockchain: {loadContracts},
    },
  } = useGlobalStore();
  const [runReset, setRunReset] = useState(false);

  const connector = useWalletConnect();

  const {connectWalletHandler, walletAddress, connected} = useWallet(connector);
  return (
    <View style={SettingsStyles.viewSettings}>
      <StatusBar barStyle="light-content" />
      <KeyboardAwareScrollView style={SettingsStyles.viewSettingsContainer}>
        <View style={SettingsStyles.viewSettingsBody}>
          <React.Fragment>
            {/* Description Box */}
            <Text style={SettingsStyles.textSettingsDescriptionHeading}>
              {strings.textSettingsHeading}
            </Text>

            <Text style={SettingsStyles.textSettingsDescription}>
              {strings.textSettingsDescription}
            </Text>

            <View style={SettingsStyles.viewSettingsBorder} />

            {/* FAQs */}
            <TouchableOpacity
              style={SettingsStyles.viewSettingsRows}
              onPress={() => {
                navigation.navigate('FAQS');
              }}>
              <Text style={SettingsStyles.textSettingsFAQ}>
                {strings.textSettingsFAQ}
              </Text>

              <Image source={require(ASSETS + '/img/right.png')} />
            </TouchableOpacity>

            <View style={SettingsStyles.viewSettingsBorder} />
            {/* Wallet */}
            <View
              style={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
              <View style={{display: 'flex'}}>
                <Text style={SettingsStyles.textSettingsWalletHeading}>
                  {strings.textSettingsWalletHeading}
                </Text>

                <Text
                  style={{
                    color: '#9C9CB0',
                    fontFamily: 'RobotoMono-Regular',
                  }}>
                  {connected
                    ? walletAddress && truncateAddress(walletAddress)
                    : 'No wallet connected'}
                </Text>
              </View>
              <TouchableOpacity onPress={connectWalletHandler}>
                <Text
                  style={{
                    color: connected ? '#FC6161' : '#2BFF88',
                    fontWeight: 'bold',
                  }}>
                  {connected ? 'DISCONNECT' : 'CONNECT'}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={SettingsStyles.viewSettingsBorder} />

            {/* Scan Type Box */}

            <Text style={SettingsStyles.textSettingsSettingsHeading}>
              {strings.textSettingsScanTypeHeading}
            </Text>

            <View style={SettingsStyles.viewSettingsSwitchRow}>
              <Text style={SettingsStyles.textSettingsScan}>
                {fullVerification
                  ? strings.textSettingsScanFullVerification
                  : strings.textSettingsScanQuickVerification}
              </Text>

              <Switch
                trackColor={{false: '#8C8C9F', true: '#2BFF88'}}
                thumbColor={fullVerification ? '#000003' : '#EDEDFD'}
                onValueChange={() => setFullVerification(!fullVerification)}
                value={fullVerification}
                disabled={Platform.Version < 13}
              />
            </View>

            <Text style={SettingsStyles.textSettingsScanDescription}>
              {strings.textScanTypeDescription}
            </Text>

            {Platform.Version < 13 && isIOS && (
              <Text style={SettingsStyles.textSettingsScanCompatibility}>
                {strings.textScanTypeDescriptionQuickOnly}
              </Text>
            )}

            <View style={SettingsStyles.viewSettingsBorder} />
            <EditableSettings />
            <View style={SettingsStyles.viewSettingsBorder} />

            {/* Version Box */}

            <View>
              <Text
                style={
                  SettingsStyles.textSettingsVersion
                }>{`Version ${packageInfo.version}`}</Text>
            </View>
          </React.Fragment>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
};
