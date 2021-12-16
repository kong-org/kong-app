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

  useEffect(() => {
    (async () => {
      if (chainSettings.ethNode === defaultSettings.ethNode && runReset) {
        await resetToDefaultSettings();
        console.log(`reset device proofs complete.`);
        setResetButtonText(strings.textSettingsReset);
      }
      setRunReset(false);
    })();
  }, [chainSettings.ethNode]);

  const resetFn = async () => {
    setChainSettings(defaultSettings);
    try {
      setResetButtonText(strings.textSettingsResetPending);
      setResetButtonText(strings.textSettingsResetPending);
      MMKV.set(MMKVKeys.ETH_NODE, defaultSettings.ethNode);
      MMKV.set(MMKVKeys.IPFS_NODE, defaultSettings.ipfsNode);
      MMKV.set(
        MMKVKeys.REGISTER_ADDRESS,
        JSON.stringify(defaultSettings.registerAddress),
      );
      setRunReset(true);
    } catch (error) {
      setResetButtonText(strings.textSettingsResetFail);
    }
  };

  const {
    connectWalletHandler,
    walletAddress,
    connected: isConnected,
  } = useWallet();
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
                  {isConnected
                    ? walletAddress && truncateAddress(walletAddress)
                    : 'No wallet connected'}
                </Text>
              </View>
              <TouchableOpacity onPress={connectWalletHandler}>
                <Text
                  style={{
                    color: isConnected ? '#FC6161' : '#2BFF88',
                    fontWeight: 'bold',
                  }}>
                  {isConnected ? 'DISCONNECT' : 'CONNECT'}
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

            {/* Blockchain Box */}
            <Text style={SettingsStyles.textSettingsSettingsHeading}>
              {strings.textSettingsSettingsHeading}
            </Text>

            <Text style={SettingsStyles.textSettingsScan}>Ethereum</Text>
            <TextInput
              style={SettingsStyles.textSettingsNodeIpValue}
              onChangeText={text => {
                setChainSettings(
                  Object.assign({}, chainSettings, {
                    ethNode: text,
                  }),
                );
                MMKV.set(MMKVKeys.ETH_NODE, text);
              }}
              onEndEditing={() => {
                loadContracts();
              }}
              multiline={true}
              value={chainSettings.ethNode}
            />

            <Text style={SettingsStyles.textSettingsScan}>IPFS</Text>
            <TextInput
              style={SettingsStyles.textSettingsNodeIpValue}
              onChangeText={text => {
                setChainSettings(
                  Object.assign({}, chainSettings, {
                    ipfsNode: text,
                  }),
                );
                MMKV.set(MMKVKeys.IPFS_NODE, text);
              }}
              onEndEditing={() => {
                loadContracts();
              }}
              multiline={true}
              value={chainSettings.ipfsNode}
            />

            <Text style={SettingsStyles.textSettingsReset} onPress={resetFn}>
              {resetButtonText}
            </Text>

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
const SettingsStyles = StyleSheet.create({
  // Settings.
  viewSettings: {
    height,
    backgroundColor: '#000000',
    flex: 1,
  },
  viewSettingsContainer: {
    flexDirection: 'column',
    textAlign: 'left',
  },
  viewSettingsBorder: {
    borderTopColor: '#626270',
    borderTopWidth: 1,
    marginTop: scale(20),
    marginBottom: scale(20),
  },
  viewSettingsBody: {
    margin: scale(25),
  },
  viewSettingsRows: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  viewSettingsSwitchRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: scale(15),
  },
  textSettingsDescriptionHeading: {
    color: '#EDEDFD',
    fontFamily: 'EduFavoritExpanded-Bold',
    fontSize: scale(20),
    lineHeight: scale(28),
    marginBottom: scale(20),
  },
  textSettingsDescription: {
    color: '#9C9CB0',
    fontFamily: 'RobotoMono-Regular',
    fontSize: scale(16),
    lineHeight: scale(28),
  },
  textSettingsFAQ: {
    color: '#EDEDFD',
    fontFamily: 'EduFavoritExpanded-Bold',
    fontSize: scale(17),
    lineHeight: scale(28),
  },
  textSettingsTellMeMore: {
    color: '#EDEDFD',
    fontFamily: 'EduFavoritExpanded-Bold',
    fontSize: scale(17),
    lineHeight: scale(28),
  },
  textSettingsSettingsHeading: {
    color: '#EDEDFD',
    fontFamily: 'EduFavoritExpanded-Bold',
    fontSize: scale(17),
    lineHeight: scale(28),
    marginBottom: scale(20),
  },
  textSettingsWalletHeading: {
    color: '#EDEDFD',
    fontFamily: 'EduFavoritExpanded-Bold',
    fontSize: scale(17),
    lineHeight: scale(28),
  },
  textSettingsNodeIpValue: {
    color: '#9C9CB0',
    fontFamily: 'RobotoMono-Regular',
    fontSize: scale(16),
    lineHeight: scale(28),
    marginBottom: scale(8),
    textDecorationLine: 'underline',
    textDecorationStyle: 'dotted',
    textDecorationColor: '#979797',
  },
  textSettingsScan: {
    color: '#9C9CB0',
    fontFamily: 'RobotoMono-Regular',
    textAlign: 'left',
    fontSize: scale(16),
    lineHeight: scale(28),
  },
  textSettingsScanDescription: {
    color: '#9C9CB0',
    fontFamily: 'RobotoMono-Regular',
    fontSize: scale(16),
    lineHeight: scale(28),
  },
  textSettingsScanCompatibility: {
    color: '#EDEDFD',
    fontFamily: 'RobotoMono-Regular',
    fontSize: scale(16),
    lineHeight: scale(28),
    marginTop: scale(20),
  },
  textSettingsReset: {
    color: '#EDEDFD',
    fontFamily: 'RobotoMono-Regular',
    fontSize: scale(16),
    lineHeight: scale(28),
  },
  textSettingsVersion: {
    color: '#EDEDFD',
    fontFamily: 'RobotoMono-Regular',
    fontSize: scale(12),
    lineHeight: scale(30),
    marginBottom: scale(20),
  },
});
