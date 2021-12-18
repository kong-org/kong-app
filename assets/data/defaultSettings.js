
const defaultSettings = {
    ethNode: 'https://eth.cryptocash.pub',
    ipfsNode: 'https://ipfs.io/ipfs',
    bridgeNode: 'https://bridge-ropsten-t5n3k.ondigitalocean.app',
    // bridgeNode: 'https://bridge.cryptocash.dev',
    registerAddress: {
        registerMerkleRoot: '0x388b9a490f08310285f965addcfb08d693972533',
        oldRegistry: '0x41a81c92F019EbB05D3365A0E7b56D868eD2318e',
        citizenERC20: '0x4e4C7051EcCe3985403BE5C551C55b716DdbF2aB',// TODO: replace with real contract
        citizenERC721: '0xc8b3EAD0d32E793D6549E6898b1F9e5078D9bAc2',
        revealCitizen: '0x4100c66D2033338597FCB622D1cAb1EFD871F3Ac'
    }
};

export default defaultSettings;
