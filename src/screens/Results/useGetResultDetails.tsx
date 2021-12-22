import React, {useEffect, useState} from 'react';
import {Image, Linking, TouchableHighlight} from 'react-native';
import defaultSettings from '../../../assets/data/defaultSettings';
import {BlockChainData, VerificationTypes} from '../../common/types';
import {useGlobalStore} from '../../hooks/use-global-store';
import knownValues from '../../../assets/data/knownValues.js';
import {scale} from '../../common/utils';
import {Video} from '../../components/Video';

const knownContractVersions = knownValues['knownContractVersions'] as any;
const {PASS, WARNING, FAIL, IMPOSSIBLE} = VerificationTypes;
const ASSETS = '../../../assets';

const getEmoji = (
  blockchainData: BlockChainData,
  fullVerification: boolean,
  verificationResult: VerificationTypes,
) => {
  if (!fullVerification && verificationResult != FAIL)
    // return {
    //   emoji: <Image source={require(ASSETS + '/img/impossible-emoji.png')} />,
    //   text: 'INCOMPLETE VERIFICATION',
    // };
    // We want to return sucesss on quick verification
    return {
      emoji: <Image source={require(ASSETS + '/img/pass-emoji.png')} />,
      text: 'SUCCESSFUL',
    };
  if (!blockchainData.contractRegistered && !blockchainData.verifiedProof)
    return {
      emoji: <Image source={require(ASSETS + '/img/unknown-emoji.png')} />,
      text: 'UNKNOWN',
    };

  switch (verificationResult) {
    case PASS:
      return {
        emoji: <Image source={require(ASSETS + '/img/pass-emoji.png')} />,
        text: 'SUCCESSFUL',
      };

    case FAIL:
    default:
      return {
        emoji: <Image source={require(ASSETS + '/img/fail-emoji.png')} />,
        text: 'FAILED',
      };
  }
};

const getIcon = (verificationResult: VerificationTypes) => {
  switch (verificationResult) {
    case PASS:
      return <Image source={require(ASSETS + '/img/pass.png')} />;
    case WARNING:
    case IMPOSSIBLE:
      return <Image source={require(ASSETS + '/img/impossible.png')} />;
    case FAIL:
    default:
      return <Image source={require(ASSETS + '/img/fail.png')} />;
  }
};

const getAssetName = (blockChainData: BlockChainData) => {
  if (blockChainData.token !== undefined) {
    return 'CITIZEN #' + parseInt(blockChainData.token.tokenId!);
  } else if (blockChainData.name) {
    return blockChainData.name;
  } else if (
    blockChainData.unscaledERC20Balance &&
    blockChainData.unscaledERC20Balance > 0
  ) {
    return `${
      blockChainData.scaledERC20Balance
    } ${blockChainData.tokenName?.toUpperCase()}`;
  } else {
    return 'UNREVEALED TOKEN';
  }
};

const mapResultToResultName = (verificationResult: VerificationTypes) => {
  switch (verificationResult) {
    case PASS:
      return 'VERIFIED';
    case IMPOSSIBLE:
      return 'INCOMPLETE VERIFICATION';
    case FAIL:
    default:
      return 'FAILED';
  }
};

const getDeviceImage = (
  unscaledERC20Balance: number,
  scaledERC20Balance: number,
  cid?: string,
  token?: BlockChainData['token'],
) => {
  const [isVideo, setIsVideo] = useState(false);
  if (token) {
    cid = token?.image?.split('/')[2];
  }

  useEffect(() => {
    if (cid) {
      fetch(defaultSettings.ipfsNode + '/' + cid).then(result =>
        setIsVideo(
          // @ts-ignore
          result.headers.map['content-type'].split('/')[0] === 'video',
        ),
      );
    }
  }, []);

  if (cid) {
    if (isVideo) {
      return (
        <TouchableHighlight
          style={{
            width: scale(175),
            height: scale(175),
            borderRadius: scale(30),
          }}
          onPress={() => Linking.openURL(defaultSettings.ipfsNode + '/' + cid)}>
          <Video
            style={{
              width: scale(175),
              height: scale(175),
              borderRadius: scale(30),
            }}
            source={{uri: defaultSettings.ipfsNode + '/' + cid}}
            posterSource={require(ASSETS + `/img/VideoPlaceholder.png`)}
          />
        </TouchableHighlight>
      );
    } else {
      return (
        <TouchableHighlight
          style={{
            width: scale(175),
            height: scale(175),
            borderRadius: scale(30),
          }}
          onPress={() => Linking.openURL(defaultSettings.ipfsNode + '/' + cid)}>
          <Image
            style={{
              width: scale(175),
              height: scale(175),
              borderRadius: scale(30),
            }}
            source={{uri: defaultSettings.ipfsNode + '/' + cid}}
          />
        </TouchableHighlight>
      );
    }
  } else if (unscaledERC20Balance > 0) {
    let imageString = require(ASSETS + `/img/1.png`);
    switch (scaledERC20Balance) {
      case 1:
        imageString = require(ASSETS + '/img/1.png');
        break;
      case 5:
        imageString = require(ASSETS + '/img/5.png');
        break;
      case 10:
        imageString = require(ASSETS + '/img/10.png');
        break;
      case 20:
        imageString = require(ASSETS + '/img/20.png');
        break;
      case 50:
        imageString = require(ASSETS + '/img/50.png');
        break;
      case 100:
        imageString = require(ASSETS + '/img/100.png');
        break;
      case 500:
        imageString = require(ASSETS + '/img/500.png');
        break;
    }

    return (
      <Image
        style={{
          width: scale(175),
          height: scale(175),
          borderRadius: scale(30),
        }}
        source={imageString}
      />
    );
  } else {
    return (
      <Image
        style={{
          width: scale(175),
          height: scale(175),
          borderRadius: scale(30),
        }}
        source={require(ASSETS + '/img/unknown-device.png')}
      />
    );
  }
};

