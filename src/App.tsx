import React, { useState, useEffect, useCallback } from "react";
import useWebSocket, { ReadyState } from "react-use-websocket";
import debounce from "lodash.debounce";

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

interface SliderState {
  id: string;
  kind: string;
  visible: boolean;
  value: number;
  min: number;
  max: number;
}

interface MDState {
  id: string;
  kind: string;
  visible: boolean;
  md: string;
}

interface ButtonState {
  id: string;
  kind: string;
  visible: boolean;
  label: string;
}

type ElementState = SliderState | MDState | ButtonState;

type ChangeCb = (id: string, value: any) => void;

interface State {
  registry: Record<string, ElementState>;
  order: Array<string>;
}

const RenderButton = (props: {
  id: string;
  state: ButtonState;
  onChange: ChangeCb;
}) => {
  const { state, id, onChange } = props;

  return (
    <div>
      <button onClick={() => onChange(id, -1)}>{state.label}</button>
    </div>
  );
};

const RenderSlider = (props: {
  id: string;
  state: SliderState;
  onChange: ChangeCb;
}) => {
  const { state, id, onChange } = props;
  const [value, setValue] = useState(state.value);

  const change = (v: string) => {
    const n = parseInt(v, 10);
    setValue(n);
  };

  const sync = useCallback(
    debounce((v: string) => {
      const n = parseInt(v, 10);
      onChange(id, n);
    }, 500),
    [id, onChange]
  );

  return (
    <div>
      <input
        type="range"
        min={state.min}
        max={state.max}
        value={value}
        onChange={(e) => {
          change(e.target.value);
          sync(e.target.value);
        }}
      />
    </div>
  );
};

const RenderMD = (props: { id: string; state: MDState }) => {
  const { state, id } = props;

  return <div>{state.md}</div>;
};

const RenderElement = (props: {
  id: string;
  state: ElementState;
  onChange: ChangeCb;
}) => {
  const { state, id, onChange } = props;

  return (
    <div>
      {state.visible && state.kind === "Slider" && (
        <RenderSlider
          id={id}
          state={state as SliderState}
          onChange={onChange}
        />
      )}
      {state.visible && state.kind === "MD" && (
        <RenderMD id={id} state={state as MDState} />
      )}
      {state.visible && state.kind === "Button" && (
        <RenderButton
          id={id}
          state={state as ButtonState}
          onChange={onChange}
        />
      )}
    </div>
  );
};

const RenderState = (props: { state: State; onChange: ChangeCb }) => {
  const { state, onChange } = props;
  return (
    <div>
      {state.order.map((id: string) => (
        <RenderElement
          id={id}
          state={state.registry[id]}
          key={id}
          onChange={onChange}
        />
      ))}
    </div>
  );
};

function App() {
  const [isDebug, setIsDebug] = useState(process.env.NODE_ENV !== "production");
  const [initialized, setInitialized] = useState(false);
  const [appState, setAppState] = useState<State>({ registry: {}, order: [] });
  const [socketUrl, setSocketUrl] = useState("ws://localhost:1337");
  const [messageHistory, setMessageHistory] = useState<Array<any>>([]);
  const { sendMessage, lastMessage, readyState } = useWebSocket(socketUrl);

  const send = (msg: any) => {
    console.log(msg);
    sendMessage(JSON.stringify(msg));
  };

  useEffect(() => {
    if (lastMessage !== null) {
      const json = lastMessage.data;
      const msg = JSON.parse(json) as MessageIn;
      if (msg.kind === "StateSync") {
        setAppState(msg.message.state);
      }
      console.log(msg);
      setMessageHistory((prev) => prev.concat(msg));
    }
  }, [lastMessage, setMessageHistory]);

  useEffect(() => {
    if (ReadyState.OPEN === readyState && !initialized) {
      setInitialized(true);
      const msg = {
        kind: "Hello",
        message: { session: "session" },
      } as MessageOut;

      send(msg);
    }
  }, [initialized, setInitialized, readyState]);

  const change = (id: string, value: any) => {
    send({
      kind: "Change",
      message: { id, value },
    });
  };

  (window as any)["debugme"] = () => setIsDebug((debug) => !debug);

  return (
    <div className="App">
      <RenderState state={appState} onChange={change} />
      {isDebug && <pre>{JSON.stringify(appState, null, 2)}</pre>}
      {isDebug && <pre>{JSON.stringify(messageHistory, null, 2)}</pre>}
    </div>
  );
}

export default App;
