import {crc16ccitt} from 'crc';
import {Platform} from 'react-native';
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
import {navigate, checkCurrentRoute} from '../../common/RootNavigation';
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
        if (!isIOS) {
          const isNfcEnabled = await NfcManager.isEnabled();

          if (isNfcEnabled) {
            updateNfcSettings({nfcEnabled: isNfcEnabled});
            try {
              await NfcManager.start();
              console.log('Successfully started NFC');
              await nfcScanStart();
            } catch (err) {
              console.warn('Failed to start NFC: ', err);
              updateNfcSettings({nfcSupported: false});
            }
          }
        } else if (isIOS) {
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
    NfcManager.cancelTechnologyRequest().catch(err => console.warn(err));
    if (state.fullVerification) {
      if (isIOS) {
        nfcIOSScanFull();
      } else {
        await NfcManager.registerTagEvent();
        nfcAndroidScanFull();
      }
    } else {
      !isIOS && (await NfcManager.registerTagEvent());
      nfcQuickScan();
    }
  };

  // QUICK SCAN FNS
  const nfcNdefRegistrationCheck = async () => {
    console.log('nfcDATA nDef', nfcData);
    try {
      const netState = await NetInfo.fetch();
      console.log(netState, nfcData);
      // console.log(this.state.nfcData.localDevice)
      // console.log(this.state.nfcData.hardwareHash)
      if (netState.isConnected && nfcData.localDevice && nfcData.hardwareHash) {
        console.log(`localDevice checking merkle`, nfcData);
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
      await NfcManager.requestTechnology(
        NfcTech.Ndef,
        !isIOS
          ? {
              alertMessage: strings.textProcessingQuickTouchNoteIOS,
              invalidateAfterFirstRead: true,
            }
          : {
              alertMessage: 'Hold the chip close to the top of your phone',
              isReaderModeEnabled: true,
            },
      );

      const tag = await NfcManager.getNdefMessage();
      // Update view.
      navigate('Processing');
      isIOS &&
        (await NfcManager.setAlertMessageIOS(
          strings.textProcessingPreparingResultsIOS,
        ));

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
      isIOS &&
        (await NfcManager.setAlertMessageIOS(
          strings.textProcessingPreparingResultsIOS,
        ));
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
    console.log(walletAddress);
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
    console.log(
      `${state.chainSettings.bridgeNode}/reveal?x=${result.x}&y=${result.y}&r=${result.r}&s=${result.s}&blockNumber=${result.blockNumber}&addr=${result.walletAddress}`,
    );
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
    const tokenId: any = parseInt(
      await asyncWrapper(
        await state.chainSettings.citizenERC721Contract?.tokenOfOwnerByIndex(
          walletAddress,
          0,
        ),
        e => navigateToFail(strings.textFailDefaultWarning, `Error: ${e}`),
      ),
    );
    navigate('Polling');
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

    // const tx =
    //   '0x04cf1e3c2d143f66d978b7e1ca890be260b342be70bf509bd26e5017f7d60759';
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

    const retries = 3;
    let i = 0;
    while (i < retries) {
      const response = await fetchItem;
      if (response.ok) {
        const responseJSON = await response.json();
        console.log(responseJSON);
        navigate('Reveal', {revealDetails: {...responseJSON, tokenId}});
        break;
      }
      i++;
    }
    // after 3 retries go to timeout
    if (i === 3) {
      navigate('Timeout');
    }
  };
  const nfcClaim = async (walletAddress: string) => {
    console.log(`ClAIM CALLED: ${Date.now()}`);
    try {
      updateHeadlessVerification(true);
      updateNfcData({
        nfcReadOutputExternalRandomNumber: walletAddress.slice(2),
      });
      await nfcIOSRun(walletAddress.slice(2));
      updateHeadlessVerification(false);
      if (state.blockchainData.contractAddress) {
        navigate('Detected');
      } else {
        navigateToFail(
          'Unclaimable',
          'This chip has nothing to claim. If you think this is incorrect, please retry again.',
        );
      }
    } catch (err) {
      navigateToFail(
        strings.textFailDefaultWarning,
        strings.textFailDefaultDescription + '\n(' + err + ')',
      );
      NfcManager.cancelTechnologyRequest();
    }
  };

  // FULL SCAN FNS
  const nfcIOSScanFull = async () => {
    const randomBytes = await asyncWrapper(
      Random.getRandomBytesAsync(32),
      err => {
        goToNfcFailScreen(NfcFailType.NFC_FAIL_RNG, err);
      },
    );
    const randomNumber = bytesToHex(randomBytes);
    await nfcIOSRun(randomNumber);
  };
  const nfcIOSRun = async (input: string) => {
    console.log(`iOS FULL SCAN CALLED: ${Date.now()}`);
    try {
      await prefetchChainData(PrefetchChainDataType.LATEST_BLOCK);

      console.log(`TECH CALLED: ${Date.now()}`);

      await NfcManager.requestTechnology(NfcTech.MifareIOS, {
        alertMessage: strings.textProcessingTouchNoteIOS,
      });

      const tag = await NfcManager.getTag();
      console.log(tag, 'TAG');

      console.log(`GOT TAG: ${Date.now()} with tech ${(tag as any)?.tech}`);
      navigate('Processing');
      await NfcManager.setAlertMessageIOS(
        strings.textProcessingNoteDetectedIOS,
      );

      const configBytes = await asyncWrapper(
        NfcManager.sendMifareCommandIOS([0x30, 0xe8]),
        err => {
          goToNfcFailScreen(NfcFailType.NFC_FAIL_READ_CONFIG_WARNING, err);
          NfcManager.cancelTechnologyRequest().catch(() => 0);
          NfcManager.unregisterTagEvent().catch(() => 0);
        },
      );
      updateNfcData({icBlockWithLastNdefRecord: configBytes[1]});

      /************
       * Get Keys. *
       ************/

      await NfcManager.setAlertMessageIOS(strings.textProcessingUniqueInfoIOS);

      const ret = await asyncWrapper(
        NfcManager.sendMifareCommandIOS([0x3a, 0x15, 0x42]),
        err => {
          goToNfcFailScreen(NfcFailType.NFC_FAIL_READ_HASHES, err);
        },
      );

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
            return NfcManager.sendMifareCommandIOS(
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
          // TODO
          // this._goToNfcFailScreen('nfcFailWriteInput', err);
        },
      );

      //console.log(`going to msg`)
      NfcManager.setAlertMessageIOS(strings.textProcessingSendingChallengeIOS);
      console.log((nfcData.icBlockWithLastNdefRecord! + 1) * 4 - 1);
      // Read lastIcBlock to finish input.
      await asyncWrapper(
        NfcManager.sendMifareCommandIOS([
          0x30,
          (nfcData.icBlockWithLastNdefRecord! + 1) * 4 - 1,
        ]),
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

      const hashByteArray = await NfcManager.sendMifareCommandIOS([
        0x3a, 0x64, 0x84,
      ]);

      await NfcManager.setAlertMessageIOS(
        strings.textProcessingReadingResultsIOS,
      );

      console.log(`READ HASH BYTE ARRAY CALLED: ${Date.now()}`);

      const signatureByteArray = await NfcManager.sendMifareCommandIOS([
        0x3a, 0x84, 0xa4,
      ]);

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
        NfcManager.sendMifareCommandIOS([
          0x30,
          (nfcData.icBlockWithLastNdefRecord! + 1) * 4 - 1,
        ]),
        err => {
          goToNfcFailScreen(NfcFailType.NFC_FAIL_READ_LAST_NDEF, err);
        },
      );
      /****************
       * Verification. *
       ****************/
      await NfcManager.setAlertMessageIOS(
        strings.textProcessingPreparingResultsIOS,
      );

      console.log(`Starting verification (in ms): ${Date.now()}`);

      await nfcStartFullVerification();
    } catch (err) {
      NfcManager.setAlertMessageIOS(strings.textProcessingPreparingResultsIOS);
      console.log(err);
      goToNfcFailScreen(NfcFailType.NFC_FAIL_READ_INFO, err);
      throw err;
    }
  };
  const nfcAndroidScanFull = async () => {
    /*********************
     * Start NFC Handler. *
     *********************/
    try {
      const isSupported = await NfcManager.isSupported();

      console.log(`CHECK SUPPORT: ${Date.now()}`);

      isSupported &&
        (await asyncWrapper(NfcManager.requestTechnology(NfcTech.NfcA), err => {
          navigateToFail(
            strings.textFailNfcTechRequestWarning,
            strings.textFailNfcTechRequestDescription + '\n(' + err + ')',
          );
          NfcManager.cancelTechnologyRequest();
        }));

      console.log(`TECH REQUEST: ${Date.now()}`);

      // Update view.
      // TODO
      // this._goToScreen('atProcessing', strings.textProcessingStartAndroid);

      /******************
       * Check Tag Type. *
       ******************/

      const ret = await asyncWrapper(
        NfcManager.transceive([0x3a, 0x11, 0x15]),
        err => {
          navigateToFail(
            strings.textFailUnknownTagTypeWarning,
            strings.textFailUnknownTagTypeDescription + '\n(' + err + ')',
          );
          NfcManager.cancelTechnologyRequest();
        },
      );

      console.log(`CHECKING TAG TYPE: ${Date.now()}`);

      let validTag =
        JSON.stringify(ret.slice(2, -2)) ==
        JSON.stringify([1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3]);

      // This should be removed once we have settled on an appropriate tag type check...
      validTag = true;

      if (validTag) {
        /******************************
         * Get Configuration Register. *
         ******************************/

        const configBytes = await asyncWrapper(
          NfcManager.transceive([0x30, 0xe8]),
          err => {
            // this._goToNfcFailScreen('nfcFailReadConfigWarning', err);
          },
        );

        updateNfcData({
          icBlockWithLastNdefRecord: configBytes[1],
        });

        /************
         * Get Keys. *
         ************/

        const ret = await asyncWrapper(
          NfcManager.transceive([0x3a, 0x15, 0x42]),
          err => {
            // this._goToNfcFailScreen('nfcFailReadHashesWarning', err);
          },
        );
        let mifareRecord = nfcMifareParseRecord(ret);
        updateNfcData(mifareRecord);
        await asyncWrapper(
          fetchChainData(FetchChainDataType.LATEST_BLOCK),
          err => {
            navigateToFail(
              strings.textFailBlockchainGetLatestBlockAndRegistrationWarning,
              strings.textFailBlockchainGetLatestBlockAndRegistrationDescription +
                '\n(' +
                err +
                ')',
            );
            NfcManager.cancelTechnologyRequest();
          },
        );
        const randomBytes = await asyncWrapper(
          Random.getRandomBytesAsync(32),
          err => {
            // this._goToNfcFailScreen('nfcFailRng', err);
          },
        );
        const randomNumber = bytesToHex(randomBytes);

        // Create short-hand names for block variables.
        const blockHash = state.blockchainData.blockHash;
        // var blockTime = this.state.blockchainData.blockTime;

        // Create combined hash for input record.
        const combinedHash = utils
          .sha256('0x' + randomNumber + blockHash)
          .slice(2);

        const completeMemory = structureNdefMessage(
          randomNumber,
          blockHash!,
          combinedHash,
        );

        // Create array with register numbers.
        let registers = [...Array(Math.ceil(completeMemory.length / 4)).keys()];

        // Remove registers that won't be written; The input record begins at register 0xB0.
        registers = registers.filter(register => register >= 0xb0);

        // Update state.
        updateNfcData({
          nfcWrittenInputExternalRandomNumber: randomNumber,
          nfcWrittenInputBlockhash: blockHash,
          nfcWrittenInputCombinedHash: combinedHash,
        });
        // Write.
        await asyncWrapper(
          Promise.all(
            registers.map(i => {
              return NfcManager.transceive(
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
            // TODO
            // this._goToNfcFailScreen('nfcFailWriteInput', err);
          },
        );

        // Read lastIcBlock to finish input.
        await asyncWrapper(
          NfcManager.transceive([
            0x30,
            (nfcData.icBlockWithLastNdefRecord! + 1) * 4 - 1,
          ]),
          err => {
            goToNfcFailScreen(NfcFailType.NFC_FAIL_READ_LAST_NDEF, err);
          },
        );
        /***************************
         * Timeout for Calculation. *
         ***************************/

        await asyncWrapper(delay(2500), err => {
          goToNfcFailScreen(NfcFailType.NFC_FAIL_TIMEOUT, err);
        });
        /****************
         * Read Results. *
         ****************/

        const hashByteArray = await asyncWrapper(
          NfcManager.transceive([0x3a, 0x64, 0x84]),
          err => {
            goToNfcFailScreen(NfcFailType.NFC_FAIL_READ_HASHES, err);
          },
        );
        const signatureByteArray = await asyncWrapper(
          NfcManager.transceive([0x3a, 0x84, 0xa4]),
          err => {
            goToNfcFailScreen(NfcFailType.NFC_FAIL_READ_SIGNATURES, err);
          },
        );
        const mifareData = nfcMifareReadPayload(
          hashByteArray,
          signatureByteArray,
        );

        // Update state.
        updateNfcData(mifareData);

        /*********************
         * Confirmation Read. *
         *********************/

        await asyncWrapper(
          NfcManager.transceive([
            0x30,
            (nfcData.icBlockWithLastNdefRecord! + 1) * 4 - 1,
          ]),
          err => {
            // this._goToNfcFailScreen('nfcFailReadLastNdef', err);
          },
        );

        /****************
         * Verification. *
         ****************/

        console.log(`Starting verification (in ms): ${Date.now()}`);

        // this._goToScreen(
        //   'atProcessing',
        //   strings.textProcessingVerificationStartAndroid,
        // );
        // this._nfcStartFullVerification();
      } else {
        navigateToFail(
          strings.textFailUnknownTagTypeWarning,
          strings.textFailUnknownTagTypeDescription,
        );
        NfcManager.cancelTechnologyRequest();
      }
    } catch (err) {
      navigateToFail(
        strings.textFailNfcSupportWarning,
        strings.textFailNfcSupportDescription + '\n(' + err + ')',
      );
      NfcManager.cancelTechnologyRequest();
    }
  };
  const nfcStartFullVerification = async () => {
    /******************************************
     * Check Registration and Begin Challenge. *
     ******************************************/
    const localDevice = getLocalDevice(nfcData.nfcReadInfoPrimaryPublicKeyHash);
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
      if (Platform.OS == 'android') {
        try {
          const stateBytes = await NfcManager.transceive([0x3a, 0xac, 0xaf]);
          var debugCode = hexToAscii(bytesToHex(stateBytes));
          updateNfcData({debugCode});
        } catch (err) {
          console.log(`error from transceive: ${err}`);
        }

        await NfcManager.cancelTechnologyRequest().catch(err => {
          console.log('Could not close NFC technology: ' + err);
        });
        try {
          await fetchChainData(
            FetchChainDataType.CONTRACT_CODE,
            state.blockchainData.contractVerifierAddress,
          );
          // TODO: fetch against server to see if there is any registered content
          if (nfcData.nfcReadInfoPrimaryPublicKey) {
            await getBridgeData(nfcData.nfcReadInfoPrimaryPublicKey);
            await verifyMerkleProof();
          }
        } catch (err) {
          navigateToFail(
            strings.textFailBlockchainGetStateAndCodeWarning,
            strings.textFailBlockchainGetStateAndCodeDescription +
              '\n(' +
              err +
              ')',
          );
        }
      } else {
        try {
          const stateBytes = await NfcManager.sendMifareCommandIOS([
            0x3a, 0xac, 0xaf,
          ]);
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
          const stateBytes = await NfcManager.transceive([0x3a, 0xac, 0xaf]);

          const debugCode = hexToAscii(bytesToHex(stateBytes));
          updateNfcData({debugCode});
        } catch (err) {
          console.log(`error from transceive: ${err}`);
        }
        if (Platform.OS == 'android') {
          console.log('Beginning android verification.');
        } else {
          NfcManager.cancelTechnologyRequest().catch(err => {
            console.log('Could not close NFC technology: ' + err);
          });
          console.log('Beginning ios verification.');
        }
        verifyEscrow();
      } catch (err) {
        // navigateToFail(
        //   strings.textFailBlockchainGetERC20DataWarning,
        //   strings.textFailBlockchainGetERC20DataDescription + '\n(' + err + ')',
        // );
        NfcManager.cancelTechnologyRequest().catch(err => {
          console.log('Could not close NFC technology: ' + err);
        });
      }
    } else {
      await getBridgeData(nfcData.nfcReadInfoPrimaryPublicKey!);

      if (Platform.OS == 'ios') {
        try {
          const stateBytes = await NfcManager.sendMifareCommandIOS([
            0x3a, 0xac, 0xaf,
          ]);
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
      } else {
        try {
          const stateBytes = await NfcManager.transceive([0x3a, 0xac, 0xaf]);

          const debugCode = hexToAscii(bytesToHex(stateBytes));
          updateNfcData({debugCode});
          await verifyUnknownDevice();
        } catch (err) {
          // Commneting out because of simulated mode.
          navigateToFail(
            '',
            '\n(' + err + ' / Could not get debug code / Unregistered device.)',
          );
          NfcManager.cancelTechnologyRequest().catch(err => {
            console.log('Could not close NFC technology: ' + err);
          });
          await verifyUnknownDevice();
        }
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
    NfcManager.setAlertMessageIOS(strings.textProcessingPreparingResultsIOS);

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

    // Print out current state.
    // console.log('Fail state:');
    // console.log(this.state);
    // for (i = 0; i <= this.state.length; i ++) {
    //     console.log(this.state[i]);
    // }

    // Set prev error so we pass along
    let passedErr = err;
    let stateBytes: Uint8Array | number[] = [];
    if (isIOS && state.fullVerification) {
      try {
        stateBytes = await NfcManager.sendMifareCommandIOS([0x3a, 0xac, 0xaf]);
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
    } else if (Platform.OS == 'ios') {
      const debugCode = hexToAscii(bytesToHex(stateBytes));
      console.warn(debugCode);
      navigateToFail(
        warning,
        description + '\n\n(System: ' + err + ' /' + debugCode + ')',
      );
      NfcManager.cancelTechnologyRequest().catch(err => {
        console.log('Could not cancel NFC request: ' + err);
      });
    } else if (Platform.OS == 'android') {
      try {
        const stateBytes = await NfcManager.transceive([0x3a, 0xac, 0xaf]);
        const debugCode = hexToAscii(bytesToHex(stateBytes));
        console.warn(debugCode);
        navigateToFail(
          warning,
          description + '\n\n(System: ' + err + ' /' + debugCode + ')',
        );
        NfcManager.cancelTechnologyRequest().catch(err => {
          console.log('Could not close NFC technology: ' + err);
        });
      } catch (err) {
        navigateToFail(
          warning,
          description + '\n\n(System: ' + err + ' / Could not get debug code)',
        );
        NfcManager.cancelTechnologyRequest().catch(err => {
          console.log('Could not close NFC technology: ' + err);
        });
      }
    }
  };

  return {
    nfcReveal,
    nfcClaim,
    nfcStart,
    nfcScanStart,
    nfcQuickScan,
    nfcIOSScanFull,
    nfcAndroidScanFull,
    goToNfcSetting,
  };
};

// UTILS
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