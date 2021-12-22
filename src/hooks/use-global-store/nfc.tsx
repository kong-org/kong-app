import {crc16ccitt} from 'crc';
import WalletConnect from '@walletconnect/client';
import NfcManager, {
  Ndef,
  NdefRecord,
  NfcTech,
  TagEvent,
} from 'react-native-nfc-manager';
import {
  bytesToHex,
  createHardwareHash,
  delay,
  getLocalDevice,
  hexToBytes,
  asyncWrapper,
  hexToAscii,
} from '../../common/utils';
import NetInfo from '@react-native-community/netinfo';
import strings from '../../../assets/text/strings';
import * as Random from 'expo-random';
import {utils} from 'ethers';
import {
  ChainMethods,
  CurrentState,
  FetchChainDataType,
  NfcData,
  NfcFailType,
  NfcSettings,
  PrefetchChainDataType,
} from '../../common/types';
import {useCallback} from 'react';
import {
  navigate,
  updateParams,
  checkCurrentRoute,
} from '../../common/RootNavigation';
import {isIOS} from 'react-native-elements/dist/helpers';

interface IGetNFCFns {
  state: CurrentState;
  setNfcData: (input: NfcData) => void;
  setNfcSettings: (input: NfcSettings) => void;
  prefetchChainData: (
    chainDataType: PrefetchChainDataType,
    chainDataVal?: any,
  ) => Promise<number | undefined>;
  fetchChainData: (
    chainDataType: FetchChainDataType,
    chainDataVal?: any,
  ) => Promise<void>;
  setHeadlessVerification: (input: boolean) => void;
  verifyUnknownDevice: () => Promise<void>;
  getBridgeData: (publicKey: string) => Promise<void>;
  verifyMerkleProof: () => Promise<void>;
  verifyEscrow: () => void;
  writeChainData: (
    chainMethod: ChainMethods,
    connector: WalletConnect,
    ...chainDataVal: any
  ) => Promise<any>;
}

