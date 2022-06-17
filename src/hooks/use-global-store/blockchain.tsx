import registerMerkleRootABI from '../../../assets/data/RegisterMerkleRootABI.json';
import citizenERC20ABI from '../../../assets/data/CitizenERC20ABI.json';
import citizenERC721ABI from '../../../assets/data/CitizenERC721ABI.json';
import revealCitizenABI from '../../../assets/data/RevealCitizenABI.json';

import kongEntropyMerkle from '../../../assets/data/KongEntropyMerkle.json';
import hashedInterfaces from '../../../assets/data/hashedInterfaces.json';
import knownValues from '../../../assets/data/knownValues.js';
import WalletConnect from '@walletconnect/client';
import {ethers, utils} from 'ethers';
import {
  BlockChainData,
  ChainSettings,
  CurrentState,
  FetchChainDataType,
  PrefetchChainDataType,
  ChainMethods,
} from '../../common/types';
import {MMKV, MMKVKeys} from '../../common/mmkv';
import strings from '../../../assets/text/strings';
import {asyncWrapper, isJSONable, web3} from '../../common/utils';
import {navigate} from '../../common/RootNavigation';
const knownTokens = knownValues['knownTokens'] as any;
const knownHardwareModels = knownValues['knownHardwareModels'] as any;
const knownContractVersions = knownValues['knownContractVersions'] as any;
const knownHardwareManufacturers = knownValues[
  'knownHardwareManufacturers'
] as any;
interface IGetBlockchainFns {
  state: CurrentState;
  setChainSettings: (input: ChainSettings) => void;
  setBlockchainData: (input: BlockChainData) => void;
  setLaunchStatus: (input: string) => void;
  setResetButtonText: (input: string) => void;
}

