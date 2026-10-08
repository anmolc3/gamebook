import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Vibration, Platform } from 'react-native';
import { MobileSocketService } from '../../services/socket.service';
import { useAuth } from '../auth/AuthContext';

export type CallState = 'idle' | 'outgoing' | 'incoming' | 'connected' | 'ended';
export type CallType = 'audio' | 'video';

export interface CallPeerInfo {
  id: string;
  name: string;
  username: string;
  avatarUrl: string | null;
}

interface CallContextType {
  callState: CallState;
  callType: CallType;
  callId: string | null;
  peer: CallPeerInfo | null;
  conversationId: string | null;
  durationSeconds: number;
  isMuted: boolean;
  isVideoOff: boolean;
  isSpeakerOn: boolean;
  facing: 'front' | 'back';
  endReason: string | null;
  startCall: (
    peerId: string,
    peerName: string,
    peerUsername: string,
    peerAvatarUrl: string | null,
    type: CallType,
    conversationId?: string
  ) => void;
  acceptCall: () => void;
  rejectCall: (reason?: string) => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleVideo: () => void;
  flipCamera: () => void;
  toggleSpeaker: () => void;
  dismissCall: () => void;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user: authUser } = useAuth();

  const [callState, setCallState] = useState<CallState>('idle');
  const [callType, setCallType] = useState<CallType>('audio');
  const [callId, setCallId] = useState<string | null>(null);
  const [peer, setPeer] = useState<CallPeerInfo | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [durationSeconds, setDurationSeconds] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isVideoOff, setIsVideoOff] = useState<boolean>(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState<boolean>(false);
  const [facing, setFacing] = useState<'front' | 'back'>('front');
  const [endReason, setEndReason] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear timers helper
  const clearTimers = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
  }, []);

  const dismissCall = useCallback(() => {
    clearTimers();
    setCallState('idle');
    setCallId(null);
    setPeer(null);
    setConversationId(null);
    setDurationSeconds(0);
    setIsMuted(false);
    setIsVideoOff(false);
    setIsSpeakerOn(false);
    setEndReason(null);
  }, [clearTimers]);

  // Initiate outgoing call
  const startCall = useCallback(
    (
      peerId: string,
      peerName: string,
      peerUsername: string,
      peerAvatarUrl: string | null,
      type: CallType,
      convId?: string
    ) => {
      clearTimers();
      const newCallId = `call_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

      setCallId(newCallId);
      setCallType(type);
      setCallState('outgoing');
      setPeer({
        id: peerId,
        name: peerName,
        username: peerUsername,
        avatarUrl: peerAvatarUrl,
      });
      setConversationId(convId || null);
      setDurationSeconds(0);
      setIsMuted(false);
      setIsVideoOff(false);
      setIsSpeakerOn(type === 'video');
      setFacing('front');
      setEndReason(null);

      // Emit initiate event via socket
      MobileSocketService.initiateCall({
        callId: newCallId,
        recipientId: peerId,
        callType: type,
        callerInfo: {
          name: authUser?.displayName || authUser?.username || 'Player',
          username: authUser?.username || 'player',
          avatarUrl: authUser?.avatarUrl || null,
        },
        conversationId: convId,
      });

      // Ringing vibration pulse
      if (Platform.OS !== 'web') {
        Vibration.vibrate([0, 200, 800], true);
      }
    },
    [authUser, clearTimers]
  );

  // Accept incoming call
  const acceptCall = useCallback(() => {
    if (!callId) return;
    if (Platform.OS !== 'web') {
      Vibration.cancel();
    }
    MobileSocketService.acceptCall(callId);
    setCallState('connected');
    setDurationSeconds(0);

    // Start in-call duration timer
    timerRef.current = setInterval(() => {
      setDurationSeconds((prev) => prev + 1);
    }, 1000);
  }, [callId]);

  // Reject incoming call
  const rejectCall = useCallback(
    (reason = 'declined') => {
      if (Platform.OS !== 'web') {
        Vibration.cancel();
      }
      if (callId) {
        MobileSocketService.rejectCall(callId, reason);
      }
      setCallState('ended');
      setEndReason(reason === 'busy' ? 'User is busy' : 'Call declined');
      dismissTimerRef.current = setTimeout(dismissCall, 1800);
    },
    [callId, dismissCall]
  );

  // End active or outgoing call
  const endCall = useCallback(() => {
    if (Platform.OS !== 'web') {
      Vibration.cancel();
    }
    if (callId) {
      MobileSocketService.endCall(callId, durationSeconds);
    }
    clearTimers();
    setCallState('ended');
    setEndReason('Call ended');
    dismissTimerRef.current = setTimeout(dismissCall, 1500);
  }, [callId, durationSeconds, clearTimers, dismissCall]);

  // Media toggles
  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      if (callId) {
        MobileSocketService.sendCallMediaState(callId, next, isVideoOff);
      }
      return next;
    });
  }, [callId, isVideoOff]);

  const toggleVideo = useCallback(() => {
    setIsVideoOff((prev) => {
      const next = !prev;
      if (callId) {
        MobileSocketService.sendCallMediaState(callId, isMuted, next);
      }
      return next;
    });
  }, [callId, isMuted]);

  const flipCamera = useCallback(() => {
    setFacing((prev) => (prev === 'front' ? 'back' : 'front'));
  }, []);

  const toggleSpeaker = useCallback(() => {
    setIsSpeakerOn((prev) => !prev);
  }, []);

  // Socket event listeners
  useEffect(() => {
    // 1. Incoming Call Event
    const unsubIncoming = MobileSocketService.onCallIncoming((data) => {
      clearTimers();
      setCallId(data.callId);
      setCallType(data.callType);
      setCallState('incoming');
      setPeer({
        id: data.callerId,
        name: data.callerInfo.name,
        username: data.callerInfo.username,
        avatarUrl: data.callerInfo.avatarUrl,
      });
      setConversationId(data.conversationId || null);
      setDurationSeconds(0);
      setIsMuted(false);
      setIsVideoOff(false);
      setIsSpeakerOn(data.callType === 'video');
      setFacing('front');
      setEndReason(null);

      if (Platform.OS !== 'web') {
        // Continuous vibration pattern for incoming phone call
        Vibration.vibrate([0, 1000, 800], true);
      }
    });

    // 2. Call Accepted Event
    const unsubAccepted = MobileSocketService.onCallAccepted(() => {
      if (Platform.OS !== 'web') {
        Vibration.cancel();
      }
      setCallState('connected');
      setDurationSeconds(0);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setDurationSeconds((prev) => prev + 1);
      }, 1000);
    });

    // 3. Call Rejected Event
    const unsubRejected = MobileSocketService.onCallRejected((data) => {
      if (Platform.OS !== 'web') {
        Vibration.cancel();
      }
      clearTimers();
      setCallState('ended');
      let msg = 'Call declined';
      if (data.reason === 'busy') msg = 'User is currently on another call';
      if (data.reason === 'no_answer') msg = 'No answer';
      setEndReason(msg);
      dismissTimerRef.current = setTimeout(dismissCall, 2000);
    });

    // 4. Call Ended Event
    const unsubEnded = MobileSocketService.onCallEnded((data) => {
      if (Platform.OS !== 'web') {
        Vibration.cancel();
      }
      clearTimers();
      setCallState('ended');
      setEndReason(data.reason === 'missed' ? 'Missed call' : 'Call ended');
      dismissTimerRef.current = setTimeout(dismissCall, 1800);
    });

    return () => {
      unsubIncoming();
      unsubAccepted();
      unsubRejected();
      unsubEnded();
      if (Platform.OS !== 'web') {
        Vibration.cancel();
      }
    };
  }, [clearTimers, dismissCall]);

  return (
    <CallContext.Provider
      value={{
        callState,
        callType,
        callId,
        peer,
        conversationId,
        durationSeconds,
        isMuted,
        isVideoOff,
        isSpeakerOn,
        facing,
        endReason,
        startCall,
        acceptCall,
        rejectCall,
        endCall,
        toggleMute,
        toggleVideo,
        flipCamera,
        toggleSpeaker,
        dismissCall,
      }}
    >
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCall must be used within a CallProvider');
  }
  return context;
};