export const getNfcFns = ({
  state,
  prefetchChainData,
  fetchChainData,
  setNfcData,
  setNfcSettings,
  setHeadlessVerification,
  verifyUnknownDevice,
  verifyMerkleProof,
  getBridgeData,
  verifyEscrow,
  writeChainData,
}: IGetNFCFns) => {
  let nfcData = state.nfcData;
  let nfcSettings = state.nfcSettings;
  const updateNfcData = (updatedObject: NfcData) => {
    state.nfcData = Object.assign({}, nfcData, updatedObject);
    setNfcData(state.nfcData);
    nfcData = state.nfcData;
  };

  const updateNfcSettings = (updatedObject: NfcSettings) => {
    state.nfcSettings = Object.assign({}, nfcSettings, updatedObject);
    setNfcSettings(state.nfcSettings);
    nfcSettings = state.nfcSettings;
  };
  const updateHeadlessVerification = (input: boolean) => {
    state.headlessVerification = input;
    setHeadlessVerification(input);
  };
  const navigateToFail = useCallback((warning: string, description: string) => {
    if (checkCurrentRoute() !== 'Fail') {
      navigate('Fail', {warning, description});
    }
  }, []);

  const nfcStart = async () => {
    try {
      const isNfcSupported = await NfcManager.isSupported();
      updateNfcSettings({nfcSupported: isNfcSupported});
      if (isNfcSupported) {
        let isNfcEnabled;
        if (!isIOS) {
          isNfcEnabled = await NfcManager.isEnabled();
        }

        if (isIOS || isNfcEnabled) {
          try {
            await NfcManager.start();
            console.log('Successfully started NFC');
          } catch (err) {
            console.warn('Failed to start NFC: ', err);
            // TODO Fail screen
            updateNfcSettings({nfcSupported: false});
            navigateToFail('UhOh!', 'IOS Error ---');
          }
        }
      }
    } catch (err: any) {
      console.warn('Failed to check Nfc Support', err);
    }
  };
  const nfcScanStart = async () => {
    // Close technology if it is still running.
    await NfcManager.cancelTechnologyRequest().catch(err => console.warn(err));
    await NfcManager.start().catch(err => console.warn(err));
    !isIOS && navigate('Processing');
    await NfcManager.start();
    if (state.fullVerification) {
      nfcScanFull();
    } else {
      !isIOS && (await NfcManager.registerTagEvent());
      nfcQuickScan();
    }
  };

  // QUICK SCAN FNS
  const nfcNdefRegistrationCheck = async () => {
    try {
      const netState = await NetInfo.fetch();
      console.log(netState, nfcData);

      if (netState.isConnected && nfcData.localDevice && nfcData.hardwareHash) {
        const chainDataVal = {
          proof: (nfcData.localDevice as any)['proof'],
          root: (nfcData.localDevice as any)['root'],
          hardwareHash: '0x' + nfcData.hardwareHash,
          kongAmount:
            '0x' + (nfcData.localDevice as any)['kongAmount'].toString(16),
          device: nfcData.localDevice,
        };
        await Promise.all([
          prefetchChainData(
            PrefetchChainDataType.VERIFY_DEVICE_PROOF,
            chainDataVal,
          ),
          prefetchChainData(
            PrefetchChainDataType.VERIFY_MINTER,
            (nfcData.localDevice as any)['entropyAddress'],
          ),
          fetchChainData(
            FetchChainDataType.BLOCK_BY_HASH,
            nfcData.nfcReadOutputBlockhash,
          ),
        ]);

        if (state.blockchainData.verifiedProof === true) {
          await nfcStartQuickVerification();
        } else if (state.blockchainData.verifiedProof == false) {
          await verifyUnknownDevice();
        }
      } else if (netState.isConnected) {
        console.log(`no localDevice`, JSON.stringify(nfcData));
        await Promise.all([
          fetchChainData(
            FetchChainDataType.CONTRACT_REGISTRATION,
            nfcData.nfcReadInfoPrimaryPublicKeyHash,
          ),
          fetchChainData(
            FetchChainDataType.BLOCK_BY_HASH,
            nfcData.nfcReadOutputBlockhash,
          ),
        ]);

        if (state.blockchainData.contractRegistered == true) {
          await nfcStartQuickVerification();
        } else if (state.blockchainData.contractRegistered == false) {
          await verifyUnknownDevice();
        }
      } else {
        await verifyUnknownDevice();
      }
    } catch (error) {
      console.log(error);
    }
  };

  const nfcQuickScan = async () => {
    try {
      await NfcManager.requestTechnology(NfcTech.Ndef, {
        alertMessage: strings.textProcessingQuickTouchNote,
        invalidateAfterFirstRead: true,
      });

      const tag = await NfcManager.getNdefMessage();
      // Update view.
      sendProcessingMessage(strings.textProcessingPreparingResults);
      // Validate tag format.
      const validRecord = nfcValidateRecords(tag);
      console.log(validRecord, 'valid record?');
      // Process.
      if (!validRecord || !tag) {
        navigateToFail(
          strings.textFailUnknownTagTypeWarning,
          strings.textFailUnknownTagTypeDescription,
        );
      } else {
        // Parse the tag, set NFC state.
        let parsedNfcData = nfcParseNdefRecord(tag);
        updateNfcData(parsedNfcData);

        await NfcManager.cancelTechnologyRequest().catch(() => 0);
        await nfcNdefRegistrationCheck();
      }
    } catch (err) {
      sendProcessingMessage(strings.textProcessingPreparingResults);
      await NfcManager.cancelTechnologyRequest().catch(() => 0);
    }
  };
  const nfcStartQuickVerification = async () => {
    console.log(state.blockchainData, 'DATA');

    if (state.blockchainData.verifiedProof == true) {
      try {
        await Promise.all([
          fetchChainData(
            FetchChainDataType.CONTRACT_CODE,
            state.blockchainData.contractVerifierAddress,
          ),
          getBridgeData(nfcData.nfcReadInfoPrimaryPublicKey!),
        ]);
        await verifyMerkleProof();
      } catch (err) {
        navigateToFail(
          strings.textFailBlockchainGetStateAndCodeWarning,
          strings.textFailBlockchainGetStateAndCodeDescription +
            '\n(' +
            err +
            ')',
        );
        NfcManager.cancelTechnologyRequest().catch(err => {
          console.log('Could not close NFC technology: ' + err);
        });
      }

      // NOTE: this covers the deprecated contract flow.
    } else if (state.blockchainData.contractRegistered == true) {
      try {
        await Promise.all([
          fetchChainData(FetchChainDataType.ESCROW_CONTRACT_STATE),
          fetchChainData(
            FetchChainDataType.CONTRACT_CODE,
            state.blockchainData.contractAddress,
          ),
        ]);
        try {
          await Promise.all([
            fetchChainData(FetchChainDataType.ERC20_BALANCE),
            //this._fetchChainData('ERC20IncomingTransfer'),
            //this._fetchChainData('ERC20OutgoingTransfer')
          ]);
        } catch (err) {
          navigateToFail(
            strings.textFailBlockchainGetERC20DataWarning,
            strings.textFailBlockchainGetERC20DataDescription +
              '\n(' +
              err +
              ')',
          );
          NfcManager.cancelTechnologyRequest().catch(err => {
            console.log('Could not close NFC technology: ' + err);
          });
        }
        verifyEscrow();
      } catch (err) {
        navigateToFail(
          strings.textFailBlockchainGetStateAndCodeWarning,
          strings.textFailBlockchainGetStateAndCodeDescription +
            '\n(' +
            err +
            ')',
        );
        NfcManager.cancelTechnologyRequest().catch(err => {
          console.log('Could not close NFC technology: ' + err);
        });
      }
    } else {
      verifyUnknownDevice();
    }
  };
  // REVEAL FNS
  const nfcReveal = async (walletAddress: string, connector: WalletConnect) => {
    // get fetch query parameters
    const {
      nfcReadInfoPrimaryPublicKey: publicKey,
      nfcReadOutputExternalSignature: signature,
    } = state.nfcData;
    const pubLength = publicKey?.length!;
    const sigLength = signature?.length;

    const result = {
      x: publicKey!.slice(0, pubLength! / 2),
      y: publicKey!.slice(pubLength! / 2),

      r: signature!.slice(0, sigLength! / 2),
      s: signature!.slice(sigLength! / 2),
      blockNumber: state.blockchainData.blockNumber,
      walletAddress: walletAddress.slice(2),
    };
    // Checks
    // // check if wallet has erc721
    const ERC721Balance: any = await asyncWrapper(
      await state.chainSettings.citizenERC721Contract?.balanceOf(walletAddress),
      e => {
        navigateToFail(strings.textFailDefaultWarning, `Error: ${e}`);
      },
    );
    console.log(ERC721Balance);
    if (parseInt(ERC721Balance) < 1) {
      navigateToFail(
        'Reveal Error',
        `ERC721 token cannot be found in wallet. Make sure you are connected to a wallet containing the reveal ERC721 and try again.`,
      );
    }
    // console.log(
    //   `${state.chainSettings.bridgeNode}/reveal?x=${result.x}&y=${result.y}&r=${result.r}&s=${result.s}&blockNumber=${result.blockNumber}&addr=${result.walletAddress}`,
    // );
    // check if oracle exists
    const oracle = await (
      await fetch(
        `${state.chainSettings.bridgeNode}/reveal?x=${result.x}&y=${result.y}&r=${result.r}&s=${result.s}&blockNumber=${result.blockNumber}&addr=${result.walletAddress}`,
      )
    ).text();

    if (oracle.slice(0, 2) !== '0x') {
      navigateToFail('Reveal Error', `Oracle cannot be created: ${oracle}`);
      return;
    }
    // const oracle = '0x12312312312312312312312312';
    console.log(
      connector.accounts,
      connector.bridge,
      connector.key,
      connector.networkId,
      connector.chainId,
    );
    const tokenId: any = parseInt(
      await asyncWrapper(
        await state.chainSettings.citizenERC721Contract?.tokenOfOwnerByIndex(
          walletAddress,
          0,
        ),
        e => navigateToFail(strings.textFailDefaultWarning, `Error: ${e}`),
      ),
    );
    // console.log(
    //   tokenId,
    //   ['0x' + result.r, '0x' + result.s],
    //   '0x' + result.x,
    //   '0x' + result.y,
    //   result.blockNumber,
    //   state.blockchainData.root,
    //   oracle,
    // );
    navigate('Polling', {message: 'Polling wallet connect...'});
    const tx = await writeChainData(
      ChainMethods.REVEAL_CTIZEN_REVEAL_ORACLE,
      connector,
      tokenId,
      ['0x' + result.r, '0x' + result.s],
      '0x' + result.x,
      '0x' + result.y,
      result.blockNumber,
      state.blockchainData.root,
      oracle,
    );
    updateParams({message: 'Polling for tx completion...'});

    const waitingOnTx = await state.chainSettings.provider?.waitForTransaction(
      tx,
    );
    console.log(waitingOnTx, 'done');
    // const tx =
    //   '0xdf93192a38a58b90f0f8796446f56aae6dc3127ad190d7adf2233e4fc16f6920';

    updateParams({message: 'Polling for image...'});

    const fetchItem = fetch(`${state.chainSettings.bridgeNode}/reveal`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        tx,
      }).toString(),
    });
    const retries = 2;
    let i = 0;

    while (i <= retries) {
      const response = await fetchItem;
      if (i === retries) {
        navigate('Timeout');
      } else if (response.ok) {
        const responseJSON = await response.json();
        navigate('Reveal', {revealDetails: {...responseJSON, tokenId}});
        break;
      }
      i++;
    }
  };
  const nfcClaim = async (walletAddress: string) => {
    console.log(`ClAIM CALLED: ${Date.now()}`);
    !isIOS && navigate('Processing');
    try {
      updateHeadlessVerification(true);
      updateNfcData({
        nfcReadOutputExternalRandomNumber: walletAddress.slice(2),
      });
      await nfcRun(walletAddress.slice(2));
      updateHeadlessVerification(false);

      // TODO: add more restrictive rules and conditonal handling of different contracts
      console.log(state.blockchainData);
      if (state.blockchainData.contractAddress) {
        if (state.blockchainData.token) {
          navigate('Reveal', {revealDetails: {...state.blockchainData.token}});
        } else {
          navigate('Detected');
        }
      } else {
        navigateToFail(
          'Unclaimable',
          'This chip has nothing to claim. If you think this is incorrect, please retry again.',
        );
      }
    } catch (err) {
      await NfcManager.cancelTechnologyRequest();
      console.log(err);
      throw err;
    }
  };

  // FULL SCAN FNS
  const nfcScanFull = async () => {
    const randomBytes = await asyncWrapper(
      Random.getRandomBytesAsync(32),
      err => {
        goToNfcFailScreen(NfcFailType.NFC_FAIL_RNG, err);
      },
    );
    const randomNumber = bytesToHex(randomBytes);
    await nfcRun(randomNumber);
  };

  const nfcRun = async (input: string) => {
    console.log(`nfcRun CALLED: ${Date.now()}`);

    try {
      await prefetchChainData(PrefetchChainDataType.LATEST_BLOCK);

      console.log(`TECH CALLED: ${Date.now()}`);
      if (isIOS) {
        await NfcManager.requestTechnology(NfcTech.MifareIOS, {
          alertMessage: strings.textProcessingTouchNote,
        });
      } else {
        const isSupported = await NfcManager.isSupported();
        isSupported &&
          (await asyncWrapper(
            NfcManager.requestTechnology(NfcTech.NfcA),
            err => {
              navigateToFail(
                strings.textFailNfcTechRequestWarning,
                strings.textFailNfcTechRequestDescription + '\n(' + err + ')',
              );
              NfcManager.cancelTechnologyRequest();
            },
          ));
      }

      const tag = await NfcManager.getTag();
      // console.log(tag, 'TAG');

      console.log(`GOT TAG: ${Date.now()} with tech ${(tag as any)?.tech}`);
      navigate('Processing');

      sendProcessingMessage(strings.textProcessingNoteDetected);

      const configBytes = await asyncWrapper(cmd([0x30, 0xe8]), err => {
        goToNfcFailScreen(NfcFailType.NFC_FAIL_READ_CONFIG_WARNING, err);
        NfcManager.cancelTechnologyRequest().catch(() => 0);
        NfcManager.unregisterTagEvent().catch(() => 0);
      });
      updateNfcData({icBlockWithLastNdefRecord: configBytes[1]});

      /************
       * Get Keys. *
       ************/

      sendProcessingMessage(strings.textProcessingUniqueInfo);

      const ret = await asyncWrapper(cmd([0x3a, 0x15, 0x42]), err => {
        goToNfcFailScreen(NfcFailType.NFC_FAIL_READ_HASHES, err);
      });

      let mifareRecord = nfcMifareParseRecord(ret);
      updateNfcData(mifareRecord);

      console.log(`BLOCKCHAIN DATA AFTER GEN RANDOM: ${Date.now()}`);

      // Create short-hand names for block variables.
      const blockHash = state.blockchainData.blockHash;
      // const  blockTime = blockchainData.blockTime;
      console.log(`blockHash ${blockHash}`);

      // Create combined hash for input record.
      console.log(input, 'teINPUT');
      const combinedHash = utils.sha256('0x' + input + blockHash).slice(2);
      const completeMemory = structureNdefMessage(
        input.padEnd(64, '0'),
        blockHash!,
        combinedHash,
      );
      console.log('COMPLETE MEM', bytesToHex(completeMemory));
      // Create array with register numbers.
      let registers = [...Array(Math.ceil(completeMemory.length / 4)).keys()];

      // Remove registers that won't be written; The input record begins at register 0xB0.
      registers = registers.filter(register => register >= 0xb0);

      // Update state.
      updateNfcData({
        nfcWrittenInputExternalRandomNumber: input,
        nfcWrittenInputBlockhash: blockHash,
        nfcWrittenInputCombinedHash: combinedHash,
      });
      // Write.
      await asyncWrapper(
        Promise.all(
          registers.map(i => {
            return cmd(
              [0xa2]
                .concat(i) // Register number.
                .concat(
                  completeMemory.slice(
                    i * 4, // Start position in payload.
                    (i + 1) * 4,
                  ), // End position in payload.
                ),
            );
          }),
        ),
        err => {
          navigateToFail('nfcFailWriteInput', err);
        },
      );

      //console.log(`going to msg`)
      await NfcManager.setAlertMessageIOS(
        strings.textProcessingSendingChallenge,
      );

      console.log((nfcData.icBlockWithLastNdefRecord! + 1) * 4 - 1);
      // Read lastIcBlock to finish input.
      await asyncWrapper(
        cmd([0x30, (nfcData.icBlockWithLastNdefRecord! + 1) * 4 - 1]),
        err => {
          goToNfcFailScreen(NfcFailType.NFC_FAIL_READ_LAST_NDEF, err);
        },
      );

      console.log(`READ END OF MEM CALLED: ${Date.now()}`);
      /***************************
       * Timeout for Calculation. *
       ***************************/

      await asyncWrapper(delay(3000), err => {
        goToNfcFailScreen(NfcFailType.NFC_FAIL_TIMEOUT, err);
      });
      /****************
       * Read Results. *
       ****************/

      const hashByteArray = await cmd([0x3a, 0x64, 0x84]);
      sendProcessingMessage(strings.textProcessingReadingResults);

      console.log(`READ HASH BYTE ARRAY CALLED: ${Date.now()}`);

      const signatureByteArray = await cmd([0x3a, 0x84, 0xa4]);

      console.log(
        'hashes',
        bytesToHex(hashByteArray),
        'signature',
        bytesToHex(signatureByteArray),
      );

      console.log(`READ Signature CALLED: ${Date.now()}`);
      console.log(bytesToHex(hashByteArray));
      console.log(bytesToHex(signatureByteArray));

      const mifareData = nfcMifareReadPayload(
        hashByteArray,
        signatureByteArray,
      );
      updateNfcData(mifareData);

      // DEBUG prints.
      console.log(`NFC DATA AFTER RESULTS READ: ${Date.now()}`);

      /*********************
       * Confirmation Read. *
       *********************/

      await asyncWrapper(
        cmd([0x30, (nfcData.icBlockWithLastNdefRecord! + 1) * 4 - 1]),
        err => {
          goToNfcFailScreen(NfcFailType.NFC_FAIL_READ_LAST_NDEF, err);
        },
      );
      /****************
       * Verification. *
       ****************/
      sendProcessingMessage(strings.textProcessingPreparingResults);

      console.log(`Starting verification (in ms): ${Date.now()}`);

      await nfcStartFullVerification();
    } catch (err) {
      sendProcessingMessage(strings.textProcessingPreparingResults);
      console.log(err);
      throw err;
    }
  };

  const nfcStartFullVerification = async () => {
    /******************************************
     * Check Registration and Begin Challenge. *
     ******************************************/
    const localDevice = getLocalDevice(nfcData.nfcReadInfoPrimaryPublicKeyHash);
    console.log('LOCAL', localDevice);
    let hardwareHash;
    let promises: Promise<any>[] = [];
    if (localDevice) {
      hardwareHash = createHardwareHash(
        nfcData.nfcReadInfoPrimaryPublicKeyHash!,
        nfcData.nfcReadInfoSecondaryPublicKeyHash!,
        localDevice['tertiaryPublicKeyHash'].slice(2),
        nfcData.nfcReadInfoHardwareSerialHash!,
      );

      updateNfcData({hardwareHash});

      localDevice.hardwareSerial = nfcData.nfcReadInfoHardwareSerial;

      let chainDataVal = {
        proof: localDevice['proof'],
        root: localDevice['root'],
        hardwareHash: '0x' + hardwareHash,
        kongAmount: '0x' + localDevice['kongAmount'].toString(16),
        device: localDevice,
      };
      promises = [
        prefetchChainData(
          PrefetchChainDataType.VERIFY_DEVICE_PROOF,
          chainDataVal,
        ),
        prefetchChainData(
          PrefetchChainDataType.VERIFY_MINTER,
          localDevice['entropyAddress'],
        ),
      ];
    } else {
      promises = [
        fetchChainData(
          FetchChainDataType.CONTRACT_REGISTRATION,
          nfcData.nfcReadInfoPrimaryPublicKeyHash,
        ),
      ];
    }
    await Promise.all(promises);
    if (state.blockchainData.verifiedProof == true) {
      try {
        const stateBytes = await cmd([0x3a, 0xac, 0xaf]);
        const debugCode = hexToAscii(bytesToHex(stateBytes));
        updateNfcData({debugCode});
        await NfcManager.cancelTechnologyRequest();
      } catch (err) {
        console.log('Could not close NFC technology: ' + err);
      }
      try {
        await fetchChainData(
          FetchChainDataType.CONTRACT_CODE,
          state.blockchainData.contractVerifierAddress,
        );

        // TODO: fetch against server to see if there is any registered content
        await getBridgeData(nfcData.nfcReadInfoPrimaryPublicKey!);
        await verifyMerkleProof();
      } catch (err) {
        navigateToFail(
          strings.textFailBlockchainGetStateAndCodeWarning,
          strings.textFailBlockchainGetStateAndCodeDescription +
            '\n(' +
            err +
            ')',
        );
      }

      // NOTE: this covers the deprecated contract flow.
    } else if (state.blockchainData.contractRegistered == true) {
      try {
        await Promise.all([
          fetchChainData(FetchChainDataType.ESCROW_CONTRACT_STATE),
          fetchChainData(
            FetchChainDataType.CONTRACT_CODE,
            state.blockchainData.contractAddress,
          ),
        ]);
      } catch (err) {
        navigateToFail(
          strings.textFailBlockchainGetStateAndCodeWarning,
          strings.textFailBlockchainGetStateAndCodeDescription +
            '\n(' +
            err +
            ')',
        );
        NfcManager.cancelTechnologyRequest().catch(err => {
          console.log('Could not close NFC technology: ' + err);
        });
      }
      try {
        await Promise.all([fetchChainData(FetchChainDataType.ERC20_BALANCE)]); // Attempt to get debug code.
        try {
          const stateBytes = await cmd([0x3a, 0xac, 0xaf]);

          const debugCode = hexToAscii(bytesToHex(stateBytes));
          updateNfcData({debugCode});
        } catch (err) {
          console.log(`error: ${err}`);
        }
        verifyEscrow();
      } catch (err) {
        NfcManager.cancelTechnologyRequest().catch(err => {
          console.log('Could not close NFC technology: ' + err);
        });
      }
    } else {
      await getBridgeData(nfcData.nfcReadInfoPrimaryPublicKey!);

      try {
        const stateBytes = await cmd([0x3a, 0xac, 0xaf]);
        const debugCode = hexToAscii(bytesToHex(stateBytes));

        updateNfcData({debugCode});

        NfcManager.cancelTechnologyRequest().catch(err => {
          console.log('Could not close NFC technology: ' + err);
        });
        console.log('entered here');
        await verifyUnknownDevice();
      } catch (err) {
        NfcManager.cancelTechnologyRequest().catch(err => {
          console.log('Could not close NFC technology: ' + err);
        });
        await verifyUnknownDevice();
      }
    }
  };

  const goToNfcSetting = async () => {
    try {
      const result = await NfcManager.goToNfcSetting();
      console.log('goToNfcSetting OK', result);
    } catch (err) {
      console.warn('goToNfcSetting fail', err);
    }
  };

  const goToNfcFailScreen = async (failType: NfcFailType, err: any) => {
    await sendProcessingMessage(strings.textProcessingPreparingResults);

    // TODO: catch actual NFC error message from system, notable in timeout
    let warning: string = '',
      description: string = '';
    const {
      NFC_FAIL_READ_LAST_NDEF,
      NFC_FAIL_READ_INFO,
      NFC_FAIL_READ_SIGNATURES,
      NFC_FAIL_READ_HASHES,
      NFC_FAIL_TIMEOUT,
      NFC_FAIL_WRITE_INPUT,
      NFC_FAIL_RNG,
    } = NfcFailType;

    switch (failType) {
      case NFC_FAIL_READ_LAST_NDEF:
        warning = strings.textFailNfcReadLastNdefWarning;
        description = strings.textFailNfcReadLastNdefDescription;
        break;
      case NFC_FAIL_READ_INFO:
        warning = strings.textFailNfcReadInfoWarning;
        description = strings.textFailNfcReadInfoDescription;
        break;
      case NFC_FAIL_READ_SIGNATURES:
        warning = strings.textFailNfcReadSignaturesWarning;
        description = strings.textFailNfcReadSignaturesDescription;
        break;
      case NFC_FAIL_READ_HASHES:
        warning = strings.textFailNfcReadHashesWarning;
        description = strings.textFailNfcReadHashesDescription;
        break;
      case NFC_FAIL_TIMEOUT:
        warning = strings.textFailTimeoutWarning;
        description = strings.textFailTimeoutDescription;
        break;
      case NFC_FAIL_WRITE_INPUT:
        warning = strings.textFailNfcWriteInputWarning;
        description = strings.textFailNfcWriteInputDescription;
        break;
      case NFC_FAIL_RNG:
        warning = strings.textFailRngWarning;
        description = strings.textFailRngDescription;
        break;
      default:
        break;
    }

    // Set prev error so we pass along
    let passedErr = err;
    let stateBytes: Uint8Array | number[] = [];
    if (state.fullVerification) {
      try {
        stateBytes = await cmd([0x3a, 0xac, 0xaf]);
        const debugCode = hexToAscii(bytesToHex(stateBytes));
        console.warn(debugCode);
        navigateToFail(
          warning,
          description + '\n\n(System: ' + err + ' /' + debugCode + ')',
        );
        NfcManager.cancelTechnologyRequest().catch(err => {
          console.log('Could not cancel NFC request: ' + err);
        });
      } catch (err) {
        err = passedErr;

        navigateToFail(
          warning,
          description + '\n\n(System: ' + err + ' / Could not get debug code)',
        );
        NfcManager.cancelTechnologyRequest().catch(err => {
          console.log('Could not cancel NFC request: ' + err);
        });
      }
    } else {
      const debugCode = hexToAscii(bytesToHex(stateBytes));
      console.warn(debugCode);
      navigateToFail(
        warning,
        description + '\n\n(System: ' + err + ' /' + debugCode + ')',
      );
      NfcManager.cancelTechnologyRequest().catch(err => {
        console.log('Could not cancel NFC request: ' + err);
      });
    }
  };

  return {
    nfcReveal,
    nfcClaim,
    nfcStart,
    nfcScanStart,
    nfcQuickScan,
    nfcScanFull,
    goToNfcSetting,
  };
};

