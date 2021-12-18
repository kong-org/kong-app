import {AVPlaybackSource} from 'expo-av/build/AV';
import React, {FC} from 'react';
import {StyleProp, ViewStyle} from 'react-native';
import {Video as VideoPlayer} from 'expo-av';
import {useVideoRef} from '../hooks/useVideoRef';
interface IVideo {
  style?: StyleProp<ViewStyle>;
  source: AVPlaybackSource | undefined;
  isLooping?: boolean;
}

export const Video: FC<IVideo> = ({
  style = {width: 350, height: 350},
  source,
  isLooping = true,
}) => {
  const {video} = useVideoRef();

  return (
    <VideoPlayer
      ref={video}
      source={source}
      style={style}
      isLooping={isLooping}
      resizeMode="cover"
    />
  );
};
