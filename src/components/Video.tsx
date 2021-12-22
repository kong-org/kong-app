import {AVPlaybackSource} from 'expo-av/build/AV';
import React, {FC, forwardRef} from 'react';
import {ImageSourcePropType, StyleProp, ViewStyle} from 'react-native';
import {Video as VideoPlayer} from 'expo-av';
import {useVideoRef} from '../hooks/useVideoRef';
interface IVideo {
  style?: StyleProp<ViewStyle>;
  source: AVPlaybackSource | undefined;
  isLooping?: boolean;
  isMuted?: boolean;
  posterSource?: ImageSourcePropType;
  ref?: React.MutableRefObject<VideoPlayer | null>;
}

export let videoRef: React.MutableRefObject<VideoPlayer | null>;
export const Video = forwardRef(
  (
    {
      style = {width: 350, height: 350},
      source,
      isLooping = true,
      isMuted = false,
      posterSource,
    }: IVideo,
    ref,
  ) => {
    const {video} = useVideoRef();
    videoRef = ref ?? (video as any);
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
  },
);
