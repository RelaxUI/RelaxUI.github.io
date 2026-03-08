import {
  Background,
  BaseEdge,
  Controls,
  EdgeToolbar,
  Handle,
  MiniMap,
  NodeToolbar,
  Position,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  getBezierPath,
  useEdgesState,
  useNodesState,
  useReactFlow,
  useUpdateNodeInternals,
  useViewport,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import "./index.css";

// --- CONSTANTS & DEFINITIONS ---

const LOCAL_STORAGE_KEY = "relaxui_autosave_v1";

const NODE_DIMENSIONS = {
  inputText: { w: 220, h: 140, title: "INPUT TEXT", sub: "string data" },
  inputImage: { w: 220, h: 140, title: "INPUT IMAGE", sub: "base64 data" },
  customScript: { w: 260, h: 220, title: "CUSTOM SCRIPT", sub: "js execution" },
  httpRequest: { w: 240, h: 200, title: "HTTP REQUEST", sub: "fetch api" },
  jsonPath: { w: 220, h: 100, title: "JSON PATH", sub: "extract data" },
  outputText: { w: 280, h: 220, title: "OUTPUT TEXT", sub: "stream render" },
  outputImage: { w: 280, h: 220, title: "OUTPUT IMAGE", sub: "image render" },
  macroNode: { w: 260, h: 220, title: "MACRO NODE", sub: "sub-graph logic" },
  macroInEdge: { w: 180, h: 100, title: "MACRO IN (edge)", sub: "edge" },
  macroInParam: { w: 180, h: 100, title: "MACRO IN (param)", sub: "param" },
  macroOutput: { w: 180, h: 100, title: "MACRO OUT", sub: "pass through" },
  macroConnections: {
    w: 180,
    h: 100,
    title: "MACRO CONNS",
    sub: "active ports",
  },
};

const NODE_INFO = {
  inputText: {
    desc: "Provides a static string value to the workflow.",
    in: "None",
    out: "String value",
  },
  inputImage: {
    desc: "Provides base64 image data.",
    in: "None",
    out: "Base64 Image",
  },
  customScript: {
    desc: "Executes custom JavaScript. Access inputs via in1, in2... Return your output.",
    in: "Dynamic (in1, in2...)",
    out: "Script return value",
  },
  httpRequest: {
    desc: "Performs an HTTP fetch request. Supports streaming.",
    in: "method, url, headers, body",
    out: "JSON or Stream chunks",
  },
  jsonPath: {
    desc: "Extracts a specific value from a JSON object using dot notation.",
    in: "json (Object)",
    out: "Extracted value",
  },
  outputText: {
    desc: "Renders text data. Automatically handles text streams.",
    in: "in (String)",
    out: "None",
  },
  outputImage: {
    desc: "Renders standard or compare-slider image output.",
    in: "in1 (Image), in2 (Image)",
    out: "None",
  },
  macroNode: {
    desc: "A container for nested workflow logic. Double click to enter.",
    in: "Dynamic",
    out: "Dynamic",
  },
  macroInEdge: {
    desc: "Receives data from an external connection to the macro node.",
    in: "None",
    out: "Edge payload",
  },
  macroInParam: {
    desc: "Receives static data defined on the Macro node's UI.",
    in: "None",
    out: "Parameter value",
  },
  macroOutput: {
    desc: "Passes data out of the Macro to the parent workflow.",
    in: "Internal result",
    out: "None",
  },
  macroConnections: {
    desc: "Outputs an array of active external connection port names.",
    in: "None",
    out: "Array of Strings",
  },
};

// --- PRE-BUILT MACRO FACTORIES ---

const generateId = (prefix) =>
  `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

const PREBUILT_MACROS = {
  openRouter: {
    label: "OpenRouter API",
    create: (pos, parentMacroId) => {
      const mId = generateId("macro");
      const nodes = [
        {
          id: mId,
          type: "macroNode",
          position: pos,
          macroId: parentMacroId,
          data: {
            label: "OpenRouter API",
            key: "",
            model: "black-forest-labs/flux.2-pro",
          },
        },
        {
          id: generateId("n"),
          type: "macroInParam",
          macroId: mId,
          position: { x: 50, y: 80 },
          data: { param: "key" },
        },
        {
          id: generateId("n"),
          type: "macroInParam",
          macroId: mId,
          position: { x: 50, y: 220 },
          data: { param: "model" },
        },
        {
          id: generateId("n"),
          type: "macroInEdge",
          macroId: mId,
          position: { x: 50, y: 360 },
          data: { param: "text" },
        },
        {
          id: generateId("n"),
          type: "macroInEdge",
          macroId: mId,
          position: { x: 50, y: 500 },
          data: { param: "image" },
        },
        {
          id: generateId("n"),
          type: "macroConnections",
          macroId: mId,
          position: { x: 50, y: 640 },
          data: {},
        },
        {
          id: generateId("n"),
          type: "inputText",
          macroId: mId,
          position: { x: 400, y: 80 },
          data: { value: "POST", label: "Method" },
        },
        {
          id: generateId("n"),
          type: "inputText",
          macroId: mId,
          position: { x: 400, y: 240 },
          data: {
            value: "https://openrouter.ai/api/v1/chat/completions",
            label: "URL",
          },
        },
        {
          id: generateId("n"),
          type: "customScript",
          macroId: mId,
          position: { x: 400, y: 400 },
          data: {
            script:
              'return JSON.stringify({\n  "Authorization": "Bearer " + in1,\n  "Content-Type": "application/json"\n});',
            inputs: ["in1"],
          },
        },
        {
          id: generateId("n"),
          type: "customScript",
          macroId: mId,
          position: { x: 400, y: 650 },
          data: {
            script:
              'const payload = {\n  model: in1,\n  modalities: in4 && in4.length > 0 ? in4 : ["text"],\n  stream: true,\n  messages:[{\n    role: "user",\n    content: in2 ?[\n      { type: "text", text: in3 },\n      { type: "image_url", image_url: { url: in2 } }\n    ] :[{ type: "text", text: in3 }]\n  }]\n};\nreturn JSON.stringify(payload);',
            inputs: ["in1", "in2", "in3", "in4"],
          },
        },
        {
          id: generateId("n"),
          type: "httpRequest",
          macroId: mId,
          position: { x: 750, y: 300 },
          data: {},
        },
        {
          id: generateId("n"),
          type: "jsonPath",
          macroId: mId,
          position: { x: 1050, y: 180 },
          data: { path: "choices.0.delta.content" },
        },
        {
          id: generateId("n"),
          type: "jsonPath",
          macroId: mId,
          position: { x: 1050, y: 450 },
          data: { path: "choices.0.delta.images.0.image_url.url" },
        },
        {
          id: generateId("n"),
          type: "macroOutput",
          macroId: mId,
          position: { x: 1350, y: 180 },
          data: { param: "text" },
        },
        {
          id: generateId("n"),
          type: "macroOutput",
          macroId: mId,
          position: { x: 1350, y: 450 },
          data: { param: "image" },
        },
      ];

      // Automatically wire up the internals based on index
      const edges = [
        {
          id: generateId("e"),
          source: nodes[1].id,
          sourceHandle: "out",
          target: nodes[8].id,
          targetHandle: "in1",
        },
        {
          id: generateId("e"),
          source: nodes[2].id,
          sourceHandle: "out",
          target: nodes[9].id,
          targetHandle: "in1",
        },
        {
          id: generateId("e"),
          source: nodes[4].id,
          sourceHandle: "out",
          target: nodes[9].id,
          targetHandle: "in2",
        },
        {
          id: generateId("e"),
          source: nodes[3].id,
          sourceHandle: "out",
          target: nodes[9].id,
          targetHandle: "in3",
        },
        {
          id: generateId("e"),
          source: nodes[5].id,
          sourceHandle: "out",
          target: nodes[9].id,
          targetHandle: "in4",
        },
        {
          id: generateId("e"),
          source: nodes[6].id,
          sourceHandle: "out",
          target: nodes[10].id,
          targetHandle: "method",
        },
        {
          id: generateId("e"),
          source: nodes[7].id,
          sourceHandle: "out",
          target: nodes[10].id,
          targetHandle: "url",
        },
        {
          id: generateId("e"),
          source: nodes[8].id,
          sourceHandle: "out",
          target: nodes[10].id,
          targetHandle: "headers",
        },
        {
          id: generateId("e"),
          source: nodes[9].id,
          sourceHandle: "out",
          target: nodes[10].id,
          targetHandle: "body",
        },
        {
          id: generateId("e"),
          source: nodes[10].id,
          sourceHandle: "out",
          target: nodes[11].id,
          targetHandle: "json",
        },
        {
          id: generateId("e"),
          source: nodes[10].id,
          sourceHandle: "out",
          target: nodes[12].id,
          targetHandle: "json",
        },
        {
          id: generateId("e"),
          source: nodes[11].id,
          sourceHandle: "out",
          target: nodes[13].id,
          targetHandle: "in",
        },
        {
          id: generateId("e"),
          source: nodes[12].id,
          sourceHandle: "out",
          target: nodes[14].id,
          targetHandle: "in",
        },
      ];
      return { nodes, edges };
    },
  },
};

/**
 * Derives dynamic input/output handle positions based on node properties.
 */
const getNodeHandles = (node, allNodes) => {
  const handles = { sources: [], targets: [] };

  if (["inputText", "inputImage"].includes(node.type)) {
    handles.sources.push({ id: "out", label: "OUT", offsetY: 70 });
  } else if (node.type === "customScript") {
    const inputs = node.data.inputs || ["in1", "in2", "in3", "in4"];
    inputs.forEach((id, i) =>
      handles.targets.push({
        id,
        label: id.toUpperCase(),
        offsetY: 60 + i * 35,
      }),
    );
    const outY = Math.max(
      110,
      60 + ((inputs.length > 0 ? inputs.length - 1 : 0) * 35) / 2,
    );
    handles.sources.push({ id: "out", label: "OUT", offsetY: outY });
  } else if (node.type === "httpRequest") {
    ["method", "url", "headers", "body"].forEach((id, i) =>
      handles.targets.push({
        id,
        label: id.toUpperCase(),
        offsetY: 60 + i * 35,
      }),
    );
    handles.sources.push({ id: "out", label: "RESPONSE", offsetY: 100 });
  } else if (node.type === "jsonPath") {
    handles.targets.push({ id: "json", label: "JSON", offsetY: 70 });
    handles.sources.push({ id: "out", label: "RESULT", offsetY: 70 });
  } else if (node.type === "outputText") {
    handles.targets.push({ id: "in", label: "IN", offsetY: 110 });
  } else if (node.type === "outputImage") {
    handles.targets.push({ id: "in1", label: "IMAGE", offsetY: 80 });
    handles.targets.push({ id: "in2", label: "IMAGE", offsetY: 150 });
  } else if (
    ["macroInEdge", "macroInParam", "macroConnections"].includes(node.type)
  ) {
    handles.sources.push({ id: "out", label: "OUT", offsetY: 50 });
  } else if (node.type === "macroOutput") {
    handles.targets.push({ id: "in", label: "IN", offsetY: 50 });
  } else if (node.type === "macroNode") {
    const mIns = allNodes.filter(
      (n) => n.macroId === node.id && n.type === "macroInEdge",
    );
    const mOuts = allNodes.filter(
      (n) => n.macroId === node.id && n.type === "macroOutput",
    );
    mIns.forEach((mIn, i) =>
      handles.targets.push({
        id: mIn.data.param || `in${i}`,
        label: (mIn.data.param || `in${i}`).toUpperCase(),
        offsetY: 50 + i * 30,
      }),
    );
    mOuts.forEach((mOut, i) =>
      handles.sources.push({
        id: mOut.data.param || `out${i}`,
        label: (mOut.data.param || `out${i}`).toUpperCase(),
        offsetY: 50 + i * 30,
      }),
    );
  }
  return handles;
};

// --- INITIAL DEFAULT SCENARIO ---
const getDefaultGraph = () => {
  const textId = generateId("n");
  const imageId = generateId("n");
  const textOutId = generateId("n");
  const imgOutId = generateId("n");
  const macroObj = PREBUILT_MACROS.openRouter.create({ x: 450, y: 200 }, null);

  const baseNodes = [
    {
      id: textId,
      type: "inputText",
      position: { x: 80, y: 150 },
      data: { value: "Change the image, add a red balloon", label: "Text" },
      macroId: null,
    },
    {
      id: imageId,
      type: "inputImage",
      position: { x: 80, y: 350 },
      data: { value: "", label: "Image" },
      macroId: null,
    },
    {
      id: textOutId,
      type: "outputText",
      position: { x: 850, y: 100 },
      data: { label: "Response Text" },
      macroId: null,
    },
    {
      id: imgOutId,
      type: "outputImage",
      position: { x: 850, y: 400 },
      data: { label: "Generated Image" },
      macroId: null,
    },
  ];

  const baseEdges = [
    {
      id: generateId("e"),
      source: textId,
      sourceHandle: "out",
      target: macroObj.nodes[0].id,
      targetHandle: "text",
    },
    {
      id: generateId("e"),
      source: imageId,
      sourceHandle: "out",
      target: macroObj.nodes[0].id,
      targetHandle: "image",
    },
    {
      id: generateId("e"),
      source: macroObj.nodes[0].id,
      sourceHandle: "image",
      target: imgOutId,
      targetHandle: "in2",
    },
    {
      id: generateId("e"),
      source: imageId,
      sourceHandle: "out",
      target: imgOutId,
      targetHandle: "in1",
    },
    {
      id: generateId("e"),
      source: macroObj.nodes[0].id,
      sourceHandle: "text",
      target: textOutId,
      targetHandle: "in",
    },
  ];

  return {
    nodes: [...baseNodes, ...macroObj.nodes],
    edges: [...baseEdges, ...macroObj.edges],
  };
};

const getInitialData = () => {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error("Failed to parse local storage cache", e);
  }
  return getDefaultGraph();
};

const defaultData = getInitialData();

// --- GRAPH EXECUTION ENGINE ---
class GraphRunner {
  constructor(nodes, edges, setDisplayData, setRunStatus, hooks) {
    this.nodes = nodes;
    this.edges = edges;
    this.setDisplayData = setDisplayData;
    this.setRunStatus = setRunStatus;
    this.hooks = hooks;
    this.expectedInputs = {};
    this.receivedInputs = {};
    this.isRunning = true;
  }

  async start() {
    this.setRunStatus("RUNNING...");
    this.edges.forEach((e) => {
      let tId = e.target;
      let tHandle = e.targetHandle;
      const tNode = this.nodes.find((n) => n.id === tId);
      if (tNode?.type === "macroNode") {
        const mIn = this.nodes.find(
          (n) =>
            n.macroId === tId &&
            n.type === "macroInEdge" &&
            n.data.param === tHandle,
        );
        if (mIn) {
          tId = mIn.id;
          tHandle = "in";
        }
      }
      if (!this.expectedInputs[tId]) this.expectedInputs[tId] = new Set();
      this.expectedInputs[tId].add(tHandle);
    });

    for (const n of this.nodes) {
      if (!this.expectedInputs[n.id] || this.expectedInputs[n.id].size === 0)
        this.executeNode(n.id);
    }
  }

  pushValue(sourceId, sourceHandle, value, isStream = false) {
    if (!this.isRunning) return;
    let sId = sourceId;
    let sHandle = sourceHandle;
    const sourceNode = this.nodes.find((n) => n.id === sId);

    if (sourceNode?.type === "macroOutput") {
      sId = sourceNode.macroId;
      sHandle = sourceNode.data.param;
    }

    const outgoingEdges = this.edges.filter(
      (e) => e.source === sId && e.sourceHandle === sHandle,
    );

    outgoingEdges.forEach((e) => {
      this.hooks.onEdgeActive(e.id);
      let tId = e.target;
      let tHandle = e.targetHandle;
      const targetNode = this.nodes.find((n) => n.id === tId);

      if (targetNode?.type === "macroNode") {
        const mIn = this.nodes.find(
          (n) =>
            n.macroId === tId &&
            n.type === "macroInEdge" &&
            n.data.param === tHandle,
        );
        if (mIn) {
          tId = mIn.id;
          tHandle = "in";
        }
      }

      if (!this.receivedInputs[tId]) this.receivedInputs[tId] = {};
      this.receivedInputs[tId][tHandle] = value;

      const expected = this.expectedInputs[tId];
      if (
        expected &&
        Object.keys(this.receivedInputs[tId]).length >= expected.size
      ) {
        if (isStream) {
          this.executeNode(tId, isStream);
        } else {
          setTimeout(() => {
            if (this.isRunning) this.executeNode(tId, isStream);
          }, 600);
        }
      }
    });
  }

  async executeNode(nodeId, isStream = false) {
    if (!this.isRunning) return;
    this.hooks.onNodeStart(nodeId);

    const node = this.nodes.find((n) => n.id === nodeId);
    const inputs = this.receivedInputs[nodeId] || {};

    try {
      if (["inputText", "inputImage"].includes(node.type)) {
        this.pushValue(node.id, "out", node.data.value);
      } else if (node.type === "macroConnections") {
        const validOutNodes = this.nodes.filter(
          (n) => n.macroId === node.macroId && n.type === "macroOutput",
        );
        const validPorts = new Set(validOutNodes.map((n) => n.data.param));
        const externalEdges = this.edges.filter(
          (e) => e.source === node.macroId,
        );
        const activePorts = [
          ...new Set(externalEdges.map((e) => e.sourceHandle)),
        ].filter((port) => validPorts.has(port));
        this.pushValue(node.id, "out", activePorts, false);
      } else if (node.type === "macroInParam") {
        const parent = this.nodes.find((n) => n.id === node.macroId);
        this.pushValue(node.id, "out", parent?.data?.[node.data.param], false);
      } else if (node.type === "macroInEdge") {
        this.pushValue(node.id, "out", inputs["in"], isStream);
      } else if (node.type === "macroOutput") {
        this.pushValue(node.id, "in", inputs["in"], isStream);
      } else if (node.type === "customScript") {
        if (!isStream) {
          const inputKeys = node.data.inputs || ["in1", "in2", "in3", "in4"];
          const funcArgs = inputKeys.map((k) => inputs[k]);
          const func = new Function(...inputKeys, node.data.script);
          const res = func(...funcArgs);
          this.pushValue(node.id, "out", res);
        }
      } else if (node.type === "httpRequest") {
        if (isStream) return;
        let { method, url, headers, body } = inputs;
        if (!url) return;

        let res;
        try {
          res = await fetch(url, {
            method: method || "GET",
            headers: headers ? JSON.parse(headers) : {},
            body: method !== "GET" && body ? body : undefined,
          });
        } catch (err) {
          throw new Error(`Fetch failed: ${err.message}. Check Network.`);
        }

        if (!res.ok) {
          let text = await res.text();
          try {
            text = JSON.parse(text).error.message || text;
          } catch (e) {}
          throw new Error(`${res.status}: ${text}`);
        }

        if (
          res.headers.get("content-type")?.includes("event-stream") ||
          (body && JSON.parse(body).stream)
        ) {
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          while (this.isRunning) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop();

            for (let line of lines) {
              if (line.trim() === "") continue;
              if (line.startsWith("data: ")) {
                let d = line.slice(6).trim();
                if (d === "[DONE]") {
                  this.setRunStatus("COMPLETED");
                  continue;
                }
                try {
                  let parsed = JSON.parse(d);
                  this.pushValue(node.id, "out", parsed, true);
                } catch (e) {
                  console.error("JSON parse error on stream chunk", e);
                }
              }
            }
          }
        } else {
          const json = await res.json();
          this.pushValue(node.id, "out", json, false);
          this.setRunStatus("COMPLETED");
        }
      } else if (node.type === "jsonPath") {
        const resolve = (obj, p) =>
          p
            .replace(/\["?'?([^"']+)"?'?\]/g, ".$1")
            .split(".")
            .reduce((a, c) => a && a[c], obj);
        let val = resolve(inputs.json, node.data.path);
        if (val === undefined)
          val = resolve(
            inputs.json,
            node.data.path.replace(".delta.", ".message."),
          );
        if (val !== undefined) this.pushValue(node.id, "out", val, isStream);
      } else if (node.type === "outputText") {
        this.setDisplayData(node.id, inputs.in, isStream);
      } else if (node.type === "outputImage") {
        this.setDisplayData(
          node.id,
          { in1: inputs.in1, in2: inputs.in2 },
          isStream,
        );
      }
    } catch (err) {
      console.error(`Error in node ${node.id}:`, err);
      if (node.type === "outputText")
        this.setDisplayData(node.id, `Error: ${err.message}`, false);
      this.hooks.onError(nodeId, err.message);
      this.setRunStatus("ERROR");
    } finally {
      this.hooks.onNodeEnd(nodeId);
    }
  }

  stop() {
    this.isRunning = false;
  }
}

// --- GLOBAL CONTEXT ---
const RuntimeContext = createContext(null);

// --- UI COMPONENTS ---

const LabeledHandle = ({
  nodeId,
  id,
  type,
  label,
  position,
  offsetY,
  isNodeSelected,
}) => {
  const { globalEdges, hoveredEdgeId } = useContext(RuntimeContext);
  const isLeft = position === Position.Left;

  const isEdgeHighlighted = globalEdges.some(
    (e) =>
      (e.selected || e.id === hoveredEdgeId) &&
      ((type === "source" && e.source === nodeId && e.sourceHandle === id) ||
        (type === "target" && e.target === nodeId && e.targetHandle === id)),
  );

  const showLabel = isNodeSelected || isEdgeHighlighted;

  return (
    <Handle
      type={type}
      position={position}
      id={id}
      className={`custom-handle !bg-[#00e5ff] !border-0 !shadow-[0_0_8px_#00e5ff] transition-transform !z-20 group/handle cursor-crosshair`}
      style={{ top: offsetY }}
    >
      <div
        className={`absolute top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-1.5 z-50 transition-opacity duration-200 
        ${showLabel ? "opacity-100" : "opacity-0 group-hover/handle:opacity-100 group-hover:opacity-100"} 
        ${isLeft ? "right-full mr-2 flex-row-reverse" : "left-full ml-2 flex-row"}`}
      >
        <span className="text-[9px] font-mono font-bold text-[#00e5ff] tracking-widest whitespace-nowrap bg-[#0b0e14] border border-[#1f2630] px-2 py-1 rounded shadow-[0_4px_12px_rgba(0,0,0,0.8)]">
          {label}
        </span>
      </div>
    </Handle>
  );
};

