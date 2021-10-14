
import { Dimensions, StyleSheet } from 'react-native';
var {height, width} = Dimensions.get('screen');


const videoStyles = StyleSheet.create({

    // First launch.
    // videoFirstLaunch: {
    //     height: 1.25 * height,
    //     width: 1.25 * width
    // }
    videoFirstLaunch: {
	    position: 'absolute',
	    top: 0,
	    left: 0,
	    bottom: 0,
	    right: 0
  	}

})

export default videoStyles;
