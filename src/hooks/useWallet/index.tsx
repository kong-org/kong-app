import {useWalletConnect} from '@walletconnect/react-native-dapp';
import React, {useCallback, useMemo} from 'react';

export const useWallet = () => {
  const connector = useWalletConnect();

  const memoizedConnector = useMemo(() => connector, [connector.connected]);

  const walletAddress = useMemo(
    () => (connector.connected ? connector.accounts[0] : null),
    [connector.connected],
  );

  const connectWalletHandler = async () => {
    try {
      connector.connected
        ? await connector.killSession()
        : await connector.connect();
    } catch (err) {
      console.log(err);
    }
  };

  return {
    connector: memoizedConnector,
    connected: connector.connected,
    connectWalletHandler,
    walletAddress,
  };
};