const BaseNode = ({ id, type, data, children, selected }) => {
  const {
    computingNodes,
    nodeErrors,
    setInfoNodeId,
    deleteNode,
    setCurrentView,
    globalNodes,
  } = useContext(RuntimeContext);
  const { zoom } = useViewport();

  const isZoomedOut = zoom < 0.8;
  const dims = NODE_DIMENSIONS[type];
  const node = { id, type, data };
  const handles = getNodeHandles(node, globalNodes);

  const isComputing =
    computingNodes.has(id) ||
    (type === "macroNode" &&
      globalNodes.some((n) => n.macroId === id && computingNodes.has(n.id)));
  const isError = !!nodeErrors[id];
  const isMacro = type === "macroNode";
  const isImageNode = type === "inputImage" || type === "outputImage";

  let dynamicHeight = dims.h;
  if (type === "customScript") {
    const inputCount = (data.inputs || ["in1", "in2", "in3", "in4"]).length;
    dynamicHeight = Math.max(dims.h, 60 + inputCount * 35 + 30);
  }

  return (
    <div
      className={`relative bg-[#131820]/95 backdrop-blur-md border transition-all duration-300 rounded-xl flex flex-col z-10 group
        ${
          isError
            ? "border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)]"
            : isComputing
              ? "computing-node shadow-[0_0_25px_rgba(0,255,170,0.4)]"
              : selected
                ? "border-[#00e5ff] shadow-[0_0_20px_rgba(0,229,255,0.15)]"
                : isMacro
                  ? "border-[#00e5ff]/30 shadow-[0_0_15px_rgba(0,229,255,0.1)] hover:border-[#3f4b59]"
                  : "border-[#2a323d] shadow-xl hover:border-[#3f4b59]"
        }`}
      style={{
        width: dims.w,
        minHeight: dynamicHeight,
        height: isImageNode ? "auto" : dynamicHeight,
      }}
    >
      <NodeToolbar position={Position.Top} offset={10} className="flex gap-2">
        <button
          onClick={() => setInfoNodeId(id)}
          className="bg-[#1f2630] border border-[#2a323d] text-[#00e5ff] px-2 py-1.5 rounded-md text-[10px] font-bold tracking-wider hover:bg-[#00e5ff] hover:text-[#0b0e14] hover:cursor-pointer transition-colors shadow-lg flex items-center justify-center gap-1.5 min-w-[32px]"
          title="Node Info & Rename"
        >
          <span className="text-sm leading-none mt-[-2px]">ℹ</span>{" "}
          {!isZoomedOut && <span>INFO</span>}
        </button>

        {isMacro && (
          <button
            onClick={() => setCurrentView(id)}
            className="bg-[#1f2630] border border-[#2a323d] text-[#00ffaa] px-2 py-1.5 rounded-md text-[10px] font-bold tracking-wider hover:bg-[#00ffaa] hover:text-[#0b0e14] hover:cursor-pointer transition-colors shadow-lg flex items-center justify-center gap-1.5 min-w-[32px]"
          >
            <span className="text-xs text-center leading-none mt-[-2px]">
              ⤤
            </span>{" "}
            {!isZoomedOut && <span>OPEN</span>}
          </button>
        )}

        <button
          onClick={() => deleteNode(id)}
          className="bg-[#1f2630] border border-[#2a323d] text-red-500 px-2 py-1.5 rounded-md text-[10px] font-bold tracking-wider hover:bg-red-500 hover:text-white hover:cursor-pointer transition-colors shadow-lg flex items-center justify-center gap-1.5 min-w-[32px]"
        >
          <span className="text-xs">✕</span>{" "}
          {!isZoomedOut && <span>DELETE</span>}
        </button>
      </NodeToolbar>

      {handles.targets.map((h) => (
        <LabeledHandle
          key={`t-${h.id}`}
          id={h.id}
          nodeId={id}
          type="target"
          label={h.label}
          position={Position.Left}
          offsetY={h.offsetY}
          isNodeSelected={selected}
        />
      ))}
      {handles.sources.map((h) => (
        <LabeledHandle
          key={`s-${h.id}`}
          id={h.id}
          nodeId={id}
          type="source"
          label={h.label}
          position={Position.Right}
          offsetY={h.offsetY}
          isNodeSelected={selected}
        />
      ))}

      <div className="w-full h-8 bg-[#0b0e14]/50 border-b border-[#1f2630] flex items-center px-3 justify-between rounded-t-xl custom-drag-handle">
        <span
          className={`text-[10px] font-bold tracking-widest uppercase ${isComputing || isMacro ? "text-[#00e5ff]" : "text-white"}`}
        >
          {data.label || dims.title}
        </span>
        <span className="text-[8px] text-[#5a6b7c] font-mono pointer-events-none">
          {dims.sub}
        </span>
      </div>

      <div className="p-3 flex-1 flex flex-col relative overflow-hidden nodrag">
        {children}
      </div>

      {isError && (
        <div className="absolute bottom-0 left-0 w-full bg-red-500 text-white text-[9px] font-bold p-1 z-50 text-center shadow-lg truncate rounded-b-xl">
          ERROR: {nodeErrors[id]}
        </div>
      )}
    </div>
  );
};

