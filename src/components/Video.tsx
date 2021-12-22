import {AVPlaybackSource} from 'expo-av/build/AV';
import React, {FC} from 'react';
import {ImageSourcePropType, StyleProp, ViewStyle} from 'react-native';
import {Video as VideoPlayer} from 'expo-av';
import {useVideoRef} from '../hooks/useVideoRef';
interface IVideo {
  style?: StyleProp<ViewStyle>;
  source: AVPlaybackSource | undefined;
  isLooping?: boolean;
  isMuted?: boolean;
  posterSource?: ImageSourcePropType;
}

export let videoRef: React.MutableRefObject<VideoPlayer | null>;
export const Video: FC<IVideo> = ({
  style = {width: 350, height: 350},
  source,
  isLooping = true,
  isMuted = false,
  posterSource,
}) => {
  const {video} = useVideoRef();
  videoRef = video;
  return (
    <VideoPlayer
      ref={video}
      source={source}
      style={style}
      isLooping={isLooping}
      isMuted={isMuted}
      resizeMode="cover"
      posterSource={posterSource}
    />
  );
};
