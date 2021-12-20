import {Dimensions, StyleSheet} from 'react-native';
import {scale} from '../../common/utils';

var {height} = Dimensions.get('window');

export const SettingsStyles = StyleSheet.create({
  // Settings.
  viewSettings: {
    height,
    backgroundColor: '#000000',
    flex: 1,
  },
  viewSettingsContainer: {
    flexDirection: 'column',
    textAlign: 'left',
  },
  viewSettingsBorder: {
    borderTopColor: '#626270',
    borderTopWidth: 1,
    marginTop: scale(20),
    marginBottom: scale(20),
  },
  viewSettingsBody: {
    margin: scale(25),
  },
  viewSettingsRows: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  viewSettingsSwitchRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: scale(15),
  },
  textSettingsDescriptionHeading: {
    color: '#EDEDFD',
    fontFamily: 'EduFavoritExpanded-Bold',
    fontSize: scale(20),
    lineHeight: scale(28),
    marginBottom: scale(20),
  },
  textSettingsDescription: {
    color: '#9C9CB0',
    fontFamily: 'RobotoMono-Regular',
    fontSize: scale(16),
    lineHeight: scale(28),
  },
  textSettingsFAQ: {
    color: '#EDEDFD',
    fontFamily: 'EduFavoritExpanded-Bold',
    fontSize: scale(17),
    lineHeight: scale(28),
  },
  textSettingsTellMeMore: {
    color: '#EDEDFD',
    fontFamily: 'EduFavoritExpanded-Bold',
    fontSize: scale(17),
    lineHeight: scale(28),
  },
  textSettingsSettingsHeading: {
    color: '#EDEDFD',
    fontFamily: 'EduFavoritExpanded-Bold',
    fontSize: scale(17),
    lineHeight: scale(28),
    marginBottom: scale(20),
  },
  textSettingsWalletHeading: {
    color: '#EDEDFD',
    fontFamily: 'EduFavoritExpanded-Bold',
    fontSize: scale(17),
    lineHeight: scale(28),
  },
  textSettingsNodeIpValue: {
    color: '#9C9CB0',
    fontFamily: 'RobotoMono-Regular',
    fontSize: scale(16),
    lineHeight: scale(28),
    marginBottom: scale(8),
    textDecorationLine: 'underline',
    textDecorationStyle: 'dotted',
    textDecorationColor: '#979797',
  },
  textSettingsScan: {
    color: '#9C9CB0',
    fontFamily: 'RobotoMono-Regular',
    textAlign: 'left',
    fontSize: scale(16),
    lineHeight: scale(28),
  },
  textSettingsScanDescription: {
    color: '#9C9CB0',
    fontFamily: 'RobotoMono-Regular',
    fontSize: scale(16),
    lineHeight: scale(28),
  },
  textSettingsScanCompatibility: {
    color: '#EDEDFD',
    fontFamily: 'RobotoMono-Regular',
    fontSize: scale(16),
    lineHeight: scale(28),
    marginTop: scale(20),
  },
  textSettingsReset: {
    color: '#EDEDFD',
    fontFamily: 'RobotoMono-Regular',
    fontSize: scale(16),
    lineHeight: scale(28),
  },
  textSettingsVersion: {
    color: '#EDEDFD',
    fontFamily: 'RobotoMono-Regular',
    fontSize: scale(12),
    lineHeight: scale(30),
    marginBottom: scale(20),
  },
});
