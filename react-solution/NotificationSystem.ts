import { useEffect } from 'react';

export class NotificationSystem {
  static async playSound() {
    try {
      const audio = new Audio('/public/sounds/notification.mp3');
      await audio.play();
    } catch (e) {
      console.warn("Audio autoplay policy prevented sound from playing without interaction.");
    }
  }

  static async requestPermission() {
    if ("Notification" in window) {
      if (Notification.permission !== "granted" && Notification.permission !== "denied") {
        await Notification.requestPermission();
      }
    }
  }

  static async notify(title: string, body: string, icon = '/favicon.ico') {
    await this.playSound();
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body, icon });
    }
  }
}

/**
 * Custom hook to manage incoming Webhook events (Socket/SSE) globally
 */
export function useRealTimeAlerts(onIncomingEvent: (payload: any) => void) {
  useEffect(() => {
    // Attempt to register for Desktop Notifications
    NotificationSystem.requestPermission();

    // The handler function for any live socket event
    const handleWebhookEvent = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        
        // Example check for specific SMS/Call triggers
        if (data.type === 'onNewMessage' || data.type === 'onIncomingCall') {
          const actionWord = data.type === 'onNewMessage' ? 'Message' : 'Call';
          const senderName = data.payload?.sender_name || 'Client';
          
          NotificationSystem.notify(\`Incoming \${actionWord} from \${senderName}\`, data.payload?.message_preview || 'Open Dashboard to view');
          onIncomingEvent(data.payload);
        }
      } catch (err) {
        console.error("Socket Payload Error:", err);
      }
    };

    // Assuming a global WebSocket instance provided by Supabase or custom backend
    const socket = (window as any).globalAppSocket; 
    if (socket) {
      socket.addEventListener('message', handleWebhookEvent);
    }

    return () => {
      if (socket) {
        socket.removeEventListener('message', handleWebhookEvent);
      }
    };
  }, [onIncomingEvent]);
}
