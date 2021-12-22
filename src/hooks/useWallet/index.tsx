import WalletConnect from '@walletconnect/client';

export const useWallet = (connector: WalletConnect) => {
  const walletAddress = connector.connected ? connector.accounts[0] : null;

  const connectWalletHandler = async () => {
    try {
      connector.connected
        ? await connector.killSession()
        : await connector.connect();
    } catch (err) {
      console.log(err);
    }
  };
  const connected = connector.connected;
  return {connected, connectWalletHandler, walletAddress};
};