// --- REACT FLOW NODE IMPLEMENTATIONS ---

const InputTextNode = (props) => {
  const { updateNodeData } = useContext(RuntimeContext);
  return (
    <BaseNode {...props}>
      <textarea
        className="nowheel nodrag flex-1 w-full bg-[#0b0e14]/60 border border-[#1f2630] rounded p-2 text-xs font-mono text-white focus:outline-none focus:border-[#00e5ff] resize-none custom-scrollbar"
        value={props.data.value}
        onChange={(e) => updateNodeData(props.id, "value", e.target.value)}
      />
    </BaseNode>
  );
};

const InputImageNode = (props) => {
  const { updateNodeData, setFullscreenImage } = useContext(RuntimeContext);
  return (
    <BaseNode {...props}>
      <div
        className={`flex-1 w-full flex flex-col items-center justify-center border border-dashed border-[#1f2630] rounded bg-[#0b0e14]/60 transition-colors ${props.data.value ? "min-h-[140px] border-none" : "cursor-pointer hover:border-[#00e5ff]"}`}
      >
        {!props.data.value ? (
          <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
            <span className="text-[10px] text-[#5a6b7c]">CLICK UPLOAD</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files[0]) {
                  const r = new FileReader();
                  r.onload = (ev) =>
                    updateNodeData(props.id, "value", ev.target.result);
                  r.readAsDataURL(e.target.files[0]);
                }
              }}
            />
          </label>
        ) : (
          <div className="relative w-full h-full flex flex-col items-center justify-center group/img">
            <img
              src={props.data.value}
              alt="Input"
              className="w-full h-full object-contain max-h-[300px] cursor-zoom-in"
              onClick={() => setFullscreenImage(props.data.value)}
            />
            <button
              onClick={() => updateNodeData(props.id, "value", "")}
              className="absolute top-2 right-2 bg-[#0b0e14]/90 text-white border border-[#2a323d] rounded px-3 py-1.5 text-[9px] font-bold opacity-0 group-hover/img:opacity-100 hover:bg-red-500 transition-all shadow-lg"
            >
              CLEAR
            </button>
          </div>
        )}
      </div>
    </BaseNode>
  );
};