export const getBlockchainFns = ({
  state,
  setChainSettings,
  setBlockchainData,
  setLaunchStatus,
  setResetButtonText,
}: IGetBlockchainFns) => {
  let chainSettings = state.chainSettings;
  let blockchainData = state.blockchainData;
  const updateBlockchainData = (updatedObject: Partial<BlockChainData>) => {
    state.blockchainData = Object.assign({}, blockchainData, updatedObject);
    setBlockchainData(state.blockchainData);
    blockchainData = state.blockchainData;
  };

  const updatedChainSettings = (updatedObject: Partial<ChainSettings>) => {
    state.chainSettings = Object.assign({}, chainSettings, updatedObject);
    setChainSettings(state.chainSettings);
    chainSettings = state.chainSettings;
  };

  const loadContracts = async function () {
    console.log(`ethNode is ${chainSettings.ethNode}`);
    const provider: ethers.providers.JsonRpcProvider =
      new ethers.providers.JsonRpcProvider(chainSettings.ethNode);

    const registerMerkleRootContract: ethers.Contract = new ethers.Contract(
      chainSettings.registerAddress?.registerMerkleRoot,
      registerMerkleRootABI['abi'],
      provider,
    );
    const citizenERC20Contract: ethers.Contract = new ethers.Contract(
      chainSettings.registerAddress?.citizenERC20,
      citizenERC20ABI['abi'],
      provider,
    );
    const citizenERC721Contract: ethers.Contract = new ethers.Contract(
      chainSettings.registerAddress?.citizenERC721,
      citizenERC721ABI['abi'],
      provider,
    );
    const revealCitizenContract: ethers.Contract = new ethers.Contract(
      chainSettings.registerAddress?.revealCitizen,
      revealCitizenABI['abi'],
      provider,
    );

    updatedChainSettings({
      provider: provider,
      registerMerkleRootContract,
      citizenERC20Contract,
      citizenERC721Contract,
      revealCitizenContract,
    });
  };
  const getBridgeData = async (publicKey: string) => {
    const pub = {
      x: publicKey.slice(0, publicKey.length / 2),
      y: publicKey.slice(publicKey.length / 2),
    };

    // TODO: move to strings
    const response = await (
      await fetch(`${chainSettings.bridgeNode}/device?x=${pub.x}&y=${pub.y}`)
    ).text();

    const data = isJSONable(response) && JSON.parse(response);

    if (data) {
      updateBlockchainData({
        cid: data.cid,
        name: data.name,
        token: data.token,
        description: data.description,
        contractAddress: data.contractAddress,
        root: data.root,
        hardwareHash: data.hardwareHash,
        publicKeyHash: data.publicKeyHash,
      });
    }
  };

  const prefetchChainData = async (
    chainDataType: PrefetchChainDataType,
    chainDataVal: any = null,
  ) => {
    const {
      GET_DEVICE_ROOT_COUNT,
      GET_DEVICE_PROOFS,
      LATEST_BLOCK,
      VERIFY_DEVICE_PROOF,
      VERIFY_MINTER,
    } = PrefetchChainDataType;

    switch (chainDataType) {
      case GET_DEVICE_ROOT_COUNT:
        console.log('getDeviceRootCount called');

        let deviceRootCount = 0;

        try {
          const result =
            await chainSettings.registerMerkleRootContract?._deviceRootCount();

          deviceRootCount = parseInt(result);
        } catch (error) {
          console.log(`error from getDeviceRootCount: ${error}`);
        }

        return deviceRootCount;
      case GET_DEVICE_PROOFS:
        deviceRootCount = 0;

        try {
          const result =
            await chainSettings.registerMerkleRootContract?._deviceRootCount();

          deviceRootCount = parseInt(result);
          console.log('root count');
          console.log(deviceRootCount);

          MMKV.set(MMKVKeys.DEVICE_ROOT_COUNT, deviceRootCount);
        } catch (error) {
          console.log(`error from getDeviceProofs: ${error}`);
        }

        // We start at index 1 for device roots.
        for (let i = 1; i <= deviceRootCount; i++) {
          // Get merkle root details by index.
          const deviceRoot =
            await chainSettings.registerMerkleRootContract?.getRootByIndex(i);

          // Ignore non-existant roots.
          if (
            deviceRoot !=
            '0x0000000000000000000000000000000000000000000000000000000000000000'
          ) {
            const deviceRootDetails =
              await chainSettings.registerMerkleRootContract?.getRootDetails(
                deviceRoot,
              );
            console.log(deviceRootDetails[4]);

            MMKV.set(deviceRoot, JSON.stringify(deviceRootDetails));

            console.log(`${chainSettings.ipfsNode}/${deviceRootDetails[4]}`);

            // Get IPFS file with proofs.
            let response = await fetch(
              `${chainSettings.ipfsNode}/${deviceRootDetails[4]}`,
            );

            let json = await response.json();

            console.log(`json loaded for root`);
            for (let device in json['devices']) {
              let d = json['devices'][device];
              if (json['devices'][device]['primaryPublicKeyHash']) {
                let deviceDetails = {
                  root: deviceRoot,
                  kongAmount: parseInt(deviceRootDetails[0]),
                  contractAddress: d.contractAddress,
                  entropyAddress: json['tree']['entropyAddress'],
                  proof: d.proof,
                  secondaryPublicKeyHash: d.secondaryPublicKeyHash,
                  tertiaryPublicKeyHash: d.tertiaryPublicKeyHash,
                  hardwareManufacturer: d.hardwareManufacturer,
                  hardwareModel: d.hardwareModel,
                  hardwareConfig: d.hardwareConfig,
                };
                // Store device proofs.
                MMKV.set(d.primaryPublicKeyHash, JSON.stringify(deviceDetails));
              }
            }
          }

          // We set the deviceRootCount incrementally as we need to deal with flaky nodes that error out.
          MMKV.set(MMKVKeys.DEVICE_ROOT_COUNT, i);
          if (deviceRootCount === i) {
            setResetButtonText(`${strings.textSettingsReset}`);
          } else {
            setResetButtonText(
              `${strings.textSettingsResetProgress} ${i}/${deviceRootCount}...`,
            );
            setLaunchStatus(
              `${strings.textLaunchProgress} ${i}/${deviceRootCount}...`,
            );
          }

          console.log(`internal root count now: ${i}`);
        }

        break;
      case VERIFY_DEVICE_PROOF:
        console.log(
          `verifyDeviceProof called with ${chainDataVal['root']} and ${chainDataVal['hardwareHash']}`,
        );

        let contractERC20Address = '0x0000000000000000000000000000000000000000';
        let verifyDeviceProof = false;
        let deviceRootDetails = null;
        let isDeviceMintable = false;
        let contractAddress = '0x0000000000000000000000000000000000000000';
        const contractERC20AddressPromise: Promise<any> =
          chainSettings.registerMerkleRootContract
            ?._kongERC20Address()
            .then((result: any) => {
              contractERC20Address = result;
            })
            .catch((_: any) => {
              throw Error(`unable to verify ERC20 address`); //TODO: offline verify?
            });

        const deviceRootDetailsPromise: Promise<any> =
          chainSettings.registerMerkleRootContract
            ?.getRootDetails(chainDataVal['root'])
            .then((result: any) => {
              deviceRootDetails = result;
            })
            .catch((_: any) => {
              throw Error('unable to get root details');
            });

        const verifyDeviceProofPromise: Promise<any> =
          chainSettings.registerMerkleRootContract
            ?.verifyProof(
              chainDataVal['proof'],
              chainDataVal['root'],
              chainDataVal['hardwareHash'],
              chainDataVal['kongAmount'],
            )
            .then((_: any) => {
              verifyDeviceProof = true;
            })
            .catch((_: any) => {
              throw Error('unable to verifyProof'); //TODO: offline verify?
            });
        const isDeviceMintablePromise: Promise<any> =
          chainSettings.registerMerkleRootContract
            ?.isDeviceMintable(chainDataVal['hardwareHash'])
            .then((result: any) => {
              isDeviceMintable = result;
            })
            .catch((err: any) => {
              console.log(err);

              throw Error('unable to get device mintable details');
            });

        const contractAddressPromise = chainSettings.registerMerkleRootContract
          ?.getDeviceAddress(chainDataVal['hardwareHash'])
          .then((result: any) => {
            contractAddress = result;
          })
          .catch((_: any) => {
            throw Error('unable to get contract address');
          });

        try {
          await Promise.all([
            contractERC20AddressPromise,
            deviceRootDetailsPromise,
            verifyDeviceProofPromise,
            isDeviceMintablePromise,
            contractAddressPromise,
          ]);
        } catch (error) {
          console.log(error);
        }

        // Set up token.
        const tokenSymbol = knownTokens[contractERC20Address]
          ? knownTokens[contractERC20Address].symbol
          : '-';
        const tokenName = knownTokens[contractERC20Address]
          ? knownTokens[contractERC20Address].name
          : 'Unknown Token';

        // Set up ERC20 balance.
        let unscaledERC20Balance = 0;
        let contractReleaseTimestamp = 0;

        if (deviceRootDetails) {
          unscaledERC20Balance = parseInt(deviceRootDetails[0]);
          contractReleaseTimestamp = parseInt(deviceRootDetails[3]);
        }

        let decimals;
        if (knownTokens[contractERC20Address]) {
          decimals = knownTokens[contractERC20Address].decimals;
        }

        let scaledERC20Balance;
        if (decimals) {
          scaledERC20Balance = unscaledERC20Balance / 10 ** decimals;
        } else {
          scaledERC20Balance = unscaledERC20Balance;
        }

        // Get machine-readable version of hardware info.
        const hardwareManufacturer = knownHardwareManufacturers[
          chainDataVal.device.hardwareManufacturer
        ]
          ? knownHardwareManufacturers[chainDataVal.device.hardwareManufacturer]
          : 'Unknown hardware manufacturer.';
        const hardwareModel = knownHardwareModels[
          chainDataVal.device.hardwareModel
        ]
          ? knownHardwareModels[chainDataVal.device.hardwareModel]
          : 'Unknown hardware model.';

        console.log(`BLOCKCHAIN DATA AFTER VERIFY PROOF: ${Date.now()}`);
        updateBlockchainData({
          verifiedProof: verifyDeviceProof,
          contractAddress: contractAddress,
          contractERC20Address: contractERC20Address,
          tokenSymbol: tokenSymbol,
          tokenName: tokenName,
          hardwareManufacturer: hardwareManufacturer,
          hardwareModel: hardwareModel,
          hardwareSerial: chainDataVal.device.hardwareSerial,
          hardwareConfig: chainDataVal.device.hardwareConfig,
          unscaledERC20Balance: unscaledERC20Balance,
          scaledERC20Balance: scaledERC20Balance,
          registeredMintable: isDeviceMintable,
          contractReleaseTimestamp: contractReleaseTimestamp,
        });
        break;
      case VERIFY_MINTER:
        console.log(`verifyMinter called with ${chainDataVal}`);

        let entropyContractIsMinter = null;

        try {
          const result =
            await chainSettings.registerMerkleRootContract?._minters(
              chainDataVal,
            );
          entropyContractIsMinter = result;
        } catch (error) {
          console.log(`no entropyContract found.`);
        }

        const entropyContract = new ethers.Contract(
          chainDataVal,
          kongEntropyMerkle['abi'],
          chainSettings.provider,
        );
        let eccAddress = '0x0000000000000000000000000000000000000000';

        try {
          const result = await entropyContract._eccAddress();
          eccAddress = result;
        } catch (error) {
          console.log(`ecc address cannot be verified`);
        }
        // var entropyContractIsMinterBool = (entropyContractIsMinter === "true")

        console.log(`BLOCKCHAIN DATA AFTER VERIFY MINTER: ${Date.now()}`);
        updateBlockchainData({
          entropyContractIsMinter: entropyContractIsMinter,
          contractVerifierAddress: eccAddress,
          contractEntropyAddress: chainDataVal,
        });
        break;

      case LATEST_BLOCK:
        console.log(`latestBlock async called`);
        const latestBlock = await chainSettings.provider?.getBlockNumber();
        const blockDetails = await chainSettings.provider?.getBlock(
          latestBlock as any,
        );
        console.log(latestBlock);

        const blockHash = blockDetails?.hash.slice(2);
        const blockTime = blockDetails?.timestamp;

        console.log(`blockHash from lib ${blockHash}`);
        updateBlockchainData({
          blockNumber: latestBlock,
          blockHash: blockHash,
          blockTime: blockTime,
        });
        break;
      default:
        break;
    }
  };
  const fetchChainData = async (
    chainDataType: FetchChainDataType,
    chainDataVal: any = null,
  ) => {
    const {
      CONTRACT_REGISTRATION,
      ESCROW_CONTRACT_STATE,
      CONTRACT_CODE,
      ERC20_BALANCE,
      ERC20_INCOMING_TRANSFER,
      ERC20_OUTGOING_TRANSFER,
      LATEST_BLOCK,
      BLOCK_BY_HASH,
      GET_CITIZEN_TOKEN_ID,
    } = FetchChainDataType;
    let updatedBlockchainData;
    let response;
    let responseJson;
    let newData;
    let blockHash;
    switch (chainDataType) {
      case CONTRACT_REGISTRATION:
        try {
          response = await fetch(chainSettings.ethNode, {
            method: 'POST',
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'eth_call',
              params: [
                {
                  to: chainSettings.registerAddress?.oldRegistry, // TODO: replace this this a variable that gets returned
                  data:
                    hashedInterfaces.registerDevice.getRegistrationDetails +
                    (chainDataVal.length === 66
                      ? chainDataVal.slice(2)
                      : chainDataVal),
                },
                'latest',
              ],
              id: 1,
            }),
          });
          responseJson = await response.json();
          // Only parse non-zero results.
          if (
            responseJson.result === '0x' ||
            parseInt(responseJson.result, 16) === 0 ||
            responseJson.result === undefined
          ) {
            updatedBlockchainData = Object.assign({}, blockchainData, {
              contractRegistered: false,
            });
          } else {
            console.log(`responseJSON ${responseJson.result}`);

            // Parse keys.
            const contractSecondaryPublicKeyHash =
              '0x' + responseJson.result.slice(2, 66);
            //   const contractTertiaryPublicKeyHash =
            //     '0x' + responseJson.result.slice(66, 130);

            // Parse contract address
            const contractAddress = '0x' + responseJson.result.slice(154, 194); // Skipping the leading 0s.

            // Parse hardware info.
            let hardwareManufacturer =
              '0x' + responseJson.result.slice(194, 258);
            let hardwareModel = '0x' + responseJson.result.slice(258, 322);
            const hardwareSerial = '0x' + responseJson.result.slice(322, 386);
            const hardwareConfig = '0x' + responseJson.result.slice(386, 450);

            // Get machine-readable version of hardware info.
            hardwareManufacturer = knownHardwareManufacturers[
              hardwareManufacturer
            ]
              ? knownHardwareManufacturers[hardwareManufacturer]
              : 'Unknown hardware manufacturer.';
            hardwareModel = knownHardwareModels[hardwareModel]
              ? knownHardwareModels[hardwareModel]
              : 'Unknown hardware model.';

            // Parse token amount.
            const expectedUnscaledERC20Balance = parseInt(
              '0x' + responseJson.result.slice(450, 514),
            );
            const registeredMintable =
              '0x' + responseJson.result.slice(514, 578);

            // Update state.
            updatedBlockchainData = {
              contractSecondaryPublicKeyHash: contractSecondaryPublicKeyHash,
              contractAddress: contractAddress,
              hardwareManufacturer: hardwareManufacturer,
              hardwareModel: hardwareModel,
              hardwareSerial: hardwareSerial,
              hardwareConfig: hardwareConfig,
              contractRegistered: true,
              expectedUnscaledERC20Balance: expectedUnscaledERC20Balance,
              registeredMintable: registeredMintable,
            };
          }
          console.log(
            `BLOCKCHAIN DATA AFTER REGISTRATION CHECK: ${Date.now()}`,
          );

          updateBlockchainData(updatedBlockchainData);
        } catch (err) {
          console.log(`Failed at ${CONTRACT_REGISTRATION}`, err);
        }

        break;
      case ESCROW_CONTRACT_STATE:
        try {
          response = await fetch(chainSettings.ethNode, {
            method: 'POST',
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'eth_call',
              params: [
                {
                  to: blockchainData.contractAddress,
                  data: hashedInterfaces.getContractState,
                },
                'latest',
              ],
              id: 1,
            }),
          });
          responseJson = await response.json();
          // Get registered token address.
          const contractERC20Address =
            '0x' + responseJson.result.slice(282, 322);

          // Get token information.
          const tokenSymbol = knownTokens[contractERC20Address]
            ? knownTokens[contractERC20Address].symbol
            : '-';
          const tokenName = knownTokens[contractERC20Address]
            ? knownTokens[contractERC20Address].name
            : 'Unknown Token';

          // Adjust state.
          updatedBlockchainData = {
            contractPublicKeyX: responseJson.result.slice(0, 66),
            contractPublicKeyY: '0x' + responseJson.result.slice(66, 130),
            contractVerifierAddress: '0x' + responseJson.result.slice(154, 194),
            contractReleaseTimestamp: parseInt(
              responseJson.result.slice(194, 258),
              16,
            ),
            contractERC20Address: contractERC20Address,
            tokenSymbol: tokenSymbol,
            tokenName: tokenName,
            contractState: true,
          };

          updateBlockchainData(updatedBlockchainData);
          console.log('NEW BLOCKCHAIN DATA FROM STATE CHECK');
        } catch (err) {
          console.log(`Failed at ${ESCROW_CONTRACT_STATE}`, err);
        }

        break;
      case CONTRACT_CODE:
        response = await fetch(chainSettings.ethNode, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_getCode',
            params: [chainDataVal, 'latest'],
            id: 1,
          }),
        });
        responseJson = await response.json();
        // Get version info as hash of code.
        const contractVersion = utils.sha256(responseJson.result);
        console.log(`contractVersion: ${contractVersion}`);

        // Get version information.
        const contractType = knownContractVersions[contractVersion].type
          ? knownContractVersions[contractVersion].type
          : 'Unknown Contract Type';

        // Update state.
        newData = {
          contractCode: responseJson.result,
          contractVersion,
          contractType,
        };
        updateBlockchainData(newData);
        console.log('NEW BLOCKCHAIN DATA FROM CODE CHECK');
        break;
      case ERC20_BALANCE:
        response = await fetch(chainSettings.ethNode, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_call',
            params: [
              {
                to: blockchainData.contractERC20Address,
                data:
                  hashedInterfaces.balanceOf +
                  '0'.repeat(24) +
                  blockchainData.contractAddress.slice(2),
              },
              'latest',
            ],
            id: 1,
          }),
        });
        responseJson = await response.json();

        const unscaledERC20Balance = parseInt(responseJson.result, 16);
        const decimals: number =
          blockchainData.contractERC20Address &&
          knownTokens[blockchainData.contractERC20Address].decimals;
        let scaledERC20Balance;
        if (decimals) {
          scaledERC20Balance = unscaledERC20Balance / 10 ** decimals;
        } else {
          scaledERC20Balance = unscaledERC20Balance;
        }
        newData = {
          unscaledERC20Balance,
          scaledERC20Balance,
        };
        updateBlockchainData(newData);

        console.log('NEW DATA FROM BALANCE CHECK');
        break;
      case ERC20_INCOMING_TRANSFER:
        console.log('GETTING INCOMING TRANSFERS');

        response = await fetch(chainSettings.ethNode, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_getLogs',
            params: [
              {
                fromBlock: 'earliest',
                toBlock: 'latest',
                address: blockchainData.contractERC20Address,
                topics: [
                  hashedInterfaces.erc20Transfer,
                  null,
                  '0x' +
                    '0'.repeat(24) +
                    blockchainData.contractAddress.slice(2),
                ],
              },
            ],
            id: 1,
          }),
        });
        responseJson = await response.json();

        console.log('INCOMING TRANSFERS');
        console.log(responseJson);

        updateBlockchainData({
          ERC20IncomingTransfer: responseJson.result.length === 1,
        });
        break;
      case ERC20_OUTGOING_TRANSFER:
        console.log('GETTING OUTGOING TRANSFERS');

        response = await fetch(chainSettings.ethNode, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_getLogs',
            params: [
              {
                fromBlock: 'earliest',
                toBlock: 'latest',
                address: blockchainData.contractERC20Address,
                topics: [
                  hashedInterfaces.erc20Transfer,
                  '0x000000000000000000000000' +
                    blockchainData.contractAddress.slice(2),
                  null,
                ],
              },
            ],
            id: 1,
          }),
        });
        responseJson = await response.json();

        console.log('OUTGOING TRANSFERS');
        console.log(responseJson);

        updateBlockchainData({
          ERC20OutgoingTransfer: responseJson.result.length === 1,
        });
        break;
      case LATEST_BLOCK:
        console.log(`get latestBlock`);
        response = await fetch(chainSettings.ethNode, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_getBlockByNumber',
            params: ['latest', true],
            id: 1,
          }),
        });
        responseJson = await response.json();
        blockHash = responseJson.result.hash.slice(2);
        const blockTime = parseInt(responseJson.result.timestamp, 16);

        console.log(`blockHash ${blockHash}`);
        updateBlockchainData({
          blockNumber: responseJson.result.number,
          blockHash: blockHash,
          blockTime: blockTime,
        });
        break;
      case BLOCK_BY_HASH:
        blockHash = '0x' + chainDataVal;
        console.log(`blockByHash called`);
        response = await fetch(chainSettings.ethNode, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_getBlockByHash',
            params: [blockHash, true],
            id: 1,
          }),
        });
        responseJson = await response.json();

        console.log(`blockByHash response`);

        updateBlockchainData({
          signedBlockTime:
            responseJson.result === null
              ? null
              : parseInt(responseJson.result.timestamp, 16),
          signedBlockValid: responseJson.result != null,
        });
        break;
      case GET_CITIZEN_TOKEN_ID:
        const tokenId: any = parseInt(
          await asyncWrapper(
            await state.chainSettings.citizenERC721Contract?.tokenOfOwnerByIndex(
              chainDataVal,
              0,
            ),
            (e: any) =>
              navigate('Fail', {
                warning: strings.textFailDefaultWarning,
                description: `Error: Cannot find token id`,
              }),
          ),
        );
        updateBlockchainData({
          tokenId,
        });
        break;
      default:
        console.log(`default case.`);
        break;
    }
  };

  const writeChainData = async (
    chainMethod: ChainMethods,
    connector: WalletConnect,
    ...chainDataVal: any
  ) => {
    const {REVEAL_CTIZEN_REVEAL_ORACLE} = ChainMethods;
    switch (chainMethod) {
      case REVEAL_CTIZEN_REVEAL_ORACLE:
        const encodedDataABI = web3.eth.abi.encodeFunctionCall(
          {
            inputs: [
              {internalType: 'uint256', name: 'tokenId', type: 'uint256'},
              {internalType: 'uint256[2]', name: 'rs', type: 'uint256[2]'},
              {
                internalType: 'uint256',
                name: 'primaryPublicKeyX',
                type: 'uint256',
              },
              {
                internalType: 'uint256',
                name: 'primaryPublicKeyY',
                type: 'uint256',
              },
              {internalType: 'uint256', name: 'blockNumber', type: 'uint256'},
              {internalType: 'bytes32', name: 'merkleRoot', type: 'bytes32'},
              {internalType: 'bytes', name: 'oracleSignature', type: 'bytes'},
            ],
            name: 'revealOracle',
            outputs: [],
            stateMutability: 'nonpayable',
            type: 'function',
          },
          chainDataVal,
        );
        try {
          const tx = await connector.sendTransaction({
            from: connector.accounts[0],
            to: state.chainSettings.registerAddress?.revealCitizen,
            data: encodedDataABI,
          });
          return tx;
        } catch (e) {
          console.log(e);
          navigate('Fail', {
            warning: 'Tx Failure',
            description:
              'There was an error in sending transaction. Please try again.',
          });
        }
        break;
    }
  };

  return {
    loadContracts,
    getBridgeData,
    prefetchChainData,
    fetchChainData,
    writeChainData,
  };
};
