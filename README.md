# RelaxUI

**Browser-based visual node-graph editor for AI/ML inference with Transformers.js — no server required.**

<img src="src/assets/screenshot.png" alt="RelaxUI Screenshot">

## Quick Start

```bash
bun install          # Install dependencies
bun run dev          # Development server with hot reload (localhost:3000)
bun run build        # Production build to dist/
bun start            # Production server
```

## Architecture

```
src/
├── App.tsx                         ReactFlowProvider wrapper
├── frontend.tsx                    React root renderer
├── index.ts                        Bun HTTP server (dev + production)
├── index.html                      Single-page entry point
├── index.css                       CSS design tokens + Tailwind import
├── types.ts                        Shared TypeScript interfaces
├── config/
│   ├── defaults.ts                 Centralized runtime constants
│   ├── nodeDimensions.ts           Node size and title definitions
│   ├── nodeInfo.ts                 Node descriptions and I/O specs
│   ├── pipelineRegistry.ts         25 pipeline task definitions
│   ├── modelClassRegistry.ts       19 model class definitions
│   ├── generationDefaults.ts       Generation parameter schema
│   └── workflowRegistry.ts         64 ready-made workflow definitions
├── engine/
│   ├── GraphRunner.ts              Push-based graph execution with streaming
│   ├── nodeExecutors.ts            Per-type executor dispatch
│   └── transformersExecutor.ts     Transformers.js integration
├── context/
│   └── RuntimeContext.ts           React context for shared runtime state
├── hooks/
│   ├── useFlowState.ts             Node/edge CRUD, auto-save, breadcrumbs
│   ├── useGraphRunner.ts           Execution state, display data, timing
│   ├── useSettings.ts              Persistent settings via localStorage
│   ├── useUndoRedo.ts              History stack with configurable depth
│   ├── useCopyPaste.ts             Node copy/paste with macro support
│   ├── useKeyboardShortcuts.ts     Global keyboard handler
│   └── useMemory.ts                Workflow memory/state persistence
├── components/
│   ├── FlowEditor.tsx              Main orchestrator (hooks + canvas + modals)
│   ├── TopBar.tsx                  Header with breadcrumbs, file menu, actions
│   ├── ImportDialog.tsx            Import from file, URL, or built-in registry
│   ├── SettingsDialog.tsx          HF token, device, auto-save, undo, theme colors
│   ├── ContextMenu/               Right-click hierarchical node menu
│   ├── NodeMenuList.tsx            Searchable hierarchical node picker
│   ├── NodePickerPanel.tsx         Sidebar panel for adding nodes
│   ├── InfoModal.tsx               Node rename and info display
│   ├── FullscreenModal.tsx         Fullscreen image viewer
│   ├── ImageCompareSlider.tsx      Before/after image comparison
│   ├── LabeledHandle.tsx           Edge handle with hover label
│   ├── CustomAnimatedEdge.tsx      Animated edge with activity indicator
│   ├── ModelLoadingIndicator.tsx   Model download progress
│   ├── ModelSizeBadge.tsx          Color-coded model size badge
│   ├── DynamicParamEditor.tsx      Auto-generated parameter controls
│   ├── MemoryPicker.tsx            Memory/state picker UI
│   ├── NodeErrorBoundary.tsx       React error boundary for nodes
│   └── visualizations/            Rich output renderers (auto-detected)
├── nodes/
│   ├── BaseNode.tsx                Shared node chrome (header, resize, timing)
│   ├── registry.ts                 Node type and edge type registries
│   ├── core/                       27 core node components
│   └── transformers/               13 Transformers.js node components
├── macros/
│   ├── macroFactory.ts             Unified PREBUILT_MACROS export
│   ├── pipelineMacroFactory.ts     Auto-generates 25 pipeline macros
│   ├── modelClassMacroFactory.ts   Auto-generates 19 model class macros
│   ├── openRouter.ts              OpenRouter API macro
│   ├── falai.ts                   fal.ai API macro
│   ├── replicate.ts               Replicate API macro
│   └── wavespeed.ts               Wavespeed API macros (head swap + image edit)
└── utils/
    ├── generateId.ts               Unique ID generator (base32)
    ├── modelRegistry.ts            HuggingFace model size estimator + cache
    ├── nodeMenuItems.ts            Categorized node menu builder
    ├── dataUrl.ts                  Shared blob/URL → data URL conversion
    ├── validateWorkflow.ts         Workflow validation utilities
    └── blobNames.ts                Blob URL name utilities
```

## Key Concepts

### Execution Engine

The `GraphRunner` executes workflows using a push-based data flow model:

