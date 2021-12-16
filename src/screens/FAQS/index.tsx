import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import React, {FC} from 'react';
import {
  Dimensions,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import strings from '../../../assets/text/strings';
import {scale} from '../../common/utils';
import {RootStackParamList} from '../Routes/RootStackParamList';
const {height} = Dimensions.get('screen');
interface IFAQ {
  navigation: NativeStackNavigationProp<RootStackParamList, 'FAQS'>;
}

export const FAQS: FC<IFAQ> = ({navigation}) => {
  return (
    <View style={FAQStyles.viewFAQ}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView>
        <KeyboardAwareScrollView
          style={FAQStyles.viewFAQContainer}
          contentContainerStyle={FAQStyles.viewFAQContentContainers}>
          <View style={FAQStyles.viewFAQDescription}>
            <React.Fragment>
              <Text style={FAQStyles.textFAQQuestion}>
                {strings.textFAQQuestion1}
              </Text>
              <Text style={FAQStyles.textFAQAnswer}>
                {strings.textFAQAnswer1}
              </Text>

              <View style={FAQStyles.viewFAQBorder} />

              <Text style={FAQStyles.textFAQQuestion}>
                {strings.textFAQQuestion3}
              </Text>
              <Text style={FAQStyles.textFAQAnswer}>
                {strings.textFAQAnswer3}
              </Text>

              <View style={FAQStyles.viewFAQBorder} />

              <Text style={FAQStyles.textFAQQuestion}>
                {strings.textFAQQuestion4}
              </Text>
              <Text style={FAQStyles.textFAQAnswer}>
                {strings.textFAQAnswer4}
              </Text>

              <View style={FAQStyles.viewFAQBorder} />

              <Text style={FAQStyles.textFAQQuestion}>
                {strings.textFAQQuestion5}
              </Text>
              <Text style={FAQStyles.textFAQAnswer}>
                {strings.textFAQAnswer5}
              </Text>

              <View style={FAQStyles.viewFAQBorder} />

              <Text style={FAQStyles.textFAQQuestion}>
                {strings.textFAQQuestion6}
              </Text>
              <Text style={FAQStyles.textFAQAnswer}>
                {strings.textFAQAnswer6}
              </Text>

              <View style={FAQStyles.viewFAQBorder} />

              <Text style={FAQStyles.textFAQQuestion}>
                {strings.textFAQQuestion7}
              </Text>
              <Text style={FAQStyles.textFAQAnswer}>
                {strings.textFAQAnswer7}
              </Text>
            </React.Fragment>
          </View>
        </KeyboardAwareScrollView>
      </SafeAreaView>
    </View>
  );
};
// Styles
const FAQStyles = StyleSheet.create({
  viewFAQ: {
    flex: 1,
    height: height,
    backgroundColor: '#000000',
  },
  viewFAQContainer: {
    flexDirection: 'column',
    textAlign: 'left',
  },
  viewFAQContentContainers: {
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  viewFAQBorder: {
    borderTopColor: '#626270',
    borderTopWidth: scale(1),
    marginTop: scale(20),
    marginBottom: scale(20),
  },
  viewFAQTopLeftCorner: {
    marginBottom: scale(14),
    marginLeft: scale(34),
    marginRight: scale(34),
  },
  viewFAQDescription: {
    margin: scale(25),
  },
  textFAQQuestion: {
    color: '#EDEDFD',
    // fontFamily: 'Futura-CondensedExtraBold',
    fontFamily: 'EduFavoritExpanded-Bold',
    fontSize: scale(20),
    lineHeight: scale(28),
    marginBottom: scale(20),
  },
  textFAQAnswer: {
    color: '#9C9CB0',
    // fontFamily: 'InputMono-Regular',
    fontFamily: 'RobotoMono-Regular',
    fontSize: scale(16),
    lineHeight: scale(28),
  },
});
