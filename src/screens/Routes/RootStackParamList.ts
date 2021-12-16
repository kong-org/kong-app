// RouteStackParamList is used for typing purposes of the screens in this app

export type RootStackParamList = {
  FirstLaunch: undefined;
  Home: undefined;
  Settings: undefined;
  FAQS: undefined;
  Processing: undefined;
  Results: undefined;
  Fail: {warning: string; description: string};
  //Reveal Routse
  Detected: undefined;
  Polling: undefined;
  Reveal: {
    revealDetails: {
      tokenId: string;
      name: string | null;
      description: string | null;
      image: string | null;
      nonce: string | null;
      attributes: {trait_type: string; value: string}[];
    };
  };
  Timeout: undefined;
};