1. Scans edges to determine each node's expected inputs
2. Queues source nodes (no incoming edges) for execution
3. Executes nodes via type-specific executors; each node pushes output values through outgoing edges to downstream nodes
4. Downstream nodes execute once all expected inputs are received (with timer-based coalescing to batch near-simultaneous arrivals)
5. Tracks pending executions and sets COMPLETED/ERROR status when all branches finish
6. Supports streaming (immediate forwarding), batch iteration (pause/resume/stop/manual step), and approval gates (Review Node)
7. Rework cascades clear all downstream `receivedInputs` (including macro internals), cancel stale pending executions, re-execute upstream roots, and wait for the full cascade to settle via `waitForCascade()` — correctly handling async operations like HTTP requests and API polling
8. Special handling for macros (sub-graph redirection via macroInEdge/macroOutput) and HTTP SSE

### Node System

Nodes are React components registered in `nodes/registry.ts`. Each node type has:

- A component (rendering + user interaction)
- An executor in `engine/nodeExecutors.ts` (runtime logic)
- Dimensions in `config/nodeDimensions.ts`
- Handle definitions returned by `getNodeHandles()`

### Macros

Macros are reusable sub-workflows packaged as single nodes. Pre-built macros are generated from `pipelineRegistry.ts` and `modelClassRegistry.ts`. Users can also create custom macros via the MacroNode container. API macros (fal.ai, Wavespeed, Replicate, OpenRouter) expose only `key` and `model` as inline parameters — all other API options are passed via an `extra_params` edge input (connect a JSON node to override defaults).

### Settings

All settings persist to `localStorage` and are accessed via the `useSettings` hook (React) or `readSetting()` (non-React contexts like executors). Settings include: HF token, device preference, auto-save toggle/interval, undo history size, and interface theme colors.

## Node Types

### Core (28)

| Node             | Description                                                  |
| ---------------- | ------------------------------------------------------------ |
| Input Text       | Static string value                                          |
| Media Input      | Unified image/audio/video input with FILE/URL/MIC modes      |
| Folder Input     | Directory picker with auto-categorization by file type       |
| Universal Output | Adaptive display for any pipeline/model result with rich viz |
| Output Text      | Readonly text display with copy support                      |
| Output Image     | Image display with before/after compare slider               |
| Audio Output     | Audio playback with download                                 |
| Download Data    | Multi-format export (JSON/CSV/TXT/ZIP/media)                 |
| Text Template    | Interpolate `{{var}}` placeholders with connected inputs     |
| String Ops       | Split, join, replace, uppercase, lowercase, trim, slice, regex extract, length |
| Merge            | Combine inputs into object, array, or flattened array        |
| Switch           | Route data to TRUE or FALSE output based on value/truthy/contains/regex |
| Custom Script    | Execute JavaScript with dynamic I/O ports                    |
| HTTP Request     | Fetch API with SSE streaming                                 |
| JSON Path        | Extract values via dot notation                              |
| Image Process    | Aspect ratio, resolution, crop, format, quality, round-to-8, size match |
| Converter        | Format conversion (data URI, blob URL, text, JSON)           |
| Poll Until       | Poll a URL until a condition is met (queue-based APIs)       |
| Macro Node       | Container for nested sub-workflows                           |
| Batch Iterator   | Iterate arrays with progress, pause/resume/stop, manual step with Next/Rework |
| Counter          | Auto-incrementing counter with prefix/suffix formatting      |
| Delay            | Pause execution for N milliseconds                           |
| List Aggregator  | Collect streamed items into a single array                   |
| Review Node      | Manual approval gate with Approve/Rework/Cancel              |
| Comment          | Non-executing annotation node for documenting workflows      |
| Chat Display     | Chat-style message view with left/right sides and streaming  |
| Video Input      | Video data from file upload or URL                           |

Plus 5 macro-internal node types (Macro In Edge, Macro In Param, Macro In Settings, Macro Out, Macro Connections) visible only inside macro containers.

### Transformers.js (13)

| Node             | Description                                        |
| ---------------- | -------------------------------------------------- |
| Pipeline         | High-level `pipeline()` API for any supported task |
| Model Loader     | Load any Auto or named model class                 |
| Companion Loader | Load AutoTokenizer or AutoProcessor                |
| Generate         | `model.generate()` with TextStreamer               |
| Model Call       | Forward pass for non-generative models             |
| Post-Process     | Category-aware output post-processing              |
| Tokenizer Encode | Text to token tensors                              |
| Tokenizer Decode | Token IDs to text                                  |
| Processor        | Multimodal input processing                        |
| Chat Template    | Format messages for chat models                    |
| Env Config       | Configure environment (logging, cache)             |
| Gen Config       | Build generation parameter objects                 |

## Visualizations

The Universal Output node auto-detects data shape and renders the appropriate visualization:

