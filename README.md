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
│   ├── pipelineRegistry.ts         22 pipeline task definitions
│   ├── modelClassRegistry.ts       19 model class definitions
│   ├── generationDefaults.ts       Generation parameter schema
│   └── workflowRegistry.ts         50 ready-made workflow definitions
├── engine/
│   ├── GraphRunner.ts              Topological graph execution with streaming
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
│   └── useKeyboardShortcuts.ts     Global keyboard handler
├── components/
│   ├── FlowEditor.tsx              Main orchestrator (hooks + canvas + modals)
│   ├── TopBar.tsx                  Header with breadcrumbs, file menu, actions
│   ├── ImportDialog.tsx            Import from file, URL, or built-in registry
│   ├── SettingsDialog.tsx          HF token, device, auto-save, undo history
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
│   └── visualizations/            Rich output renderers (auto-detected)
├── nodes/
│   ├── BaseNode.tsx                Shared node chrome (header, resize, timing)
│   ├── registry.ts                 Node type and edge type registries
│   ├── core/                       18 core node types
│   └── transformers/               13 Transformers.js node types
├── macros/
│   ├── macroFactory.ts             Unified PREBUILT_MACROS export
│   ├── pipelineMacroFactory.ts     Auto-generates 22 pipeline macros
│   ├── modelClassMacroFactory.ts   Auto-generates 19 model class macros
│   └── openRouter.ts              OpenRouter API macro
└── utils/
    ├── generateId.ts               Unique ID generator (base32)
    ├── modelRegistry.ts            HuggingFace model size estimator + cache
    └── nodeMenuItems.ts            Categorized node menu builder
```

## Key Concepts

### Execution Engine

The `GraphRunner` executes workflows as a directed acyclic graph:

1. Scans edges to determine each node's expected inputs
2. Queues source nodes (no incoming edges)
3. Executes nodes via type-specific executors, pushing values through edges
4. Supports streaming (immediate forwarding) and batch iteration (pause/resume/stop)
5. Special handling for macros (sub-graph redirection), review gates, and HTTP SSE

### Node System

Nodes are React components registered in `nodes/registry.ts`. Each node type has:

- A component (rendering + user interaction)
- An executor in `engine/nodeExecutors.ts` (runtime logic)
- Dimensions in `config/nodeDimensions.ts`
- Handle definitions returned by `getNodeHandles()`

### Macros

Macros are reusable sub-workflows packaged as single nodes. Pre-built macros are generated from `pipelineRegistry.ts` and `modelClassRegistry.ts`. Users can also create custom macros via the MacroNode container.

### Settings

All settings persist to `localStorage` and are accessed via the `useSettings` hook (React) or `readSetting()` (non-React contexts like executors). Settings include: HF token, device preference, auto-save toggle/interval, and undo history size.

## Node Types

### Core (18)

| Node              | Description                                                   |
| ----------------- | ------------------------------------------------------------- |
| Input Text        | Static string value                                           |
| Media Input       | Unified image/audio/video input with FILE/URL toggle          |
| Folder Input      | Directory picker with auto-categorization by file type        |
| Universal Output  | Adaptive display for any pipeline/model result with rich viz  |
| Output Text       | Readonly text display with copy support                       |
| Output Image      | Image display with before/after compare slider                |
| Audio Output      | Audio playback with download                                  |
| Download Data     | Multi-format export (JSON/CSV/TXT/ZIP/media)                  |
| Custom Script     | Execute JavaScript with dynamic I/O ports                     |
| HTTP Request      | Fetch API with SSE streaming                                  |
| JSON Path         | Extract values via dot notation                               |
| Image Process     | Aspect ratio, resolution, crop, format, quality               |
| Macro Node        | Container for nested sub-workflows                            |
| Batch Iterator    | Iterate arrays with progress, pause/resume/stop               |
| Delay             | Pause execution for N milliseconds                            |
| List Aggregator   | Collect streamed items into a single array                    |
| Review Node       | Manual approval gate with preview and inline edit             |

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

**IMPORT > REGISTRY** provides 50 ready-made workflows organized by category:

- **Pipeline workflows (24)** — One per task, pre-configured with default model and sample data
- **Batch processing (3)** — Folder input with progress tracking (image captioning, text classification, background removal)
- **Model class workflows (20)** — Multi-node workflows using individual Transformers.js nodes (generate-mode or call-mode)
- **Additional workflows (3)** — OpenRouter LLM, feature extraction similarity, Jina CLIP v2

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

Colors are CSS custom properties in `src/index.css`:

```css
:root {
  --relax-bg-primary: #0b0e14;
  --relax-bg-elevated: #131820;
  --relax-border: #1f2630;
  --relax-border-hover: #2a323d;
  --relax-border-active: #3f4b59;
  --relax-text-muted: #5a6b7c;
  --relax-text-default: #a0aec0;
  --relax-text-bright: #ffffff;
  --relax-accent: #00e5ff;
  --relax-success: #00ffaa;
  --relax-error: #ef4444;
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
| [Tailwind CSS](https://tailwindcss.com)                                  | 4.1          | Utility-first styling        |
| [JSZip](https://stuk.github.io/jszip/)                                   | 3.10         | ZIP file generation          |

## License

MIT