const CustomScriptNode = (props) => {
  const { updateNodeData, removeEdgeByHandle } = useContext(RuntimeContext);
  const updateNodeInternals = useUpdateNodeInternals();
  const inputsList = props.data.inputs || ["in1", "in2", "in3", "in4"];

  useEffect(() => {
    updateNodeInternals(props.id);
  }, [inputsList.length, props.id, updateNodeInternals]);

  const handleAddInput = () =>
    updateNodeData(props.id, "inputs", [
      ...inputsList,
      "in" + (inputsList.length + 1),
    ]);
  const handleRemoveInput = () => {
    if (inputsList.length > 0) {
      removeEdgeByHandle(props.id, inputsList[inputsList.length - 1]);
      updateNodeData(props.id, "inputs", inputsList.slice(0, -1));
    }
  };

  return (
    <BaseNode {...props}>
      <div className="flex justify-between items-center mb-2 px-1">
        <span className="text-[10px] text-[#5a6b7c] font-bold tracking-widest">
          PORTS ({inputsList.length})
        </span>
        <div className="flex gap-1">
          <button
            onClick={handleAddInput}
            className="w-5 h-5 flex items-center justify-center bg-[#1f2630] rounded text-[#00e5ff] hover:bg-[#00e5ff] hover:text-[#0b0e14] transition-colors text-[10px] font-bold"
          >
            +
          </button>
          <button
            onClick={handleRemoveInput}
            className="w-5 h-5 flex items-center justify-center bg-[#1f2630] rounded text-red-500 hover:bg-red-500 hover:text-white transition-colors text-[10px] font-bold"
          >
            -
          </button>
        </div>
      </div>
      <textarea
        className="nowheel nodrag w-full flex-1 bg-[#0b0e14]/60 border border-[#1f2630] rounded p-2 text-xs font-mono text-white focus:outline-none focus:border-[#00e5ff] resize-none custom-scrollbar"
        value={props.data.script}
        onChange={(e) => updateNodeData(props.id, "script", e.target.value)}
      />
    </BaseNode>
  );
};

const HttpRequestNode = (props) => (
  <BaseNode {...props}>
    <div className="w-full h-full flex items-center justify-center text-[#5a6b7c]">
      <span className="text-xs font-mono opacity-50 text-white">
        FETCH ENGINE
      </span>
    </div>
  </BaseNode>
);

const JsonPathNode = (props) => {
  const { updateNodeData } = useContext(RuntimeContext);
  return (
    <BaseNode {...props}>
      <div className="flex flex-col w-full h-full justify-center">
        <label className="text-[10px] text-[#5a6b7c] mb-1">SELECTOR PATH</label>
        <input
          className="w-full bg-[#0b0e14]/60 border border-[#1f2630] rounded p-2 text-xs font-mono text-white focus:outline-none focus:border-[#00e5ff]"
          value={props.data.path}
          onChange={(e) => updateNodeData(props.id, "path", e.target.value)}
        />
      </div>
    </BaseNode>
  );
};