| Type               | Used By                              | Renders                          |
| ------------------ | ------------------------------------ | -------------------------------- |
| Bar Chart          | Classification, fill-mask, zero-shot | Horizontal confidence bars       |
| Highlighted Text   | Token classification (NER)           | Colored entity spans with legend |
| Highlighted Answer | Question answering                   | Answer span in context           |
| Side-by-Side       | Summarization, translation           | Original vs. result columns      |
| Bounding Boxes     | Object detection                     | Canvas-drawn boxes on image      |
| Segmentation       | Image segmentation                   | Segment labels with color legend |
| Tensor Info        | Feature extraction                   | Shape, dtype, sample values      |
| Transcript         | Speech recognition                   | Timestamped segments             |
| Image Caption      | Image-to-text                        | Thumbnail with generated caption |
| Image Compare      | Depth estimation, background removal | Before/after slider              |

## Workflow Registry

**IMPORT > REGISTRY** provides 64 ready-made workflows organized by category:

- **Pipeline workflows (29)** — NLP, Vision, Audio, and Multimodal tasks with default models and sample data
- **Batch processing (3)** — Folder input with progress tracking (image captioning, text classification, background removal)
- **Model class workflows (19)** — Multi-node workflows using individual Transformers.js nodes (generate-mode or call-mode)
- **API workflows (5)** — fal.ai, Wavespeed, and Replicate integrations
- **New node demos (5)** — Showcases for Text Template, Switch, Merge, String Ops, and Counter nodes
- **Pipeline chains (2)** — Multi-step pipelines combining different tasks
- **Additional workflows (1)** — Standalone specialized workflows

Model sizes are shown with color-coded badges (green < 100 MB, yellow < 500 MB, red > 500 MB).

## Configuration

### Generation Parameters

Configurable through Generate and Generation Config nodes:

| Parameter              | Default | Range   |
| ---------------------- | ------- | ------- |
| `max_new_tokens`       | 128     | 1–4096  |
| `temperature`          | 1.0     | 0.0–2.0 |
| `top_p`                | 1.0     | 0.0–1.0 |
| `top_k`                | 50      | 0–500   |
| `do_sample`            | false   | —       |
| `min_p`                | 0.0     | 0.0–1.0 |
| `repetition_penalty`   | 1.0     | 1.0–2.0 |
| `presence_penalty`     | 0.0     | 0.0–2.0 |
| `no_repeat_ngram_size` | 0       | 0–10    |

Adding a new parameter is registry-driven — add an entry to `src/config/generationDefaults.ts` and the UI auto-generates the control.

### Device & Quantization

| Option       | Values                              | Description                                                                    |
| ------------ | ----------------------------------- | ------------------------------------------------------------------------------ |
| `device`     | `auto`, `webgpu`, `wasm`            | Hardware backend (auto-detects WebGPU with WASM fallback)                      |
| `dtype`      | `fp32`, `fp16`, `q8`, `q4`, `q4f16` | Quantization precision                                                         |
| Custom dtype | JSON object                         | Per-module quantization (e.g. `{"embed_tokens":"q4","vision_encoder":"fp16"}`) |

### Design Tokens

Colors are CSS custom properties in `src/index.css`. The main interface colors (background, surface, border, accent) can be customized in **Settings > Interface Colors** — changes persist to `localStorage` and apply immediately. The defaults:

```css
:root {
  --relax-bg-primary: #0b0e14;
  --relax-bg-elevated: #131820;
  --relax-border: #1f2630;
  --relax-border-hover: #2a323d;
  --relax-accent: #00ff78;
  --relax-accent-gradient: linear-gradient(to top right, #00ff78, #007acc);
}
```

## Keyboard Shortcuts

| Shortcut        | Action                 |
| --------------- | ---------------------- |
| Ctrl+Z          | Undo                   |
| Ctrl+Shift+Z    | Redo                   |
| Ctrl+C / Ctrl+V | Copy / Paste nodes     |
| Ctrl+S          | Export workflow        |
| Ctrl+Enter      | Run workflow           |
| Delete          | Delete selected nodes  |
| Escape          | Close modals and menus |

## Testing

```bash
bun run test:sizes     # Check default model sizes (flags > 1 GB)
bun run test:models    # Full integration test (download + inference)
```

Integration tests cover all 19 model classes with real model downloads, forward pass verification, and generate + decode verification.

## Tech Stack

| Technology                                                               | Version      | Purpose                      |
| ------------------------------------------------------------------------ | ------------ | ---------------------------- |
| [Bun](https://bun.sh)                                                    | 1.3+         | Runtime, bundler, dev server |
| [React](https://react.dev)                                               | 19           | UI framework                 |
| [@xyflow/react](https://reactflow.dev)                                   | 12.10        | Node graph editor            |
| [@huggingface/transformers](https://huggingface.co/docs/transformers.js) | 4.0.0-next.6 | In-browser ML inference      |
| [Tailwind CSS](https://tailwindcss.com)                                  | 4.2          | Utility-first styling        |
| [JSZip](https://stuk.github.io/jszip/)                                   | 3.10         | ZIP file generation          |

## Security Considerations

The **Custom Script** node executes arbitrary JavaScript via `AsyncFunction`. Scripts run in the page context with full access to the DOM, `localStorage`, and network APIs. Only run workflows from sources you trust.

## License

MIT
