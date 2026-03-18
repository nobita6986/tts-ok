import { useEffect } from 'react';

export function EdgeTest() {
  useEffect(() => {
    const ws = new WebSocket('wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4');
    ws.onopen = () => console.log('Edge WS Connected');
    ws.onerror = (e) => console.error('Edge WS Error', e);
    ws.onclose = () => console.log('Edge WS Closed');
  }, []);
  return null;
}
