import {Video} from 'expo-av';
import React, {useEffect} from 'react';

export const useVideoRef = () => {
  const video = React.useRef<Video | null>(null);

  useEffect(() => {
    video && video.current?.playAsync();
  }, [video]);

  return {video};
};
