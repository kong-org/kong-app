import {
  createNavigationContainerRef,
  StackActions,
} from '@react-navigation/native';
import {RootStackParamList} from '../screens/Routes/RootStackParamList';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export const navigate: (
  name: keyof RootStackParamList,
  params?: any,
) => void = (name, params) => {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params);
  }
};
export const updateParams: (params?: any) => void = params => {
  if (navigationRef.isReady()) {
    navigationRef.setParams(params);
  }
};
export const checkCurrentRoute = () => navigationRef.getCurrentRoute()?.name;