export type ResultDetailsObject = {
  name: string;
  pillInfo: {
    emoji: JSX.Element;
    text: string;
  };
  color: string;
  image: JSX.Element;
  details: {
    key: string;
    description?: string | undefined;
    image: JSX.Element;
  }[];
  moreDetails: {
    key: string;
    value: string | undefined;
  }[];
  checks: {
    key: string;
    image: JSX.Element;
  }[];
  data: {key: string; value: string | undefined}[];
  publicKeyHash: string | undefined;
  hardwareHash: string | undefined;
  root?: string;
  ethNode: string;
};

export const useGetResultDetails: () => ResultDetailsObject = () => {
  const {
    state: {
      verificationData,
      fullVerification,
      blockchainData,
      nfcData,
      chainSettings: {ethNode},
    },
  } = useGlobalStore();
  const resultDetailsObject = {
    name: '',
    pillInfo: getEmoji(
      blockchainData,
      fullVerification,
      verificationData.verificationResult,
    ),
    color: verificationData.verificationResultColor,
    image: getDeviceImage(
      blockchainData.unscaledERC20Balance!,
      blockchainData.scaledERC20Balance!,
      blockchainData.cid,
      blockchainData.token,
    ),
    details: [] as {key: string; description?: string; image: JSX.Element}[],
    moreDetails: [] as {key: string; value: string | undefined}[],
    checks: [] as {key: string; image: JSX.Element}[],
    data: [] as {key: string; value: string | undefined}[],
    publicKeyHash: nfcData.nfcReadInfoPrimaryPublicKeyHash,
    hardwareHash: nfcData.hardwareHash,
    root: blockchainData.root,
    ethNode,
  };

  /**
   * Contract Registered/Verified Proof Flow
   */
  if (blockchainData.contractRegistered || blockchainData.verifiedProof) {
    // Name
    resultDetailsObject.name = getAssetName(blockchainData);
    // Details
    const asset = {
      key: 'Asset',
      description:
        blockchainData.description ??
        mapResultToResultName(verificationData.verificationResult),
      image: getIcon(verificationData.verificationResult),
    };
    const contracts = {
      key: 'Smart Contracts',
      description: mapResultToResultName(
        verificationData.verificationResultContracts,
      ),
      image: getIcon(verificationData.verificationResultContracts),
    };
    const hardware = {
      key: 'Hardware',
      description: mapResultToResultName(
        verificationData.verificationResultHardware,
      ),
      image: getIcon(verificationData.verificationResultHardware),
    };
    resultDetailsObject.details = [asset, contracts, hardware];

    // More Details

    const versionInfo = knownContractVersions[blockchainData.contractVersion!];
    const releaseTimeStamp =
      blockchainData.contractReleaseTimestamp &&
      blockchainData.contractReleaseTimestamp > 0 &&
      new Date(blockchainData.contractReleaseTimestamp * 1000);

    const hardwareManufacturer = {
      key: 'Hardware Manufacturer',
      value: blockchainData.hardwareManufacturer,
    };
    const hardwareModel = {
      key: 'Hardware Model',
      value: blockchainData.hardwareModel,
    };
    const hardwareSerial = {
      key: 'Hardware Serial',
      value: blockchainData.hardwareSerial,
    };

    const versionCurve = {
      key: 'Version / Curve',
      value: `${versionInfo?.type} / ${versionInfo?.curve}`,
    };

    const claimable = {
      key: 'Claimable',
      value: `FROM ${
        blockchainData.contractReleaseTimestamp &&
        releaseTimeStamp &&
        blockchainData.contractReleaseTimestamp > 0
          ? releaseTimeStamp.getMonth() +
            1 +
            '/' +
            releaseTimeStamp.getDate() +
            '/' +
            releaseTimeStamp.getFullYear()
          : 'Anytime'
      }`,
    };
    const lastDebugCode = {
      key: 'Last Debug Code',
      value: nfcData.debugCode,
    };
    resultDetailsObject.moreDetails = [
      hardwareManufacturer,
      hardwareModel,
      hardwareSerial,
      versionCurve,
      claimable,
      lastDebugCode,
    ];

    // Checks
    const resultsOrder = [
      'timeCheck',
      'contractVersionCheck',
      'ellipticAddressCheck',
      'challenge_integrity',
      'external_signature',
      'internal_signature',
    ];
    resultDetailsObject.checks = verificationData.verificationResults
      .sort((a, b) => resultsOrder.indexOf(a.key) - resultsOrder.indexOf(b.key))
      .map(item => {
        return {key: item.descriptionShort, image: getIcon(item.status)};
      });
  } else {
    /**
     * Unknown Device Flow
     */
    resultDetailsObject.name = 'UNKNOWN\nDEVICE';

    // Checks
    resultDetailsObject.checks =
      verificationData.verificationResultsHardware.map(item => {
        return {key: item.descriptionShort, image: getIcon(item.status)};
      });

    // Data
    resultDetailsObject.data = [
      {
        key: 'Primary Public Key Hash',
        value: '0x' + nfcData.nfcReadInfoPrimaryPublicKeyHash,
      },
      {
        key: 'Last Debug Code',
        value: nfcData.debugCode,
      },
    ];
  }

  return resultDetailsObject;
};