// UTILS

const cmd: (bytes: number[]) => Promise<number[]> = bytes =>
  isIOS ? NfcManager.sendMifareCommandIOS(bytes) : NfcManager.transceive(bytes);

const sendProcessingMessage = async (message: string) => {
  if (isIOS) {
    await NfcManager.setAlertMessageIOS(message);
  } else {
    updateParams({message});
  }
};

const nfcValidateRecords = (tag: TagEvent | null) => {
  // Validate tag format.
  let validRecord = true;
  if (tag && tag.ndefMessage.length == 6) {
    if (tag.ndefMessage[0].payload.length != 10) {
      validRecord = false;
    }
    if (tag.ndefMessage[1].payload.length != 7) {
      validRecord = false;
    }
    if (tag.ndefMessage[2].payload.length != 2) {
      validRecord = false;
    }
    if (tag.ndefMessage[3].payload.length != 324) {
      validRecord = false;
    }
    if (tag.ndefMessage[4].payload.length != 304) {
      validRecord = false;
    }
    if (tag.ndefMessage[5].payload.length != 99) {
      validRecord = false;
    }
  } else {
    validRecord = false;
  }
  return validRecord;
};

const nfcParseNdefRecord = (tag: TagEvent) => {
  console.log(`nfcSetData called with ${tag}`);
  // Parse records.
  const infoRecord = bytesToHex(tag.ndefMessage[3].payload);
  const inputRecord = bytesToHex(tag.ndefMessage[5].payload);
  const outputRecord = bytesToHex(tag.ndefMessage[4].payload);

  // Extract info.
  const nfcReadInfoPrimaryPublicKey = infoRecord.slice(32, 160);
  const nfcReadInfoSecondaryPublicKey = infoRecord.slice(160, 288);
  const nfcReadInfoHardwareSerial = infoRecord.slice(374, 392);

  const nfcReadInfoPrimaryPublicKeyHash = utils
    .sha256('0x' + nfcReadInfoPrimaryPublicKey)
    .slice(2);
  const nfcReadInfoSecondaryPublicKeyHash = utils
    .sha256('0x' + nfcReadInfoSecondaryPublicKey)
    .slice(2);
  const nfcReadInfoHardwareSerialHash = utils
    .sha256('0x' + nfcReadInfoHardwareSerial)
    .slice(2);

  // Check local storage.
  const localDevice = getLocalDevice(nfcReadInfoPrimaryPublicKeyHash);
  let hardwareHash;

  if (localDevice) {
    hardwareHash = createHardwareHash(
      nfcReadInfoPrimaryPublicKeyHash,
      nfcReadInfoSecondaryPublicKeyHash,
      localDevice['tertiaryPublicKeyHash'].slice(2),
      nfcReadInfoHardwareSerialHash,
    );
    localDevice.hardwareSerial = nfcReadInfoHardwareSerial;
  }
  console.log(outputRecord, 'OUTPUT');
  // Update state.
  let nfcData = {
    // inputRecord
    nfcReadInputCommandCode: inputRecord.slice(0, 2),
    nfcReadInputExternalRandomNumber: inputRecord.slice(2, 66),
    nfcReadInputBlockhash: inputRecord.slice(66, 130),
    nfcReadInputCombinedHash: inputRecord.slice(130, 194),

    // outputRecord
    nfcReadOutputCommandCode: outputRecord.slice(0, 2),
    nfcReadOutputExternalRandomNumber: outputRecord.slice(2, 66),
    nfcReadOutputBlockhash: outputRecord.slice(66, 130),
    nfcReadOutputCombinedHash: outputRecord.slice(130, 194),
    nfcReadOutputInternalRandomNumber: outputRecord.slice(194, 258),
    nfcReadOutputExternalSignature: outputRecord.slice(258, 386),
    nfcReadOutputInternalSignature: outputRecord.slice(386, 514),

    // infoRecord
    nfcReadInfoPrimaryPublicKey: nfcReadInfoPrimaryPublicKey,
    nfcReadInfoSecondaryPublicKey: nfcReadInfoSecondaryPublicKey,
    nfcReadInfoPrimaryPublicKeyHash: nfcReadInfoPrimaryPublicKeyHash,
    nfcReadInfoHardwareSerial: nfcReadInfoHardwareSerial,

    // Device information.
    localDevice: localDevice,
    hardwareHash: hardwareHash,
  };
  console.log(nfcData, 'DATA');
  return nfcData;
};

