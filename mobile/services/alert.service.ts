import { Alert, AlertButton, AlertOptions } from 'react-native';

export interface GameAlertConfig {
  title: string;
  message?: string;
  buttons?: AlertButton[];
  options?: AlertOptions;
}

type AlertListener = (config: GameAlertConfig | null) => void;

class GameAlertServiceClass {
  private listener: AlertListener | null = null;
  private isInitialized = false;
  private originalAlert = Alert.alert;

  public register(listener: AlertListener) {
    this.listener = listener;
  }

  public unregister() {
    this.listener = null;
  }

  public show(config: GameAlertConfig) {
    if (this.listener) {
      this.listener(config);
    } else {
      // If listener not registered yet, use native alert
      this.originalAlert(config.title, config.message, config.buttons, config.options);
    }
  }

  public hide() {
    if (this.listener) {
      this.listener(null);
    }
  }

  // Intercept React Native's Alert.alert globally
  public init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    Alert.alert = (
      title: string,
      message?: string,
      buttons?: AlertButton[],
      options?: AlertOptions
    ) => {
      this.show({
        title,
        message,
        buttons,
        options,
      });
    };
  }

  public restore() {
    if (!this.isInitialized) return;
    Alert.alert = this.originalAlert;
    this.isInitialized = false;
  }
}

export const GameAlertService = new GameAlertServiceClass();