const OutputTextNode = (props) => {
  const { displayData } = useContext(RuntimeContext);
  return (
    <BaseNode {...props}>
      <div className="nowheel nodrag flex-1 w-full bg-[#0b0e14]/60 border border-[#1f2630] rounded p-2 text-xs font-mono text-white overflow-y-auto whitespace-pre-wrap custom-scrollbar">
        {displayData[props.id] || (
          <span className="opacity-30">Waiting for data...</span>
        )}
      </div>
    </BaseNode>
  );
};

const ImageCompareSlider = ({ img1, img2, isFullscreen = false }) => {
  const [sliderPos, setSliderPos] = useState(50);
  const hasBoth = img1 && img2;
  const singleImg = img2 || img1;

  return (
    <div
      className={`w-full h-full overflow-hidden group/slider nodrag nowheel ${isFullscreen ? "max-h-[85vh] relative flex items-center justify-center" : "absolute inset-0"}`}
    >
      {singleImg && (
        <img
          src={singleImg}
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
          alt="Base"
        />
      )}
      {hasBoth && (
        <div
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
          style={{
            clipPath: `polygon(0 0, ${sliderPos}% 0, ${sliderPos}% 100%, 0 100%)`,
          }}
        >
          <img
            src={img1}
            className="absolute inset-0 w-full h-full object-contain pointer-events-none"
            alt="Overlay"
          />
        </div>
      )}
      {hasBoth && (
        <>
          <input
            type="range"
            min="0"
            max="100"
            value={sliderPos}
            onChange={(e) => setSliderPos(e.target.value)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20 m-0 nodrag nowheel"
          />
          <div
            className="absolute top-0 bottom-0 w-[2px] bg-[#00e5ff] pointer-events-none flex items-center justify-center z-10 shadow-[0_0_8px_#00e5ff]"
            style={{ left: `${sliderPos}%`, transform: "translateX(-50%)" }}
          >
            <div className="w-6 h-6 bg-[#131820] border-2 border-[#00e5ff] rounded-full flex items-center justify-center shadow-[0_0_10px_#00e5ff]">
              <span className="text-[8px] text-[#00e5ff] font-bold tracking-tighter">
                ◄►
              </span>
            </div>
          </div>
          <div className="absolute top-3 left-3 bg-[#0b0e14]/90 text-[#00e5ff] text-[10px] font-bold px-2 py-1 rounded border border-[#1f2630] opacity-0 group-hover/slider:opacity-100 transition-opacity z-10 pointer-events-none">
            IN 1
          </div>
          <div className="absolute top-3 right-3 bg-[#0b0e14]/90 text-[#00ffaa] text-[10px] font-bold px-2 py-1 rounded border border-[#1f2630] opacity-0 group-hover/slider:opacity-100 transition-opacity z-10 pointer-events-none">
            IN 2
          </div>
        </>
      )}
    </div>
  );
};

const OutputImageNode = (props) => {
  const { displayData, setFullscreenImage } = useContext(RuntimeContext);
  const data = displayData[props.id];
  const hasIn1 = !!data?.in1;
  const hasIn2 = !!data?.in2;

  return (
    <BaseNode {...props}>
      <div
        className={`relative flex-1 w-full bg-[#0b0e14]/60 border border-[#1f2630] rounded overflow-hidden nodrag nowheel ${hasIn1 || hasIn2 ? "min-h-[180px]" : "flex items-center justify-center"}`}
      >
        {hasIn1 || hasIn2 ? (
          <>
            <ImageCompareSlider img1={data.in1} img2={data.in2} />
            <button
              onClick={(e) => {
                e.stopPropagation();
                setFullscreenImage(data);
              }}
              className="absolute bottom-2 right-2 bg-[#0b0e14]/90 text-white border border-[#2a323d] rounded p-1.5 opacity-0 group-hover:opacity-100 hover:text-[#00e5ff] hover:border-[#00e5ff] transition-all shadow-lg z-30 nodrag"
              title="Fullscreen"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                />
              </svg>
            </button>
          </>
        ) : (
          <span className="opacity-30 text-xs font-mono text-white pointer-events-none">
            No Image
          </span>
        )}
      </div>
    </BaseNode>
  );
};

const MacroNode = (props) => {
  const updateNodeInternals = useUpdateNodeInternals();
  const { updateNodeData, globalNodes } = useContext(RuntimeContext);
  const paramNodes = globalNodes.filter(
    (n) => n.macroId === props.id && n.type === "macroInParam",
  );

  useEffect(() => {
    updateNodeInternals(props.id);
  }, [paramNodes.length, props.id, updateNodeInternals]);

  return (
    <BaseNode {...props}>
      <div className="nowheel nodrag flex flex-col w-full h-full p-2 gap-3 overflow-y-auto custom-scrollbar">
        {paramNodes.map((pNode) => (
          <div key={pNode.id} className="flex flex-col gap-1">
            <label className="text-[10px] text-[#5a6b7c] uppercase font-bold tracking-widest">
              {pNode.data.param}
            </label>
            <input
              className="nowheel nodrag w-full bg-[#0b0e14]/60 border border-[#1f2630] rounded p-2 text-xs font-mono text-white focus:outline-none focus:border-[#00e5ff]"
              value={props.data[pNode.data.param] || ""}
              onChange={(e) =>
                updateNodeData(props.id, pNode.data.param, e.target.value)
              }
              type={
                pNode.data.param.toLowerCase().includes("key")
                  ? "password"
                  : "text"
              }
              placeholder="Enter value"
              autoComplete="off"
            />
          </div>
        ))}
        {paramNodes.length === 0 && (
          <div className="m-auto flex flex-col items-center opacity-60 text-[#e5e7eb] pointer-events-none">
            <span className="text-xs font-mono">DOUBLE CLICK</span>
            <span className="text-[10px] font-mono">TO ENTER</span>
          </div>
        )}
      </div>
    </BaseNode>
  );
};

const MacroPortNode = (props) => {
  const { updateNodeData } = useContext(RuntimeContext);
  return (
    <BaseNode {...props}>
      <div className="flex flex-col w-full h-full justify-center">
        <label className="text-[10px] text-[#5a6b7c] mb-1">PORT NAME</label>
        <input
          className="nowheel nodrag w-full bg-[#0b0e14]/60 border border-[#1f2630] rounded px-2 py-1 text-xs font-mono text-white focus:outline-none focus:border-[#00e5ff]"
          value={props.data.param}
          onChange={(e) => updateNodeData(props.id, "param", e.target.value)}
        />
      </div>
    </BaseNode>
  );
};

const MacroConnectionsNode = (props) => (
  <BaseNode {...props}>
    <div className="flex flex-col w-full h-full items-center justify-center text-[#5a6b7c] text-center">
      <span className="text-[10px] font-mono opacity-80 text-white">
        TRACKS EXTERNAL CONNECTIONS
      </span>
    </div>
  </BaseNode>
);

const nodeTypes = {
  inputText: InputTextNode,
  inputImage: InputImageNode,
  customScript: CustomScriptNode,
  httpRequest: HttpRequestNode,
  jsonPath: JsonPathNode,
  outputText: OutputTextNode,
  outputImage: OutputImageNode,
  macroNode: MacroNode,
  macroInEdge: MacroPortNode,
  macroInParam: MacroPortNode,
  macroOutput: MacroPortNode,
  macroConnections: MacroConnectionsNode,
};

// --- CUSTOM EDGE ---
const CustomAnimatedEdge = (props) => {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style,
    selected,
  } = props;
  const { activeEdges, setHoveredEdgeId } = useContext(RuntimeContext);
  const reactFlowInstance = useReactFlow();

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });
  const isEdgeActive = activeEdges.has(id);
  const activeData = activeEdges.get(id);

  const isHighlighted = isEdgeActive || selected;

  return (
    <g
      className={`react-flow__edge group cursor-pointer`}
      onMouseEnter={() => {
        setHoveredEdgeId(id);
      }}
      onMouseLeave={() => {
        setHoveredEdgeId(null);
      }}
    >
      {/* Invisible bounding path for better hovering */}
      <path
        d={edgePath}
        fill="none"
        strokeOpacity={0}
        strokeWidth={20}
        className="pointer-events-auto cursor-pointer"
      />

      <BaseEdge
        path={edgePath}
        style={{
          ...style,
          strokeWidth: isHighlighted ? 3 : 2,
          stroke: isHighlighted ? "#00e5ff" : "#2a323d",
          transition: "stroke 0.3s",
        }}
        className={
          isEdgeActive
            ? "edge-dashed-animate !stroke-[#00e5ff]"
            : selected
              ? "!stroke-[#00e5ff]"
              : "!stroke-[#2a323d] group-hover:!stroke-[#00e5ff] pointer-events-none"
        }
      />

      <EdgeToolbar edgeId={id} x={labelX} y={labelY}>
        <button
          onClick={() => reactFlowInstance.deleteElements({ edges: [{ id }] })}
          className="bg-[#1f2630] text-red-500 px-1.5 py-0.5 rounded-md text-[10px] font-bold tracking-wider hover:bg-red-500 hover:text-white transition-colors shadow-lg"
        >
          ✕
        </button>
      </EdgeToolbar>

      {isEdgeActive && (
        <circle
          key={activeData.ts}
          r="5"
          fill="#00e5ff"
          filter="drop-shadow(0 0 5px #00e5ff)"
        >
          <animateMotion
            dur="0.6s"
            repeatCount="1"
            path={edgePath}
            fill="freeze"
          />
        </circle>
      )}
    </g>
  );
};