const nfcMifareParseRecord = (byteArray: any[]) => {
  console.log(`_nfcMifareParseRecord`);
  // Slice keys from response.
  const externalPublicKey = bytesToHex(byteArray.slice(2, 66));
  const internalPublicKey = bytesToHex(byteArray.slice(66, 130));
  const hardwareSerial = bytesToHex(byteArray.slice(173, 182));
  console.log('nfcReadInfoPrimaryPublicKey-test', externalPublicKey);
  // Hash the keys.
  const externalPublicKeyHash = utils.sha256('0x' + externalPublicKey).slice(2);
  const internalPublicKeyHash = utils.sha256('0x' + internalPublicKey).slice(2);
  const hardwareSerialHash = utils.sha256('0x' + hardwareSerial).slice(2);

  let mifareData = {
    nfcReadInfoPrimaryPublicKey: externalPublicKey,
    nfcReadInfoSecondaryPublicKey: internalPublicKey,
    nfcReadInfoPrimaryPublicKeyHash: externalPublicKeyHash,
    nfcReadInfoSecondaryPublicKeyHash: internalPublicKeyHash,
    nfcReadInfoHardwareSerial: hardwareSerial,
    nfcReadInfoHardwareSerialHash: hardwareSerialHash,
  };
  return mifareData;
};

