import { focusManager, onlineManager } from '@tanstack/react-query';
import * as Network from 'expo-network';
import { useEffect } from 'react';
import { AppState, Platform, type AppStateStatus } from 'react-native';

function updateFocusState(status: AppStateStatus) {
  if (Platform.OS !== 'web') {
    focusManager.setFocused(status === 'active');
  }
}

export function useQueryLifecycle() {
  useEffect(() => {
    const subscription = AppState.addEventListener('change', updateFocusState);

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }

    return onlineManager.setEventListener((setOnline) => {
      let receivedNetworkEvent = false;
      const subscription = Network.addNetworkStateListener((state) => {
        receivedNetworkEvent = true;
        setOnline(Boolean(state.isConnected));
      });

      Network.getNetworkStateAsync()
        .then((state) => {
          if (!receivedNetworkEvent) {
            setOnline(Boolean(state.isConnected));
          }
        })
        .catch(() => {
          // Queries keep their default online state if the device network state cannot be read.
        });

      return () => subscription.remove();
    });
  }, []);
}
