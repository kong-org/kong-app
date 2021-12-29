import {NativeStackNavigationProp} from '@react-navigation/native-stack/lib/typescript/src/types';
import React, {FC, useCallback} from 'react';
import {StyleSheet} from 'react-native';
import {RootStackParamList} from '../Routes/RootStackParamList';

import {
  ViroARScene,
  ViroARTrackingTargets,
  ViroARImageMarker,
  ViroARSceneNavigator,
  ViroText,
  ViroFlexView,
  ViroVideo,
  //@ts-ignore
} from '@viro-community/react-viro';
import {RouteProp} from '@react-navigation/native';
import {useGlobalStore} from '../../hooks/use-global-store';

interface IARView {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ARView'>;
  route: RouteProp<RootStackParamList, 'ARView'>;
}
const ASSETS = '../../../assets';

export const ARView: FC<IARView> = ({route}) => {
  const {attributes, tokenId, image} = route.params;
  const ViewAR = useCallback(() => {
    const {
      state: {chainSettings},
    } = useGlobalStore();
    const cid = image?.split('/')[2];
    return (
      <ViroARScene>
        <ViroARImageMarker target={'kongCard'}>
          <ViroFlexView
            style={{
              display: 'flex',
              position: 'absolute',
              flexDirection: 'row',
              alignItems: 'flex-start',
              justifyContent: 'flex-start',
            }}
            position={[0, -1, -2.5]}
            rotation={[-45, 0, 0]}
            backgroundColor={'black'}
            height={2.0}>
            <ViroVideo
              source={{
                uri: chainSettings.ipfsNode + '/' + cid,
              }}
              loop={true}
              position={[0, 0.5, 0]}
            />
            <ViroText
              style={{...styles.attributes, fontSize: 30}}
              text={`Citizen #${parseInt(tokenId)}`}
              position={[0.82, 0.9, -4]}
            />
            {Object.keys(attributes).map((key, idx) => {
              return (
                <ViroText
                  key={idx}
                  style={styles.attributes}
                  text={`${key.charAt(0).toUpperCase() + key.slice(1)}: ${
                    attributes[key]
                  }`}
                  position={[0.85, 0.3 - idx * 0.2, -4]}
                />
              );
            })}
          </ViroFlexView>
        </ViroARImageMarker>
      </ViroARScene>
    );
  }, [attributes, image, tokenId]);
  return (
    <ViroARSceneNavigator
      autofocus={true}
      initialScene={{
        scene: ViewAR,
      }}
      style={styles.f1}
    />
  );
};

ViroARTrackingTargets.createTargets({
  kongCard: {
    source: require(ASSETS + '/img/ar-kong.png'),
    orientation: 'Up',
    physicalWidth: 0.065, // real world width in meters
  },
});
var styles = StyleSheet.create({
  f1: {flex: 1},
  attributes: {
    fontFamily: 'EduFavoritExpanded-Regular',
    fontSize: 15,
    color: '#ffffff',
    width: 4,
  },
});
