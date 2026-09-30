import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '../screens/HomeScreen';
import { SubjectDetailScreen } from '../screens/SubjectDetailScreen';
import { PlayerScreen } from '../screens/PlayerScreen';
import { Subject, Topic } from '../types/lms';
import { COMMON_COLORS } from '../theme/colors';

export type RootStackParamList = {
  Home: undefined;
  SubjectDetail: { subject: Subject };
  Player: { topic: Topic; subject: Subject; playlist?: Topic[] };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COMMON_COLORS.bgDark },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="SubjectDetail" component={SubjectDetailScreen} />
      <Stack.Screen name="Player" component={PlayerScreen} />
    </Stack.Navigator>
  );
};
