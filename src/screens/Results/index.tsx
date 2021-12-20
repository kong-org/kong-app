import {NativeStackNavigationProp} from '@react-navigation/native-stack/lib/typescript/src/types';
import React, {FC, useRef, useState} from 'react';
import {
  Dimensions,
  Image,
  LayoutRectangle,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {RootStackParamList} from '../Routes/RootStackParamList';
import buttonStyles from '../../../assets/styles/buttonStyles';
import {Button} from 'react-native-elements';
import {useGetResultDetails} from './useGetResultDetails';
import strings from '../../../assets/text/strings';
import {scale, truncateDescription} from '../../common/utils';
const {height, width} = Dimensions.get('window');
interface IHome {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Results'>;
}

const ASSETS = '../../../assets';

export const Results: FC<IHome> = ({navigation}) => {
  // handling scroll
  let originRef = useRef<View>(null);
  let scrollViewRef = useRef<ScrollView>(null);
  let moreDetailsView = useRef<View>(null);
  const moveToMoreDetailsHandler = () => {
    moreDetailsView.current?.measureLayout(
      originRef.current as any,
      (_x, y) => {
        scrollViewRef.current?.scrollTo({
          y,
          animated: true,
        });
      },
      () => console.error('UNABLE TO SCROLL'),
    );
  };

  const {
    checks,
    color,
    data,
    details,
    pillInfo,
    hardwareHash,
    image,
    moreDetails,
    name,
    publicKeyHash,
    ethNode,
  } = useGetResultDetails();

  const ResultsStyles = ResultsStylesFn(color);

  return (
    <View ref={originRef} style={ResultsStyles.viewResults}>
      <View style={ResultsStyles.viewResultsContainer} />
      <StatusBar barStyle="light-content" />
      <ScrollView ref={scrollViewRef}>
        <View style={ResultsStyles.viewResultsTop}>
          <View style={ResultsStyles.viewResultsImageStyle}>{image}</View>
          <Text style={ResultsStyles.textResultsHeading}>{name}</Text>
          <View style={ResultsStyles.viewResultsPillTag}>
            {pillInfo.emoji}
            <Text
              style={{
                color,
                marginLeft: 5,
              }}>
              {pillInfo.text}
            </Text>
          </View>
        </View>
        <View style={ResultsStyles.viewResultsDetailContainer}>
          {details.map((item, idx) => {
            const [description, setDescription] = useState(
              truncateDescription(item.description!),
            );
            const [isExpanded, setIsExpanded] = useState(false);
            const touchExpandHandler = () => {
              if (isExpanded) {
                setDescription(truncateDescription(item.description!));
                setIsExpanded(false);
              } else {
                setDescription(item.description!);
                setIsExpanded(true);
              }
            };
            return (
              <View key={idx} style={{marginBottom: 20}}>
                <Text style={ResultsStyles.textResultsValueHeader}>
                  {item.key.toUpperCase()}
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                  }}>
                  <Text
                    onPress={touchExpandHandler}
                    style={ResultsStyles.textResultsValueSubheader}>
                    {description}
                  </Text>
                  {item.image}
                </View>
              </View>
            );
          })}
          {data.length > 0 && (
            <Text
              style={{
                ...ResultsStyles.textResultsValueSubheader,
                marginBottom: 35,
                lineHeight: scale(22),
              }}>
              {strings.textResultsUnknownDevice}
            </Text>
          )}
          <View>
            <View
              ref={moreDetailsView}
              style={ResultsStyles.viewResultsMoreDetails}>
              <Text style={ResultsStyles.textResultsValueHeader}>
                MORE DETAILS
              </Text>
              <TouchableOpacity
                activeOpacity={0.5}
                onPress={moveToMoreDetailsHandler}>
                <Image source={require(ASSETS + '/img/down-white.png')} />
              </TouchableOpacity>
            </View>
            {moreDetails.map((item, idx) => {
              return (
                <View key={idx} style={{marginBottom: 20}}>
                  <Text style={ResultsStyles.textResultsValueHeader}>
                    {item.key.toUpperCase()}
                  </Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                    }}>
                    <Text style={ResultsStyles.textResultsValueSubheader}>
                      {item.value?.toUpperCase()}
                    </Text>
                  </View>
                </View>
              );
            })}
            {data.map((item, idx) => {
              return (
                <View key={idx} style={{marginBottom: 20}}>
                  <Text style={ResultsStyles.textResultsValueHeader}>
                    {item.key.toUpperCase()}
                  </Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                    }}>
                    <Text
                      selectable
                      style={ResultsStyles.textResultsValueSubheader}>
                      {item.value}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
          <View>
            <View style={ResultsStyles.viewResultsDetailedChecks}>
              <Text style={ResultsStyles.textResultsValueHeader}>
                DETAILED CHECKS
              </Text>
            </View>
            {checks.map((item, idx) => {
              return (
                <View key={idx} style={{marginBottom: 20}}>
                  <View
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                    }}>
                    <Text
                      style={{
                        ...ResultsStyles.textResultsValueSubheader,
                        maxWidth: 250,
                      }}>
                      {item.key}
                    </Text>
                    {item.image}
                  </View>
                </View>
              );
            })}
          </View>
          {data.length === 0 && (
            <View>
              <View style={ResultsStyles.viewResultsDetailedChecks}>
                {publicKeyHash && (
                  <View style={{marginBottom: 20}}>
                    <Text style={ResultsStyles.textResultsValueHeader}>
                      PUBLIC KEY HASH
                    </Text>
                    <Text
                      selectable
                      style={ResultsStyles.textResultsValueSubheader}>
                      0x{publicKeyHash}
                    </Text>
                  </View>
                )}
              </View>
              {hardwareHash && (
                <View style={{marginBottom: 20}}>
                  <Text style={ResultsStyles.textResultsValueHeader}>
                    HARDWARE HASH
                  </Text>
                  <Text
                    selectable
                    style={ResultsStyles.textResultsValueSubheader}>
                    0x{hardwareHash}
                  </Text>
                </View>
              )}
            </View>
          )}

          <View style={ResultsStyles.viewResultsNode}>
            <View style={{marginBottom: 20}}>
              <Text style={ResultsStyles.textResultsValueSubheader}>
                Blockchain checks based on data from node at
              </Text>
              <Text style={ResultsStyles.textResultsNode}>{ethNode}</Text>
            </View>
          </View>
          {/* <View style={ResultsStyles.viewResultsGetInstructions}>
            <View style={{marginBottom: 20}}>
              <Text style={ResultsStyles.textResultsInstructions}>
                You can use the results of this scan to manually verify the
                authenticity of your Kong object. Tap below to get instructions:
              </Text>
              <Button
                type="outline"
                title={'GET INSTRUCTIONS'}
                titleStyle={ResultsStyles.textResultsGetInstructions}
                buttonStyle={{...buttonStyles.buttonSecondary}}
                onPress={() => {}}
              />
            </View>
          </View> */}
        </View>
      </ScrollView>
    </View>
  );
};

