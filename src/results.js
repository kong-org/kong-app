// Load packages / modules.
import React from 'react';
import {
    Animated,
    Dimensions,
    FlatList,
    Image,
    ImageBackground,
    Linking,
    Platform,
    ScrollView,
    Share,
    Text,
    TouchableOpacity,
    TouchableHighlight,
    View
} from 'react-native';
import { Button } from 'react-native-elements';
import LinearGradient from 'react-native-linear-gradient';
import Jazzicon from 'react-native-jazzicon'

// Scaling.
const screenWidth = Dimensions.get('window').width;
const screenHeight = Dimensions.get('window').height;
function scale(size) { return Math.round(size * (screenHeight / 812) ** 0.5) }

// Load styles.
import textStyles from '../assets/styles/textStyles.js';
import viewStyles from '../assets/styles/viewStyles.js';
import buttonStyles from '../assets/styles/buttonStyles.js';
import imageStyles from '../assets/styles/imageStyles.js';

// Load version information and text.
import strings from '../assets/text/strings.js';
import defaultSettings from '../assets/data/defaultSettings.js';
import knownValues from '../assets/data/knownValues.js';
knownContractVersions = knownValues['knownContractVersions'];

const results = {

    _getVerificationInstructions: async function () {

        claimContractAddress = this.state.blockchainData.contractAddress

        if (this.state.blockchainData.verifiedProof) {
            claimContractAddress = this.state.blockchainData.contractEntropyAddress;
        }

        var instructions = strings.formatString(
            strings.textResultsVerificationInstructions,
            this.state.nfcData.nfcReadInfoPrimaryPublicKey,
            this.state.nfcData.nfcReadOutputExternalRandomNumber,
            this.state.nfcData.nfcReadOutputBlockhash,
            this.state.nfcData.nfcReadOutputCombinedHash,
            this.state.nfcData.nfcReadOutputExternalSignature,
            this.state.blockchainData.contractAddress,
            this.state.blockchainData.actualERC20Balance,
            this.state.blockchainData.tokenName,
            this.state.blockchainData.contractERC20Address
        );

        console.warn(instructions);

        try {

            const result = await Share.share({
                message: `${instructions}`,
            })

            if (result.action === Share.sharedAction) {
                if (result.activityType) {
                    // shared with activity type of result.activityType
                } else {
                    // shared
                }
            } else if (result.action === Share.dismissedAction) {
                // dismissed
            }
        } catch (error) {
            alert(error.message);
        }

    },
    _renderResults: function() {
        console.log(`_renderResults: ${this.state.blockchainData.verifiedProof}`)
        if (this.state.blockchainData.contractRegistered == true || this.state.blockchainData.verifiedProof == true) {

            console.log(`contractRegistered or verifiedProof is true`)
            if (this.state.verificationData.verificationResult == 'pass') {

                var verificationResult = 'VERIFICATION\nSUCCESSFUL';
                var verificationColor = '#BDFF00';
                var verificationSymbol = 'happy';

            } else if (this.state.verificationData.verificationResult == 'fail') {

                var verificationResult = 'VERIFICATION\nFAILURE';
                var verificationColor = '#FF5333';
                var verificationSymbol = 'sad';

            };

            if (this.state.blockchainData.scaledERC20Balance > 0) {
                var descriptionFaceValue = `${this.state.blockchainData.scaledERC20Balance} ${this.state.blockchainData.tokenName}`
            } else {
                var descriptionFaceValue = `${this.state.blockchainData.contractAddress}`
            }
            

        } else {

            var verificationResult = 'UNKNOWN\nDEVICE';
            var verificationColor = '#FFFFFF';
            var verificationSymbol = 'confused';

        }

        // Conditions we need to handle:
        //
        // 1. KONG note with value, registered.
        // 2. ARX tag without information, registered.
        // 3. ARX tag with information, registered.
        // 4. Validated unknown device, unregistered.

        function getDeviceImage(unscaledERC20Balance, cid, publicKeyHash) {
            if (cid) {
                return <TouchableHighlight onPress={() => Linking.openURL(defaultSettings.ipfsNode + "/" + cid)}>
                            <Image source={{ uri: defaultSettings.ipfsNode + "/" + cid }} style={imageStyles.imageScan}/>
                       </TouchableHighlight>
            } else if (unscaledERC20Balance > 0) {
                return <Text style={textStyles.textResultsFaceValue}>{`${descriptionFaceValue}`}</Text>
            } else {
                return <Jazzicon size={80} address={`${'0x' + publicKeyHash}`} />
            }
        }

        return(

            <ImageBackground source={require('../assets/img/background.png')} style={{height: screenHeight}}>

                <React.Fragment>

                    <View style={viewStyles.viewResultsTop}>

                        <TouchableOpacity onPress={this._resetState}>

                            <View style={viewStyles.viewResultsTopBackLinks}>

                                <Image source={require('../assets/img/x.png')} style={{marginBottom: screenHeight > 800 ? 4 : 3}}/>
                                <Text style={textStyles.textResultsBackLink}>BACK</Text>

                            </View>

                        </TouchableOpacity>

                    </View>

                    {/**********************************************/}
                    <View style={viewStyles.viewResultsTopSeparator}/>
                    {/**********************************************/}

                    <ScrollView
                        bounces={false}
                        onScroll={this._onScroll}
                        scrollEventThrottle={10}
                        ref={(position) => this.scroll = position}
                    >

                        <React.Fragment>

                            <View style={viewStyles.viewResultsScrollViewTop}>

                                <Animated.View
                                    style={{
                                        opacity: this.state.scrollOffset.interpolate({
                                            inputRange: [0, 50],
                                            outputRange: [1, 0],
                                            extrapolate: 'clamp',
                                        }),
                                        alignItems: 'flex-start',
                                        marginLeft: 34
                                    }}
                                    useNativeDriver={true}
                                >                              

                                    { (this.state.blockchainData.contractRegistered == true || this.state.blockchainData.verifiedProof == true && this.state.blockchainData.unscaledERC20Balance > 0) &&

                                        <React.Fragment>

                                            {getDeviceImage(this.state.blockchainData.unscaledERC20Balance, 
                                                            this.state.blockchainData.cid, 
                                                            this.state.nfcData.nfcReadInfoPrimaryPublicKeyHash)}

                                            <Text style={[textStyles.textVerificationResult, {color: verificationColor}]}>
                                                {`${verificationResult}`}
                                            </Text>

                                            <Image source={
                                                this.state.verificationData.verificationResult == 'pass' ?
                                                require('../assets/img/happy.png'): require('../assets/img/sad.png')
                                            }/>

                                        </React.Fragment>

                                    }


                                    { (this.state.blockchainData.verifiedProof == true && this.state.blockchainData.unscaledERC20Balance <= 0) &&

                                        <React.Fragment>

                                            {getDeviceImage(this.state.blockchainData.unscaledERC20Balance, 
                                                            this.state.blockchainData.cid, 
                                                            this.state.nfcData.nfcReadInfoPrimaryPublicKeyHash)}

                                            <Text style={[textStyles.textVerificationResult, {color: verificationColor}]}>
                                                {`${verificationResult}`}
                                            </Text>

                                            <Image source={
                                                this.state.verificationData.verificationResult == 'pass' ?
                                                require('../assets/img/happy.png'): require('../assets/img/sad.png')
                                            }/>

                                        </React.Fragment>

                                    }


                                    { (this.state.blockchainData.contractRegistered == false || this.state.blockchainData.verifiedProof == false) &&

                                        <React.Fragment>

                                            {getDeviceImage(this.state.blockchainData.unscaledERC20Balance, 
                                                            this.state.blockchainData.cid, 
                                                            this.state.nfcData.nfcReadInfoPrimaryPublicKeyHash)}

                                            <Text style={[textStyles.textVerificationResult, {color: verificationColor}]}>
                                                {`${verificationResult}`}
                                            </Text>

                                        </React.Fragment>

                                    }

                                </Animated.View>

                            </View>

                            <View style={viewStyles.viewResultsScrollViewBottom}>

                                {
                                    this.state.blockchainData.contractRegistered || this.state.blockchainData.verifiedProof == true ?
                                    this._renderResultsBodyRegistered():
                                    this._renderResultsBodyUnregistered()
                                }

                            </View>

                        </React.Fragment>

                    </ScrollView>

                </React.Fragment>

            </ImageBackground>

        )

    },
    _renderResultsBodyRegistered: function() {

        function getStateImage(stateName) {

            var prefix = Platform.OS === 'ios' ? 'ios' : 'md';

            if (stateName == 'pass') {
                return <Image source={require('../assets/img/success.png')}/>
            } else if (stateName == 'warning') {
                return <Image source={require('../assets/img/impossible.png')}/>
            } else if (stateName == 'fail') {
                return <Image source={require('../assets/img/fail.png')}/>
            } else if (stateName == 'impossible') {
                return <Image source={require('../assets/img/impossible.png')}/>
            }
        }

        // Version information.
        var versionInfo = knownContractVersions[this.state.blockchainData.contractVersion];
        var hardwareManufacturer = this.state.blockchainData.hardwareManufacturer;
        var hardwareModel = this.state.blockchainData.hardwareModel;
        var hardwareSerial = this.state.nfcData.nfcReadInfoHardwareSerial;

        // Format release timestamp.
        var releaseTimeStamp = this.state.blockchainData.contractReleaseTimestamp == 0 ? 'Anytime' : new Date(this.state.blockchainData.contractReleaseTimestamp * 1000);
        var releaseTimeStampFormatted = this.state.blockchainData.contractReleaseTimestamp == 0 ? 'Anytime' : (releaseTimeStamp.getMonth() + 1) + '/' + releaseTimeStamp.getDate() + '/' + releaseTimeStamp.getFullYear();

        // Set text values for verification status.
        var valueVerified = this.state.verificationData.verificationResultValue == 'pass' ? 'Verified.' : 'Failed.';
        var contractsVerified = this.state.verificationData.verificationResultContracts == 'pass' ? 'Verified.' : 'Failed.';

        // TODO: if non-kong, pull metadata
        if (this.state.blockchainData.name) {
            var descriptionFaceValueVerified = `${this.state.blockchainData.name}\n${this.state.blockchainData.description}`
        } else if (this.state.blockchainData.unscaledERC20Balance > 0) {
            var descriptionFaceValueVerified = `${this.state.blockchainData.scaledERC20Balance} ${this.state.blockchainData.tokenName}, ${valueVerified}`
        } else {
            var descriptionFaceValueVerified = `${valueVerified}`
        }

        if (this.state.fullVerification) {
            var hardwareVerified = this.state.verificationData.verificationResultHardware == 'pass' ? 'Verified.' : 'Failed.';
        } else {
            var hardwareVerified = this.state.verificationData.verificationResultHardware == 'impossible' ? 'Passive Verification.' : 'Failed.';           
        };

        // Render.
        return (

            <React.Fragment>

                <View style={viewStyles.viewResultsSummary}>

                    <View style={viewStyles.viewResultsListDoubleRow}>

                        <View style={{width: (screenWidth - 68) * 0.9}}>
                            <Text style={textStyles.textResultsHeading}>{`ASSET`}</Text>
                            <Text style={textStyles.textResultsChecksWithoutBottomMargin}>{`${descriptionFaceValueVerified}`}</Text>
                        </View>


                        <View>
                            {getStateImage(`${this.state.verificationData.verificationResultValue}`)}
                        </View>

                    </View>

                    {/*****************************************/}
                    <View style={viewStyles.viewResultsBorder}/>
                    {/*****************************************/}

                    <View style={viewStyles.viewResultsListDoubleRow}>

                        <View style={{width: (screenWidth - 68) * 0.9}}>
                            <Text style={textStyles.textResultsHeading}>{`SMART CONTRACTS`}</Text>
                            <Text style={textStyles.textResultsChecksWithoutBottomMargin}>{`${contractsVerified}`}</Text>
                        </View>

                        <View>
                            {getStateImage(`${this.state.verificationData.verificationResultContracts}`)}
                        </View>

                    </View>

                    {/*****************************************/}
                    <View style={viewStyles.viewResultsBorder}/>
                    {/*****************************************/}

                    <View style={viewStyles.viewResultsListDoubleRow}>

                        <View style={{width: (screenWidth - 68) * 0.9}}>
                            <Text style={textStyles.textResultsHeading}>{`HARDWARE`}</Text>
                            <Text style={textStyles.textResultsChecksWithoutBottomMargin}>{`${hardwareVerified}`}</Text>
                        </View>

                        <View>
                            {getStateImage(`${this.state.verificationData.verificationResultHardware}`)}
                        </View>

                    </View>

                    {/*****************************************/}
                    <View style={viewStyles.viewResultsBorder}/>
                    {/*****************************************/}

                    <View style={viewStyles.viewResultsListLastRow}>

                        <View style={{width: (screenWidth - 68) * 0.9}}>
                            <TouchableOpacity onPress={() => { this.scroll.scrollTo({ y: screenHeight - (Platform.OS == 'ios' && (screenHeight == 812 || screenHeight == 896) ? 88 : 64) - 26}) }}>
                                <Text style={textStyles.textResultsHeading}>{`MORE DETAILS`}</Text>
                            </TouchableOpacity>
                        </View>

                        <View>
                            <TouchableOpacity onPress={() => { this.scroll.scrollTo({ y: screenHeight - (Platform.OS == 'ios' && (screenHeight == 812 || screenHeight == 896) ? 88 : 64) - 26}) }}>
                                <Image style={{marginTop: 7}} source={require('../assets/img/chevron-down.png')}/>
                            </TouchableOpacity>
                        </View>

                    </View>


                </View>

                {/* Bottom part begins here. */}

                <View style={viewStyles.viewResultsLongList}>

                    <React.Fragment>

                        <View>

                            <Text style={textStyles.textResultsHeading}>{`HARDWARE MANUFACTURER`}</Text>
                            <Text style={textStyles.textResultsChecksWithLargeBottomMargin}>{`${hardwareManufacturer}`}</Text>

                            <Text style={textStyles.textResultsHeading}>{`HARDWARE MODEL`}</Text>
                            <Text style={textStyles.textResultsChecksWithLargeBottomMargin}>{`${hardwareModel}`}</Text>

                            <Text style={textStyles.textResultsHeading}>{`HARDWARE SERIAL`}</Text>
                            <Text style={textStyles.textResultsChecksWithLargeBottomMargin}>{`${hardwareSerial}`}</Text>

                            <Text style={textStyles.textResultsHeading}>{`VERSION / CURVE`}</Text>
                            <Text style={textStyles.textResultsChecksWithLargeBottomMargin}>{`${versionInfo.type + ' / ' + versionInfo.curve}`}</Text>

                            <Text style={textStyles.textResultsHeading}>{`CLAIMABLE`}</Text>
                            <Text style={textStyles.textResultsChecksWithLargeBottomMargin}>{`${'FROM ' + releaseTimeStampFormatted}`}</Text>

                            <Text style={textStyles.textResultsHeading}>{`LAST DEBUG CODE`}</Text>
                            <Text style={textStyles.textResultsChecksWithoutBottomMargin}>{`${this.state.nfcData.debugCode}`}</Text>


                            {/*****************************************/}
                            <View style={viewStyles.viewResultsBorder}/>
                            {/*****************************************/}

                            <Text style={textStyles.textResultsHeading}>{`DETAILED CHECKS`}</Text>

                            <View style={{marginBottom: -10}}>
                                <FlatList
                                    data={this.state.verificationData.verificationResultsValue.concat(this.state.verificationData.verificationResultsContracts).concat(this.state.verificationData.verificationResultsHardware)}
                                    showsVerticalScrollIndicator={false}
                                    renderItem={({item}) =>

                                        <View style={viewStyles.viewResultsListDoubleRow}>

                                            <View style={{width: (screenWidth - 68) * 0.9}}>
                                                <Text style={textStyles.textResultsChecksWithBottomMargin}>{`${item.descriptionShort}`}</Text>
                                            </View>

                                            <View style={viewStyles.viewResultsListImage}>
                                                {getStateImage(`${item.status}`)}
                                            </View>

                                        </View>
                                    }
                                    keyExtractor={item => item.key}
                                />
                            </View>

                            {/*****************************************/}
                            <View style={viewStyles.viewResultsBorder}/>
                            {/*****************************************/}

                            <Text style={textStyles.textResultsHeading}>{`PUBLIC KEY HASH`}</Text>
                            <Text selectable={true} style={textStyles.textResultsChecksWithBottomMargin}>0x{`${this.state.nfcData.nfcReadInfoPrimaryPublicKeyHash}`}</Text>
                            
                            <Text style={textStyles.textResultsHeading}>{`HARDWARE HASH`}</Text>
                            <Text selectable={true} style={textStyles.textResultsChecksWithBottomMargin}>0x{`${this.state.nfcData.hardwareHash}`}</Text>


                        </View>

                        {/*****************************************/}
                        <View style={viewStyles.viewResultsBorder}/>
                        {/*****************************************/}

                        <View>

                            <Text style={textStyles.textResultsBlockchainNode}>
                                {strings.textResultsBlockchainNodeDescription}
                            </Text>

                            <Text style={textStyles.textResultsNodeIpValue}>
                                {this.state.chainSettings.ethNode}
                            </Text>

                            {/*****************************************/}
                            <View style={viewStyles.viewResultsBorder}/>
                            {/*****************************************/}

                        </View>

                        <View>

                            <Text style={textStyles.textResultsKongVerificationInstruction}>
                                {strings.textResultsKongVerificationDescription}
                            </Text>

                        </View>

                        <View style={{marginTop: 20, marginBottom: 60, marginRight: 34, alignItems: 'flex-start'}}>

                            <Button
                                title={strings.textButtonDetails}
                                titleStyle={textStyles.textButtonDetails}
                                buttonStyle={{
                                    backgroundColor: 'black',
                                    width: screenWidth / 2
                                }}
                                onPress={() => this._getVerificationInstructions()}
                            />

                        </View>

                    </React.Fragment>

                </View>

            </React.Fragment>

        )

    },
    _renderResultsBodyUnregistered: function() {

        function getStateImage(stateName) {

            var prefix = Platform.OS === 'ios' ? 'ios' : 'md';

            if (stateName == 'pass') {
                return <Image source={require('../assets/img/success.png')}/>
            } else if (stateName == 'warning') {
                return <Image source={require('../assets/img/fail.png')}/>
            } else if (stateName == 'fail') {
                return <Image source={require('../assets/img/fail.png')}/>
            } else if (stateName == 'impossible') {
                return <Image source={require('../assets/img/impossible.png')}/>
            }
        }

        if (this.state.fullVerification) {
            var hardwareVerified = this.state.verificationData.verificationResultHardware == 'pass' ? 'Verified.' : 'Failed.';
        } else {
            var hardwareVerified = this.state.verificationData.verificationResultHardware == 'impossible' ? 'Passive Verification.' : 'Failed.';           
        };

        // Render.
        return (

            <React.Fragment>

                <View style={viewStyles.viewResultsSummary}>

                    <View>
                        <Text style={textStyles.textResultsChecksWithBottomMargin}>{`${strings.textResultsUnknownDevice}`}</Text>
                    </View>

                    {/*****************************************/}
                    <View style={viewStyles.viewResultsBorder}/>
                    {/*****************************************/}

                    <View style={viewStyles.viewResultsListLastRow}>

                        <View style={{width: (screenWidth - 68) * 0.9}}>
                            <TouchableOpacity onPress={() => { this.scroll.scrollTo({ y: screenHeight - (Platform.OS == 'ios' && (screenHeight == 812 || screenHeight == 896) ? 88 : 64) - 26}) }}>
                                <Text style={textStyles.textResultsHeading}>{`SHOW DETAILS`}</Text>
                            </TouchableOpacity>
                        </View>

                        <View>
                            <TouchableOpacity onPress={() => { this.scroll.scrollTo({ y: screenHeight - (Platform.OS == 'ios' && (screenHeight == 812 || screenHeight == 896) ? 88 : 64) - 26}) }}>
                                <Image style={{marginTop: 7}} source={require('../assets/img/chevron-down.png')}/>
                            </TouchableOpacity>
                        </View>

                    </View>


                </View>

                {/* Bottom part begins here. */}
                <View style={viewStyles.viewResultsLongListUnregistered}>

                    <React.Fragment>

                        <Text style={textStyles.textResultsHeading}>{`RESULTS`}</Text>
                        <FlatList
                            data={this.state.verificationData.verificationResultsHardware}
                            showsVerticalScrollIndicator={false}
                            renderItem={({item}) =>

                                <View style={viewStyles.viewResultsListDoubleRow}>

                                    <View style={{width: (screenWidth - 68) * 0.9}}>
                                        <Text style={textStyles.textResultsChecksWithBottomMargin}>{`${item.descriptionShort}`}</Text>
                                    </View>

                                    <View style={viewStyles.viewResultsListImage}>
                                        {getStateImage(`${item.status}`)}
                                    </View>

                                </View>
                            }
                            keyExtractor={item => item.key}
                        />

                        <Text style={textStyles.textResultsHeading}>{`DATA`}</Text>

                        <Text selectable={true} style={textStyles.textResultsChecksWithBottomMargin}>{`PRIMARY PUBLIC KEY HASH: ${this.state.nfcData.nfcReadInfoPrimaryPublicKeyHash}`}</Text>
                        <Text style={textStyles.textResultsChecksWithBottomMargin}>{`PRIMARY PUBLIC KEY: ${this.state.nfcData.nfcReadInfoPrimaryPublicKey}`}</Text>
                        <Text style={textStyles.textResultsChecksWithBottomMargin}>{`SECONDARY PUBLIC KEY: ${this.state.nfcData.nfcReadInfoSecondaryPublicKey}`}</Text>
                        <Text style={textStyles.textResultsChecksWithBottomMargin}>{`LAST DEBUG CODE: ${this.state.nfcData.debugCode}`}</Text>
                        <Text style={textStyles.textResultsChecksWithBottomMargin}>{`nfcReadOutputExternalRandomNumber: ${this.state.nfcData.nfcReadOutputExternalRandomNumber}`}</Text>
                        <Text style={textStyles.textResultsChecksWithBottomMargin}>{`nfcReadOutputBlockhash: ${this.state.nfcData.nfcReadOutputBlockhash}`}</Text>
                        <Text style={textStyles.textResultsChecksWithBottomMargin}>{`nfcReadOutputCombinedHash: ${this.state.nfcData.nfcReadOutputCombinedHash}`}</Text>
                        <Text style={textStyles.textResultsChecksWithBottomMargin}>{`nfcReadOutputInternalRandomNumber: ${this.state.nfcData.nfcReadOutputInternalRandomNumber}`}</Text>
                        <Text style={textStyles.textResultsChecksWithBottomMargin}>{`nfcReadOutputExternalSignature: ${this.state.nfcData.nfcReadOutputExternalSignature}`}</Text>
                        <Text style={textStyles.textResultsChecksWithBottomMargin}>{`nfcReadOutputInternalSignature: ${this.state.nfcData.nfcReadOutputInternalSignature}`}</Text>

                    </React.Fragment>

                </View>

            </React.Fragment>

        )

    }
}

export default results;
