import React, { useState, useEffect, useCallback } from "react";
import useWebSocket, { ReadyState } from "react-use-websocket";

interface Hello {
  session: string;
}

interface Change {
  id: string;
  value: any;
}

interface StateSync {
  state: any;
}

interface MessageIn {
  kind: string;
  message: StateSync;
}

interface MessageOut {
  kind: string;
  message: Hello | Change;
}

function App() {
  const [initialized, setInitialized] = useState(false);
  const [appState, setAppState] = useState<any>({});
  const [socketUrl, setSocketUrl] = useState("ws://localhost:1337");
  const [messageHistory, setMessageHistory] = useState<Array<any>>([]);
  const { sendMessage, lastMessage, readyState } = useWebSocket(socketUrl);

  const send = (msg: any) => sendMessage(JSON.stringify(msg));

  useEffect(() => {
    if (lastMessage !== null) {
      const json = lastMessage.data;
      const msg = JSON.parse(json) as MessageIn;
      console.log(msg);
      setMessageHistory((prev) => prev.concat(msg));
    }
  }, [lastMessage, setMessageHistory]);

  useEffect(() => {
    if (ReadyState.OPEN === readyState && !initialized) {
      setInitialized(true);
      const msg = {
        kind: "hello",
        message: { session: "session" },
      } as MessageOut;

      send(msg);
    }
  }, [initialized, setInitialized, readyState]);

  const handleClickSendMessage = useCallback(
    () =>
      send({
        kind: "hello",
        message: { session: "session" },
      }),
    []
  );

  return (
    <div className="App">
      <button onClick={handleClickSendMessage}>CLICK</button>
      <pre>{JSON.stringify(appState)}</pre>
      <pre>{JSON.stringify(messageHistory, null, 2)}</pre>
    </div>
  );
}

export default App;
