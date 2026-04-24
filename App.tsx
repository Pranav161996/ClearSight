import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';

import OnboardingScreen from './screens/OnboardingScreen';
import CalibrationScreen from './screens/CalibrationScreen';
import TestRunnerScreen from './screens/TestRunner';
import ResultsScreen from './screens/ResultsScreen';
import BookingScreen from './screens/BookingScreen';

export type RootStackParamList = {
  Onboarding: undefined;
  Calibration: undefined;
  TestRunner: undefined;
  Results: undefined;
  Booking: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Stack.Navigator initialRouteName="Onboarding">
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Calibration" component={CalibrationScreen} />
        <Stack.Screen name="TestRunner" component={TestRunnerScreen} />
        <Stack.Screen name="Results" component={ResultsScreen} />
        <Stack.Screen name="Booking" component={BookingScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