const edgeTypes = { default: CustomAnimatedEdge };

// --- INFO MODAL UI ---
const InfoModal = ({ nodeId, onClose }) => {
  const { globalNodes, updateNodeData } = useContext(RuntimeContext);
  const node = globalNodes.find((n) => n.id === nodeId);
  if (!node) return null;

  const typeInfo = NODE_INFO[node.type] || {
    desc: "Custom node.",
    in: "Unknown",
    out: "Unknown",
  };
  const [editingField, setEditingField] = useState(null);
  const [tempData, setTempData] = useState({
    label: node.data.label || "",
    description: node.data.description || "",
  });

  const handleSave = (field) => {
    updateNodeData(nodeId, field, tempData[field]);
    setEditingField(null);
  };

  return (
    <div
      className="fixed inset-0 z-[110] bg-[#0b0e14]/80 backdrop-blur-sm flex items-center justify-center p-8"
      onClick={onClose}
    >
      <div
        className="bg-[#131820] border border-[#2a323d] rounded-xl p-6 shadow-2xl w-[400px] flex flex-col gap-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header / Title */}
        <div className="border-b border-[#1f2630] pb-3">
          <span className="text-[#00e5ff] text-[10px] font-bold tracking-widest uppercase block mb-1">
            {NODE_DIMENSIONS[node.type]?.title || "Node Info"}
          </span>
          {editingField === "label" ? (
            <input
              autoFocus
              className="nowheel nodrag w-full bg-[#0b0e14] border border-[#00e5ff] rounded p-2 text-sm font-bold text-white focus:outline-none"
              value={tempData.label}
              onChange={(e) =>
                setTempData({ ...tempData, label: e.target.value })
              }
              onBlur={() => handleSave("label")}
              onKeyDown={(e) => e.key === "Enter" && handleSave("label")}
            />
          ) : (
            <h2
              className="text-white text-lg font-bold cursor-text hover:text-[#00e5ff] transition-colors group relative"
              onClick={() => setEditingField("label")}
            >
              {node.data.label || "Unnamed Node"}
              <span className="opacity-0 group-hover:opacity-100 text-[#5a6b7c] ml-2 text-xs absolute top-1">
                ✎ Edit Name
              </span>
            </h2>
          )}
        </div>

        {/* Description Field */}
        <div>
          <label className="text-[10px] text-[#5a6b7c] font-bold tracking-widest uppercase mb-2 block">
            Description
          </label>
          {editingField === "description" ? (
            <textarea
              autoFocus
              className="nowheel nodrag w-full bg-[#0b0e14] border border-[#00e5ff] rounded p-2 text-xs font-mono text-white focus:outline-none resize-none custom-scrollbar"
              rows={4}
              value={tempData.description}
              onChange={(e) =>
                setTempData({ ...tempData, description: e.target.value })
              }
              onBlur={() => handleSave("description")}
            />
          ) : (
            <p
              className="text-sm text-[#a0aec0] bg-[#0b0e14]/50 border border-[#1f2630] p-3 rounded-lg cursor-text hover:border-[#00e5ff] hover:bg-[#0b0e14] transition-colors relative group"
              onClick={() => setEditingField("description")}
            >
              {node.data.description || typeInfo.desc}
              <span className="opacity-0 group-hover:opacity-100 text-[#00e5ff] absolute top-2 right-2 text-xs bg-[#131820] px-1 rounded shadow">
                ✎ Edit
              </span>
            </p>
          )}
        </div>

        {/* Technical Specs */}
        <div className="grid grid-cols-2 gap-4 bg-[#0b0e14] p-3 rounded border border-[#1f2630]">
          <div>
            <span className="text-[10px] text-[#5a6b7c] font-bold tracking-widest uppercase block mb-1">
              Expects (IN)
            </span>
            <span className="text-xs text-[#00ffaa] font-mono">
              {typeInfo.in}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-[#5a6b7c] font-bold tracking-widest uppercase block mb-1">
              Yields (OUT)
            </span>
            <span className="text-xs text-[#00e5ff] font-mono">
              {typeInfo.out}
            </span>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            className="px-4 py-2 text-xs font-mono bg-[#00e5ff] text-[#0b0e14] font-bold rounded hover:bg-[#00ffaa] transition-colors shadow-lg"
            onClick={onClose}
          >
            DONE
          </button>
        </div>
      </div>
    </div>
  );
};

// --- MAIN REACT FLOW WRAPPER ---
function FlowEditor() {
  const [nodes, setNodes, onNodesChange] = useNodesState(defaultData.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(defaultData.edges);

  const [currentView, setCurrentView] = useState(null);
  const [displayData, setDisplayData] = useState({});
  const [runStatus, setRunStatus] = useState("IDLE");
  const [computingNodes, setComputingNodes] = useState(new Set());
  const [activeEdges, setActiveEdges] = useState(new Map());
  const [hoveredEdgeId, setHoveredEdgeId] = useState(null);
  const [nodeErrors, setNodeErrors] = useState({});

  const [infoNodeId, setInfoNodeId] = useState(null);
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);

  const runnerRef = useRef(null);
  const reactFlowInstance = useReactFlow();
  const fileInputRef = useRef(null);

  // Auto-save logic
  useEffect(() => {
    const timer = setTimeout(() => {
      const flow = {
        nodes,
        edges,
        viewport: reactFlowInstance
          ? reactFlowInstance.getViewport()
          : { x: 0, y: 0, zoom: 1 },
      };
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(flow));
    }, 1500); // Debounce save
    return () => clearTimeout(timer);
  }, [nodes, edges, reactFlowInstance]);

  const clearCache = () => {
    if (
      window.confirm(
        "Are you sure you want to clear the saved workflow and reload the defaults?",
      )
    ) {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      window.location.reload();
    }
  };

  // Breadcrumbs
  const breadcrumbs = [];
  let currId = currentView;
  while (currId) {
    const node = nodes.find((n) => n.id === currId);
    if (!node) break;
    breadcrumbs.unshift(node);
    currId = node.macroId;
  }

  const exportFlow = useCallback(() => {
    const flow = {
      nodes,
      edges,
      viewport: reactFlowInstance
        ? reactFlowInstance.getViewport()
        : { x: 0, y: 0, zoom: 1 },
    };
    const blob = new Blob([JSON.stringify(flow, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `dataflow-${Date.now()}.json`;
    link.click();
  }, [nodes, edges, reactFlowInstance]);

  const importFlow = useCallback(
    (event) => {
      const file = event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const flow = JSON.parse(e.target.result);
          if (flow && flow.nodes) {
            setNodes(flow.nodes);
            setEdges(flow.edges || []);
            setCurrentView(null);
            setTimeout(() => {
              if (flow.viewport) reactFlowInstance.setViewport(flow.viewport);
            }, 50);
          }
        } catch (err) {
          alert("Failed to parse JSON file.");
        }
      };
      reader.readAsText(file);
      event.target.value = null;
    },
    [setNodes, setEdges, reactFlowInstance],
  );

  const onNodesDelete = useCallback(
    (deleted) => {
      const childrenToDelete = reactFlowInstance
        .getNodes()
        .filter((n) => deleted.some((d) => n.macroId === d.id));
      if (childrenToDelete.length > 0)
        setTimeout(
          () => reactFlowInstance.deleteElements({ nodes: childrenToDelete }),
          0,
        );
    },
    [reactFlowInstance],
  );

  const updateNodeData = useCallback(
    (id, key, value) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, [key]: value } } : n,
        ),
      );
    },
    [setNodes],
  );

  const deleteNode = useCallback(
    (id) => {
      const nodesToDelete = reactFlowInstance
        .getNodes()
        .filter((n) => n.id === id || n.macroId === id);
      reactFlowInstance.deleteElements({ nodes: nodesToDelete });
    },
    [reactFlowInstance],
  );

  const removeEdgeByHandle = useCallback(
    (nodeId, handleId) => {
      const edgesToDelete = reactFlowInstance
        .getEdges()
        .filter(
          (e) =>
            (e.source === nodeId && e.sourceHandle === handleId) ||
            (e.target === nodeId && e.targetHandle === handleId),
        );
      reactFlowInstance.deleteElements({ edges: edgesToDelete });
    },
    [reactFlowInstance],
  );

  const handlePaneContextMenu = useCallback((event) => {
    event.preventDefault();
    setContextMenu({ x: event.clientX, y: event.clientY });
  }, []);

  const addNode = useCallback(
    (type) => {
      if (!contextMenu) return;
      const position = reactFlowInstance.screenToFlowPosition({
        x: contextMenu.x,
        y: contextMenu.y,
      });

      if (PREBUILT_MACROS[type]) {
        const { nodes: mNodes, edges: mEdges } = PREBUILT_MACROS[type].create(
          position,
          currentView,
        );
        setNodes((nds) => [...nds, ...mNodes]);
        setEdges((eds) => [...eds, ...mEdges]);
      } else {
        const newNode = {
          id: generateId("node"),
          type,
          position,
          macroId: currentView,
          data: {
            label: NODE_DIMENSIONS[type].title,
            value: "",
            path: "",
            param: "param",
            script: type === "customScript" ? "return in1;" : "",
            inputs: type === "customScript" ? ["in1", "in2"] : undefined,
          },
        };
        setNodes((nds) => [...nds, newNode]);
      }
      setContextMenu(null);
    },
    [contextMenu, currentView, reactFlowInstance, setNodes, setEdges],
  );

  const triggerEdge = useCallback((id) => {
    setActiveEdges((prev) => {
      const next = new Map(prev);
      if (next.has(id)) clearTimeout(next.get(id).timer);
      next.set(id, {
        ts: Date.now(),
        timer: setTimeout(
          () =>
            setActiveEdges((p) => {
              const n = new Map(p);
              n.delete(id);
              return n;
            }),
          600,
        ),
      });
      return next;
    });
  }, []);

  const handleDisplayDataUpdate = useCallback((nodeId, val, isStream) => {
    setDisplayData((prev) => ({
      ...prev,
      [nodeId]:
        isStream && typeof val === "string" ? (prev[nodeId] || "") + val : val,
    }));
  }, []);

  const runFlow = useCallback(() => {
    if (runnerRef.current) runnerRef.current.stop();
    setDisplayData({});
    setNodeErrors({});
    setComputingNodes(new Set());
    setActiveEdges(new Map());

    const runner = new GraphRunner(
      nodes,
      edges,
      handleDisplayDataUpdate,
      setRunStatus,
      {
        onNodeStart: (id) => setComputingNodes((prev) => new Set(prev).add(id)),
        onNodeEnd: (id) =>
          setComputingNodes((prev) => {
            const n = new Set(prev);
            n.delete(id);
            return n;
          }),
        onEdgeActive: triggerEdge,
        onError: (id, msg) => setNodeErrors((prev) => ({ ...prev, [id]: msg })),
      },
    );
    runnerRef.current = runner;
    runner.start();
  }, [nodes, edges, handleDisplayDataUpdate, triggerEdge]);

  const activeView = currentView || null;
  const visibleNodes = nodes.filter((n) => (n.macroId || null) === activeView);
  const visibleEdges = edges.filter((e) => {
    const sNode = nodes.find((n) => n.id === e.source);
    const tNode = nodes.find((n) => n.id === e.target);
    return (
      sNode &&
      tNode &&
      (sNode.macroId || null) === activeView &&
      (tNode.macroId || null) === activeView
    );
  });

  return (
    <RuntimeContext.Provider
      value={{
        globalNodes: nodes,
        globalEdges: edges,
        hoveredEdgeId,
        setHoveredEdgeId,
        updateNodeData,
        removeEdgeByHandle,
        displayData,
        computingNodes,
        nodeErrors,
        activeEdges,
        setInfoNodeId,
        deleteNode,
        setCurrentView,
        setFullscreenImage,
      }}
    >
      <div className="w-full h-screen flex flex-col bg-[#0b0e14] font-sans overflow-hidden select-none text-[#a0aec0]">
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=JetBrains+Mono:wght@400;700&display=swap');
          .font-sans { font-family: 'Inter', sans-serif; }
          .font-mono { font-family: 'JetBrains Mono', monospace; }
          .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #2a323d; border-radius: 3px; }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #3f4b59; }
          @keyframes borderPulse {
              0% { border-color: rgba(0, 255, 170, 0.4); box-shadow: 0 0 15px rgba(0, 255, 170, 0.2); }
              50% { border-color: rgba(0, 255, 170, 1); box-shadow: 0 0 30px rgba(0, 255, 170, 0.5); }
              100% { border-color: rgba(0, 255, 170, 0.4); box-shadow: 0 0 15px rgba(0, 255, 170, 0.2); }
          }
          .computing-node { animation: borderPulse 1.5s infinite; border-color: #00e5ff !important; }
          .react-flow__node { cursor: default; }
          .custom-drag-handle { cursor: grab; }
          .custom-drag-handle:active { cursor: grabbing; }
          @keyframes dashMove { from { stroke-dashoffset: 24; } to { stroke-dashoffset: 0; } }
          .edge-dashed-animate { stroke-dasharray: 12 12; animation: dashMove 0.5s linear infinite; }
          .custom-handle { width: 12px !important; height: 12px !important; transition: all 0.2s ease; }
          .custom-handle:hover { width: 18px !important; height: 18px !important; }
          .react-flow__attribution { display: none; }
        `}</style>

        {/* TOP BAR */}
        <div className="w-full bg-[#0b0e14]/90 backdrop-blur-md border-b border-[#1f2630] flex items-center px-6 py-3 z-30 shadow-[0_4px_20px_rgba(0,0,0,0.4)] text-xs font-mono tracking-widest justify-between relative">
          <div className="flex items-center gap-3 w-1/3">
            <div className="w-6 h-6 rounded bg-gradient-to-tr from-[#00e5ff] to-[#007acc] flex items-center justify-center shadow-[0_0_10px_rgba(0,229,255,0.4)]">
              <span className="text-[#0b0e14] font-bold text-[14px] leading-none mt-[1px]">
                R
              </span>
            </div>
            <span className="font-bold text-white text-sm tracking-widest drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]">
              RelaxUI
            </span>
          </div>

          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 bg-[#131820] border border-[#1f2630] px-4 py-1.5 rounded-full shadow-inner whitespace-nowrap overflow-hidden max-w-[40%] custom-scrollbar overflow-x-auto">
            <span
              className={`cursor-pointer transition-colors flex items-center gap-1.5 flex-shrink-0 ${!currentView ? "text-[#00e5ff] font-bold drop-shadow-[0_0_5px_rgba(0,229,255,0.5)]" : "text-[#5a6b7c] hover:text-white"}`}
              onClick={() => setCurrentView(null)}
            >
              <svg
                className="w-3.5 h-3.5 mb-[1px]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
              WORKFLOW
            </span>
            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              return (
                <div
                  key={crumb.id}
                  className="flex items-center gap-2 flex-shrink-0"
                >
                  <span className="text-[#2a323d] font-black text-sm">/</span>
                  <span
                    className={`cursor-pointer flex items-center gap-1.5 transition-colors ${isLast ? "text-[#00e5ff] font-bold drop-shadow-[0_0_5px_rgba(0,229,255,0.5)]" : "text-[#5a6b7c] hover:text-white"}`}
                    onClick={() => setCurrentView(crumb.id)}
                  >
                    <svg
                      className="w-3.5 h-3.5 mb-[1px]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                      />
                    </svg>
                    {crumb.data.label.toUpperCase()}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-3 w-2/5 justify-end">
            <button
              onClick={clearCache}
              className="px-2 py-1 text-[#5a6b7c] hover:text-red-500 transition-colors text-[9px] uppercase tracking-wider hidden md:block"
              title="Clear LocalStorage and Reset"
            >
              Clear Cache
            </button>
            <input
              type="file"
              accept=".json"
              ref={fileInputRef}
              className="hidden"
              onChange={importFlow}
            />
            <button
              onClick={() => fileInputRef.current.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1f2630] border border-[#2a323d] text-[#5a6b7c] hover:text-[#00e5ff] hover:border-[#00e5ff] rounded-md transition-all text-[10px] font-bold tracking-wider shadow-lg"
              title="Import JSON"
            >
              IMPORT
            </button>
            <button
              onClick={exportFlow}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1f2630] border border-[#2a323d] text-[#5a6b7c] hover:text-[#00e5ff] hover:border-[#00e5ff] rounded-md transition-all text-[10px] font-bold tracking-wider shadow-lg"
              title="Export JSON"
            >
              EXPORT
            </button>

            <button
              onClick={runFlow}
              disabled={runStatus.includes("RUNNING")}
              className={`group flex items-center gap-3 px-5 py-2 border rounded-full transition-all duration-300 shadow-lg select-none ml-2 ${runStatus.includes("RUNNING") ? "border-[#00e5ff]/30 bg-[#00e5ff]/10 text-[#00e5ff] cursor-wait" : "border-[#00e5ff] bg-transparent text-[#00e5ff] hover:bg-[#00e5ff] hover:text-[#0b0e14] hover:shadow-[0_0_15px_rgba(0,229,255,0.5)] cursor-pointer"}`}
            >
              <div
                className={`w-2 h-2 rounded-full flex-shrink-0 transition-colors ${runStatus.includes("RUNNING") ? "bg-[#00e5ff] animate-pulse shadow-[0_0_8px_#00e5ff]" : runStatus === "COMPLETED" ? "bg-[#00ffaa]" : runStatus === "ERROR" ? "bg-red-500" : "bg-current"}`}
              ></div>
              <b className="tracking-widest mt-[1px]">
                {runStatus.includes("RUNNING") ? "RUNNING..." : "RUN"}
              </b>
              {!runStatus.includes("RUNNING") && (
                <svg
                  className="w-3.5 h-3.5 ml-1 opacity-80 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* REACT FLOW CANVAS */}
        <div className="flex-1 relative">
          <ReactFlow
            nodes={visibleNodes}
            edges={visibleEdges}
            onNodesChange={(changes) =>
              setNodes((nds) => applyNodeChanges(changes, nds))
            }
            onEdgesChange={(changes) =>
              setEdges((eds) => applyEdgeChanges(changes, eds))
            }
            onNodesDelete={onNodesDelete}
            onConnect={(params) => setEdges((eds) => addEdge(params, eds))}
            onNodeDoubleClick={(event, node) =>
              node.type === "macroNode" && setCurrentView(node.id)
            }
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onPaneContextMenu={handlePaneContextMenu}
            onPaneClick={() => setContextMenu(null)}
            draghandleselector=".custom-drag-handle"
            minZoom={0.1}
            maxZoom={2}
            defaultViewport={{ x: 50, y: 50, zoom: 1 }}
          >
            <Background color="#1f2630" gap={40} />
            <Controls
              showInteractive={false}
              className="!bg-[#131820] !border !border-[#1f2630] !rounded-lg overflow-hidden shadow-[0_4px_15px_rgba(0,0,0,0.5)] [&>button]:!border-0 [&>button]:!border-b [&>button]:!border-solid [&>button]:!border-b-[#1f2630] [&>button]:!bg-transparent [&>button]:!fill-[#5a6b7c] [&>button]:transition-all [&>button]:duration-200 [&>button:hover]:!bg-[#1f2630] [&>button:hover]:!fill-[#00e5ff] [&>button:last-child]:!border-b-0"
            />
            <MiniMap
              nodeColor={(n) =>
                computingNodes.has(n.id)
                  ? "#00e5ff"
                  : n.type === "macroNode"
                    ? "#00e5ff"
                    : "#3f4b59"
              }
              maskColor="rgba(0, 0, 0, 0.7)"
              className="!bg-[#131820] !border !border-[#1f2630] !rounded-lg"
            />
          </ReactFlow>
        </div>

        {/* CONTEXT MENU */}
        {contextMenu && (
          <div
            className="fixed z-50 bg-[#131820] border border-[#2a323d] rounded-lg shadow-2xl py-2 w-48 font-mono text-xs text-white"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <div className="px-3 py-1 text-[10px] text-[#5a6b7c] uppercase mb-1 border-b border-[#1f2630]">
              Add Node
            </div>
            {Object.entries({
              "Pre-built Macros": Object.keys(PREBUILT_MACROS),
              Inputs: ["inputText", "inputImage"],
              Outputs: ["outputText", "outputImage"],
              "Logic & Data": ["customScript", "httpRequest", "jsonPath"],
              Macros: ["macroNode"],
              "Macro Internals": [
                "macroInEdge",
                "macroInParam",
                "macroOutput",
                "macroConnections",
              ],
            }).map(([groupName, types]) => {
              if (groupName === "Macro Internals" && !currentView) return null;
              return (
                <div
                  key={groupName}
                  className="relative group/menuitem px-4 py-2 hover:bg-[#1f2630] hover:text-[#00e5ff] cursor-pointer flex justify-between items-center"
                >
                  <span>{groupName}</span>
                  <span className="text-[10px] opacity-50">▶</span>
                  <div className="absolute left-full top-[-8px] ml-0 hidden group-hover/menuitem:flex flex-col bg-[#131820] border border-[#2a323d] rounded-lg shadow-2xl p-2 w-48 cursor-default z-[100]">
                    {types.map((type) => (
                      <div
                        key={type}
                        className="px-4 py-2 hover:bg-[#1f2630] hover:text-[#00e5ff] cursor-pointer text-white rounded-lg whitespace-nowrap"
                        onClick={(e) => {
                          e.stopPropagation();
                          addNode(type);
                        }}
                      >
                        {groupName === "Pre-built Macros"
                          ? PREBUILT_MACROS[type].label
                          : NODE_DIMENSIONS[type].title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* INFO MODAL */}
        {infoNodeId && (
          <InfoModal nodeId={infoNodeId} onClose={() => setInfoNodeId(null)} />
        )}

        {/* FULLSCREEN IMAGE MODAL */}
        {fullscreenImage && (
          <div
            className="fixed inset-0 z-[100] bg-[#0b0e14]/95 backdrop-blur-md flex items-center justify-center p-8"
            onClick={() => setFullscreenImage(null)}
          >
            <div
              className="relative w-full h-full max-w-6xl max-h-[85vh] flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              {typeof fullscreenImage === "object" ? (
                <ImageCompareSlider
                  img1={fullscreenImage.in1}
                  img2={fullscreenImage.in2}
                  isFullscreen={true}
                />
              ) : (
                <img
                  src={fullscreenImage}
                  alt="Fullscreen View"
                  className="max-w-full max-h-full object-contain drop-shadow-2xl"
                />
              )}
            </div>
            <div
              className="absolute top-6 right-8 text-[#5a6b7c] text-4xl hover:text-white transition-colors cursor-pointer"
              onClick={() => setFullscreenImage(null)}
            >
              ✕
            </div>
          </div>
        )}
      </div>
    </RuntimeContext.Provider>
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <FlowEditor />
    </ReactFlowProvider>
  );
}