const nfcMifareReadPayload = (
  hashByteArray: any[],
  signatureByteArray: any[],
) => {
  // Get external and internal hash.
  const nfcReadOutputExternalRandomNumber = bytesToHex(
    hashByteArray.slice(1, 33),
  ).toLowerCase();
  const nfcReadOutputBlockhash = bytesToHex(
    hashByteArray.slice(33, 65),
  ).toLowerCase();
  const nfcReadOutputCombinedHash = bytesToHex(
    hashByteArray.slice(65, 97),
  ).toLowerCase();
  const nfcReadOutputInternalRandomNumber = bytesToHex(
    hashByteArray.slice(97, 129),
  ).toLowerCase();

  // Get signatures.
  const nfcReadOutputExternalSignature = bytesToHex(
    signatureByteArray.slice(1, 65),
  ).toLowerCase();
  const nfcReadOutputInternalSignature = bytesToHex(
    signatureByteArray.slice(65, 129),
  ).toLowerCase();

  // Counter.
  const nfcReadOutputCounter = bytesToHex(
    signatureByteArray.slice(129, 130),
  ).toLowerCase();

  let mifareData = {
    nfcReadOutputExternalRandomNumber: nfcReadOutputExternalRandomNumber,
    nfcReadOutputBlockhash: nfcReadOutputBlockhash,
    nfcReadOutputCombinedHash: nfcReadOutputCombinedHash,
    nfcReadOutputInternalRandomNumber: nfcReadOutputInternalRandomNumber,
    nfcReadOutputExternalSignature: nfcReadOutputExternalSignature,
    nfcReadOutputInternalSignature: nfcReadOutputInternalSignature,
    nfcReadOutputCounter: nfcReadOutputCounter,
  };
  return mifareData;
};

