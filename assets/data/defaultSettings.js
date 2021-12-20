
const defaultSettings = {
    ethNode: 'https://ropsten.infura.io/v3/b963b7d609144f3cbf18d7077ce762bd',
    // ethNode: 'https://eth.cryptocash.pub',
    ipfsNode: 'https://ipfs.io/ipfs',
    bridgeNode: 'https://bridge-ropsten-t5n3k.ondigitalocean.app',
    // bridgeNode: 'https://bridge.cryptocash.dev',
    registerAddress: {
        registerMerkleRoot: '0x2ca8a7ecc577b3abec55ac4e74a5d3135874a5f4',
        oldRegistry: '0x41a81c92F019EbB05D3365A0E7b56D868eD2318e',
        citizenERC20: '0x4e4C7051EcCe3985403BE5C551C55b716DdbF2aB',// TODO: replace with real contract
        citizenERC721: '0xc8b3EAD0d32E793D6549E6898b1F9e5078D9bAc2',
        revealCitizen: '0x535250a854bc2999a2798709a8c3016e60fe0600'
    }
};

export default defaultSettings;
