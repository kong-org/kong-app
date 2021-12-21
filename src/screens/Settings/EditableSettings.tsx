import React, {useEffect, useState} from 'react';
import {Text, TextInput} from 'react-native';
import defaultSettings from '../../../assets/data/defaultSettings';
import strings from '../../../assets/text/strings';
import {MMKV, MMKVKeys} from '../../common/mmkv';
import {isJSONable, scale} from '../../common/utils';
import {useGlobalStore} from '../../hooks/use-global-store';
import {SettingsStyles} from './styles';

export const EditableSettings = () => {
  const {
    state: {chainSettings, resetButtonText},
    setters: {setChainSettings, setResetButtonText},
    methods: {
      resetToDefaultSettings,
      blockchain: {loadContracts},
    },
  } = useGlobalStore();

  const [runReset, setRunReset] = useState(false);
  const resetFn = async () => {
    let data;
    try {
      const response = await (
        await fetch(`${chainSettings.bridgeNode}/defaults`)
      ).text();
      data = isJSONable(response) && JSON.parse(response);
    } catch (e) {
      console.log(e);
    }
    // chainSettings set in order of MMKV > bridgeDefaults > localDefaults
    const defaults = {
      ethNode: data?.ethNode ?? defaultSettings.ethNode,
      ipfsNode: data?.ipfsNode ?? defaultSettings.ipfsNode,
      bridgeNode: defaultSettings.bridgeNode,
      registerAddress: data?.contracts ?? defaultSettings.registerAddress,
    };
    setChainSettings(defaults);
    try {
      setResetButtonText(strings.textSettingsResetPending);
      MMKV.set(MMKVKeys.ETH_NODE, defaults.ethNode);
      MMKV.set(MMKVKeys.IPFS_NODE, defaults.ipfsNode);
      MMKV.set(MMKVKeys.BRIDGE_NODE, defaults.bridgeNode);
      MMKV.set(
        MMKVKeys.REGISTER_ADDRESS,
        JSON.stringify(defaults.registerAddress),
      );
      setRunReset(true);
    } catch (error) {
      setResetButtonText(strings.textSettingsResetFail);
    }
  };

  useEffect(() => {
    if (runReset) {
      (async () => {
        try {
          await resetToDefaultSettings();
          console.log(`reset device proofs complete.`);
        } catch {
          console.log('could not reset');
        }
        setResetButtonText(strings.textSettingsReset);
        setRunReset(false);
      })();
    }
  }, [runReset]);

  return (
    <>
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
        }}
        onEndEditing={() => {
          MMKV.set(MMKVKeys.ETH_NODE, chainSettings.ethNode);
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
        }}
        onEndEditing={() => {
          MMKV.set(MMKVKeys.IPFS_NODE, chainSettings.ipfsNode);
          loadContracts();
        }}
        multiline={true}
        value={chainSettings.ipfsNode}
      />

      <Text style={SettingsStyles.textSettingsScan}>Bridge</Text>
      <TextInput
        style={SettingsStyles.textSettingsNodeIpValue}
        onChangeText={text => {
          setChainSettings(
            Object.assign({}, chainSettings, {
              bridgeNode: text,
            }),
          );
        }}
        onEndEditing={() => {
          MMKV.set(MMKVKeys.BRIDGE_NODE, chainSettings.bridgeNode);
          loadContracts();
        }}
        multiline={true}
        value={chainSettings.bridgeNode}
      />
      <Text
        style={{
          ...SettingsStyles.textSettingsSettingsHeading,
          marginTop: scale(20),
        }}>
        CONTRACTS
      </Text>
      <Text style={SettingsStyles.textSettingsScan}>REGISTER MERKLE ROOT</Text>
      <TextInput
        style={SettingsStyles.textSettingsNodeIpValue}
        onChangeText={text => {
          setChainSettings(
            Object.assign({}, chainSettings, {
              registerAddress: {
                ...chainSettings.registerAddress,
                registerMerkleRoot: text,
              },
            }),
          );
        }}
        onEndEditing={() => {
          MMKV.set(
            MMKVKeys.REGISTER_ADDRESS,
            JSON.stringify(chainSettings.registerAddress),
          );
          loadContracts();
        }}
        multiline={true}
        value={chainSettings.registerAddress?.registerMerkleRoot}
      />
      <Text style={SettingsStyles.textSettingsScan}>CITIZEN ERC20</Text>
      <TextInput
        style={SettingsStyles.textSettingsNodeIpValue}
        onChangeText={text => {
          setChainSettings(
            Object.assign({}, chainSettings, {
              registerAddress: {
                ...chainSettings.registerAddress,
                citizenERC20: text,
              },
            }),
          );
        }}
        onEndEditing={() => {
          MMKV.set(
            MMKVKeys.REGISTER_ADDRESS,
            JSON.stringify(chainSettings.registerAddress),
          );
          loadContracts();
        }}
        multiline={true}
        value={chainSettings.registerAddress?.citizenERC20}
      />
      <Text style={SettingsStyles.textSettingsScan}>CITIZEN ERC721</Text>
      <TextInput
        style={SettingsStyles.textSettingsNodeIpValue}
        onChangeText={text => {
          setChainSettings(
            Object.assign({}, chainSettings, {
              registerAddress: {
                ...chainSettings.registerAddress,
                citizenERC721: text,
              },
            }),
          );
        }}
        onEndEditing={() => {
          MMKV.set(
            MMKVKeys.REGISTER_ADDRESS,
            JSON.stringify(chainSettings.registerAddress),
          );
          loadContracts();
        }}
        multiline={true}
        value={chainSettings.registerAddress?.citizenERC721}
      />
      <Text style={SettingsStyles.textSettingsScan}>REVEAL CITIZEN</Text>
      <TextInput
        style={SettingsStyles.textSettingsNodeIpValue}
        onChangeText={text => {
          setChainSettings(
            Object.assign({}, chainSettings, {
              registerAddress: {
                ...chainSettings.registerAddress,
                revealCitizen: text,
              },
            }),
          );
        }}
        onEndEditing={() => {
          MMKV.set(
            MMKVKeys.REGISTER_ADDRESS,
            JSON.stringify(chainSettings.registerAddress),
          );
          loadContracts();
        }}
        multiline={true}
        value={chainSettings.registerAddress?.revealCitizen}
      />
      <Text style={SettingsStyles.textSettingsReset} onPress={resetFn}>
        {resetButtonText}
      </Text>
    </>
  );
};
