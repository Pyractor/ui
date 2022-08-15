import React, { useState, useEffect, useCallback } from "react";
import useWebSocket, { ReadyState } from "react-use-websocket";
import debounce from "lodash.debounce";
import ReactMarkdown from "react-markdown";

import { ThemeProvider, createTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Slider from "@mui/material/Slider";

const darkTheme = createTheme({
  palette: {
    mode: "dark",
  },
});

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

interface Loading {
  loading: boolean;
}

interface MessageIn {
  kind: string;
  message: StateSync | Loading;
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
      <Button onClick={() => onChange(id, -1)}>{state.label}</Button>
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

  const change = (v: number) => {
    setValue(v);
  };

  const sync = useCallback(
    debounce((v: number) => {
      onChange(id, v);
    }, 500),
    [id, onChange]
  );

  return (
    <div>
      <Slider
        min={state.min}
        max={state.max}
        value={value}
        onChange={(e, v) => {
          if (!Array.isArray(v)) {
            change(v);
            sync(v);
          }
        }}
      />
    </div>
  );
};

const RenderMD = (props: { id: string; state: MDState }) => {
  const { state, id } = props;

  return <ReactMarkdown>{state.md}</ReactMarkdown>;
};

const RenderElement = (props: {
  id: string;
  state: ElementState;
  onChange: ChangeCb;
}) => {
  const { state, id, onChange } = props;

  if (state.kind === "Slider") {
    return (
      <RenderSlider id={id} state={state as SliderState} onChange={onChange} />
    );
  }

  if (state.kind === "MD") {
    return <RenderMD id={id} state={state as MDState} />;
  }

  if (state.kind === "Button") {
    return (
      <RenderButton id={id} state={state as ButtonState} onChange={onChange} />
    );
  }

  return <div>UNKNOWN ELEMENT {state.kind}</div>;
};

const RenderState = (props: { state: State; onChange: ChangeCb }) => {
  const { state, onChange } = props;
  return (
    <Box>
      {state.order
        .filter((id: string) => state.registry[id].visible)
        .map((id: string) => (
          <RenderElement
            id={id}
            state={state.registry[id]}
            key={id}
            onChange={onChange}
          />
        ))}
    </Box>
  );
};

function App() {
  const [isDebug, setIsDebug] = useState(process.env.NODE_ENV !== "production");
  const [loading, setLoading] = useState(false);
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
        setAppState((msg.message as StateSync).state);
      }
      if (msg.kind === "Loading") {
        setLoading((msg.message as Loading).loading);
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
    <ThemeProvider theme={darkTheme}>
      {loading && (
        <Chip
          sx={{ position: "absolute", top: 10, right: 10 }}
          color="info"
          variant="filled"
          label="Loading..."
        />
      )}
      <RenderState state={appState} onChange={change} />
      {isDebug && <pre>{JSON.stringify(appState, null, 2)}</pre>}
      {isDebug && <pre>{JSON.stringify(messageHistory, null, 2)}</pre>}
    </ThemeProvider>
  );
}

export default App;
