import {Dimensions, StyleSheet} from 'react-native';
import {scale} from '../../src/common/utils';
var {width} = Dimensions.get('window');

const buttonStyles = StyleSheet.create({
  buttonPrimary: {
    backgroundColor: '#2BFF88',
    height: 62,
    marginBottom: 15,
    width: width - 2 * scale(25),
  },
  buttonSecondary: {
    borderColor: '#2BFF88',
    borderWidth: 2,
    backgroundColor: '#000000',
    height: 62,
    marginBottom: scale(15),
    width: width - 2 * scale(25),
  },
  buttonTertiary: {
    backgroundColor: '#EDEDFD',
    height: 62,
    marginBottom: scale(15),
    width: width - 2 * scale(25),
  },
});

export default buttonStyles;
