import { Dimensions, StyleSheet } from 'react-native';
var {height, width} = Dimensions.get('window');
function scale(size) { return Math.floor(size * (height / 812) ** 0.5)}


const imageStyles = StyleSheet.create({

    imageScan: {
      width: 100,
      height: 100,
      borderRadius: 50
    },
    nfcIcon: {
    },    

})

export default imageStyles;
