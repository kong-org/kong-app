import React, {FC} from 'react';
import {
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {BottomSheet, Button} from 'react-native-elements';
import buttonStyles from '../../../assets/styles/buttonStyles';
import {scale} from '../../common/utils';
import {useWallet} from '../../hooks/useWallet';
import {useGlobalStore} from '../../hooks/use-global-store';
import {useWalletConnect} from '@walletconnect/react-native-dapp';
const {width} = Dimensions.get('window');
interface IVerifyBeforeClaimModal {
  isVisible: boolean;
  header: string;
  body: string;
  setIsVisible: React.Dispatch<React.SetStateAction<boolean>>;
  onPressFn: () => Promise<void>;
}

const ASSETS = '../../../assets';

export const Modal: FC<IVerifyBeforeClaimModal> = ({
  isVisible,
  setIsVisible,
  header,
  body,
  onPressFn,
}) => {
  const {
    setters: {setFullVerification},
  } = useGlobalStore();

  return (
    <BottomSheet isVisible={isVisible}>
      <View style={VerifyBeforeClaimStyles.viewVerifyBeforeClaim}>
        <View style={{paddingTop: 25}}>
          <TouchableOpacity onPress={() => setIsVisible(false)}>
            <Image source={require(ASSETS + '/img/cross-black.png')} />
          </TouchableOpacity>
        </View>
        <View style={VerifyBeforeClaimStyles.viewVerifyBeforeClaimContainer}>
          <Text style={VerifyBeforeClaimStyles.textConnectStyles}>
            {header}
          </Text>
          <Text
            style={{
              marginTop: 10,
              fontFamily: 'RobotoMono-Regular',
              fontSize: scale(15),
              lineHeight: scale(22),
            }}>
            {body}
          </Text>
        </View>
        <Button
          title={header}
          titleStyle={VerifyBeforeClaimStyles.textButtonConnectVerify}
          buttonStyle={buttonStyles.buttonPrimary}
          onPress={async () => {
            setFullVerification(true);
            setIsVisible(false);
            await onPressFn();
          }}
        />
      </View>
    </BottomSheet>
  );
};
// Styles
const VerifyBeforeClaimStyles = StyleSheet.create({
  viewVerifyBeforeClaim: {
    backgroundColor: '#FEFEFF',
    paddingLeft: 25,
    paddingRight: 25,
  },

  viewVerifyBeforeClaimContainer: {marginTop: 35, marginBottom: 35},
  textConnectStyles: {
    fontFamily: 'EduFavoritExpanded-Bold',
    fontSize: scale(17),
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
  textButtonConnectVerify: {
    color: '#000000',
    fontFamily: 'EduFavoritExpanded-Regular',
    fontSize: scale(15),
    fontWeight: 'bold',
  },
});