const createUnknownRecord = (hex: string): NdefRecord => {
  return {
    tnf: 0x05,
    type: [],
    id: [],
    payload: hexToBytes(hex),
  };
};

// ENSURE each hash does not contain 0x to start
const structureNdefMessage = (
  randomNumber: string,
  blockHash: string,
  combinedHash: string,
) => {
  // Create records for link to app store and AAR.
  var kongDomain = 'https://kong.cash';
  var androidAppName = 'kongApp';
  var uriRecord = Ndef.uriRecord(kongDomain);
  var aarRecord = Ndef.androidApplicationRecord(androidAppName);
  // Create padding record.
  var shortMessage = Ndef.encodeMessage([uriRecord, aarRecord]);
  var paddingLength = 12 * 4 - shortMessage.length - 5; // Revisit this.
  var paddingRecord = createUnknownRecord('9'.repeat(paddingLength));
  console.log('RANDOM NUM INPUT');
  console.log(randomNumber);
  console.log('RANDOM HASH INPUT');
  console.log(combinedHash);
  console.log(aarRecord, bytesToHex(Ndef.encodeMessage([aarRecord])));
  // Combine all.
  let ndefMessage = Ndef.encodeMessage([
    // Static Lock Bytes.
    uriRecord, // URI with domain that forwards to iOS app store.
    aarRecord,
    paddingRecord, // Padd.
    // Dynamic Lock Bytes.
    createUnknownRecord(
      // 06 Bytes: Header
      '01'.repeat(4) +
        '02'.repeat(4) +
        '03'.repeat(8) +
        '04'.repeat(64) + // 64 Bytes: Public Key 1
        '05'.repeat(64) + // 64 Bytes: Public Key 2
        '06'.repeat(20) +
        '07'.repeat(7) +
        '08'.repeat(16) +
        '09'.repeat(9) + // 08 Bytes: ATECC608A Serial
        '01'.repeat(128), // 128 Bytes: Config Zone Bytes
    ),
    // Output.
    createUnknownRecord(
      // 06 Bytes: Header
      '00' + // 01 Byte:  Last Command Code.
        '01'.repeat(32) + // 32 Bytes: Last External Random Number.
        '02'.repeat(32) + // 32 Bytes: Last Blockhash.
        '03'.repeat(32) + // 32 Bytes: Last SHA256 (External Random Number + Blockhash).
        '04'.repeat(32) + // 32 Bytes: Last Internal Random SHA256 Hash (Internal Random Number).
        '05'.repeat(64) + // 64 Bytes: Last Signature 1 (SHA256 Hash (External Random Number + Blockhash)).
        '06'.repeat(64) + // 64 Bytes: Last Signature 2 (SHA256 Hash (Internal Random Number)).
        '07'.repeat(47), // 47 Bytes: Padding
    ),
    // Input.
    createUnknownRecord(
      // 03 Bytes: Header
      '00' + // 01 Bytes: Command Code.
        randomNumber + // 32 Bytes: External Random Number.
        blockHash + // 32 Bytes: Blockhash.
        combinedHash + // 32 Bytes: SHA256 (External Random Number + Blockhash).
        crc16ccitt(
          Buffer.from(
            hexToBytes('00' + randomNumber + blockHash + combinedHash),
          ),
        ).toString(16), // 02 Bytes: CRC16
    ),
  ]);

  // TLV.
  let ndefTLV = [
    0x03, // Field Type (0x03 = NDEF Message)
    0xff, // Length field
    ndefMessage.length >> 8, // Length field cont.
    ndefMessage.length - (ndefMessage.length >> 8) * 256, // Length field cont.
  ];
  // Note: Length field in 3 byte version:
  // [0xFF, 0xYY, 0xXZ] where 0xYY, 0xZZ are sliced from word 0xYYZZ (!)
  // Prepend TLV.
  ndefMessage = ndefTLV.concat(ndefMessage);
  // Append terminator and trailing 0x00
  ndefMessage = ndefMessage.concat([0xfe]);
  while (ndefMessage.length % 4 > 0) ndefMessage = ndefMessage.concat([0x00]);
  // Determine number of ic blocks.
  // var icBlockWithLastNdefRecord = Math.ceil(ndefMessage.length / 16);
  // Prepend 16 bytes for first 4 registers.
  let completeMemory = hexToBytes('00'.repeat(16)).concat(ndefMessage);

  return completeMemory;
};
