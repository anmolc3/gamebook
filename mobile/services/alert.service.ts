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
  private pendingConfig: GameAlertConfig | null = null;
  private isInitialized = false;
  private originalAlert = Alert.alert;

  public register(listener: AlertListener) {
    this.listener = listener;
    if (this.pendingConfig) {
      const cfg = this.pendingConfig;
      this.pendingConfig = null;
      listener(cfg);
    }
  }

  public unregister() {
    this.listener = null;
  }

  public show(config: GameAlertConfig) {
    if (this.listener) {
      this.listener(config);
    } else {
      this.pendingConfig = config;
    }
  }

  public hide() {
    this.pendingConfig = null;
    if (this.listener) {
      this.listener(null);
    }
  }

  public alert(
    title: string,
    message?: string,
    buttons?: AlertButton[],
    options?: AlertOptions
  ) {
    this.show({ title, message, buttons, options });
  }

  // Intercept React Native's Alert.alert globally across the entire app
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
// Auto-initialize interceptor immediately on import
GameAlertService.init();