//Styles

const ResultsStylesFn = (color: string) =>
  StyleSheet.create({
    viewResults: {
      color: '#FFFFFF',
      height: height,
      width: width,
      alignItems: 'center',
      flex: 1,
      backgroundColor: '#000003',
    },
    viewResultsContainer: {
      alignSelf: 'flex-end',
      position: 'absolute',
      backgroundColor: color,
      width: width,
      height: height * 0.7,
    },
    viewResultsTop: {
      minHeight: height * 0.3,
      width,
      paddingLeft: scale(25),
      paddingBottom: scale(25),
      paddingTop: scale(20),
    },
    viewResultsImageStyle: {
      shadowColor: '#000000',
      shadowOffset: {width: 0, height: 1},
      shadowOpacity: 0.3,
      shadowRadius: scale(9),
      borderRadius: scale(30),
    },
    viewResultsPillTag: {
      backgroundColor: '#000003',
      alignSelf: 'flex-start',
      display: 'flex',
      flexDirection: 'row',
      marginTop: scale(10),
      paddingTop: scale(10),
      paddingBottom: scale(10),
      paddingLeft: scale(15),
      paddingRight: scale(15),
      borderRadius: scale(50),
    },
    viewResultsDetailContainer: {
      backgroundColor: '#000000',
      paddingLeft: scale(25),
      paddingRight: scale(25),
      paddingBottom: scale(5),
      paddingTop: scale(35),
    },
    viewResultsMoreDetails: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingTop: scale(25),
      paddingBottom: scale(25),
      borderTopWidth: scale(1),
      borderTopColor: '#626270',
    },
    viewResultsDetailedChecks: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingTop: scale(25),
      paddingBottom: scale(25),
      borderTopWidth: scale(1),
      borderTopColor: '#626270',
    },
    viewResultsSeletableArea: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingTop: scale(25),
      paddingBottom: scale(25),
      borderTopWidth: scale(1),
      borderTopColor: '#626270',
    },
    viewResultsNode: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingTop: scale(25),
      paddingBottom: scale(25),
      borderTopWidth: scale(1),
      borderTopColor: '#626270',
    },
    viewResultsGetInstructions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingTop: scale(25),
      paddingBottom: scale(25),
      borderTopWidth: scale(1),
      borderTopColor: '#626270',
    },
    textResultsHeading: {
      color: '#000003',
      fontFamily: 'EduFavoritExpanded-Bold',
      fontSize: scale(25),
      lineHeight: scale(35),
      marginTop: scale(25),
      maxWidth: scale(300),
    },
    textResultsValueHeader: {
      color: '#EDEDFD',
      fontSize: scale(15),
      marginBottom: 5,
      fontFamily: 'EduFavoritExpanded-Regular',
    },
    textResultsValueSubheader: {
      color: '#9C9CB0',
      fontSize: scale(15),
      fontFamily: 'RobotoMono-Regular',
      maxWidth: width * 0.82,
    },
    textResultsNode: {
      color: '#9C9CB0',
      fontSize: scale(15),
      fontFamily: 'RobotoMono-Regular',
      textDecorationLine: 'underline',
      textDecorationStyle: 'dotted',
      textDecorationColor: '#979797',
    },
    textResultsInstructions: {
      color: '#9C9CB0',
      fontSize: scale(12),
      fontFamily: 'RobotoMono-Regular',
      marginBottom: 20,
    },
    textResultsGetInstructions: {
      color: '#2BFF88',
      fontFamily: 'EduFavoritExpanded-Regular',
      fontSize: scale(15),
      fontWeight: 'bold',
    },
  });
