import type { NodeInfo } from "@/types.ts";

export const NODE_INFO: Record<string, NodeInfo> = {
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
  universalOutput: {
    desc: "Adaptive output node. Displays pipeline/model results with rich visualizations (NER, charts, segmentation, depth maps, etc.), image comparison, and raw data. Supports copy and download.",
    in: "data (Any pipeline/model result), img1 (Image), img2 (Image)",
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
  macroInSettings: {
    desc: "Reads a value from the app Settings (e.g. API keys). Configure in Settings dialog.",
    in: "None",
    out: "Setting value",
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
  folderInput: {
    desc: "Allows the user to select a local folder. Outputs arrays of object URLs filtered by category (all, images, audio, text, video).",
    in: "None",
    out: "ALL FILES, IMAGES, AUDIO, TEXT, VIDEO",
  },
  batchIterator: {
    desc: "Takes an array and emits its items one by one (or in chunks) with a configurable delay. Supports manual step mode with Next/Rework buttons for interactive iteration.",
    in: "list (Array)",
    out: "item (Data)",
  },
  delay: {
    desc: "Pauses the execution flow for a given amount of milliseconds before passing the data forward.",
    in: "in (Any)",
    out: "out (Any)",
  },
  listAggregator: {
    desc: "Collects incoming items into a single array. Optionally accepts a NAME to store {name, data} entries for structured output (e.g. ZIP with folder paths).",
    in: "item (Any), name (String, optional)",
    out: "list (Array)",
  },
  downloadData: {
    desc: "Takes any data input and provides download in multiple formats: JSON, CSV, TXT for text/tabular data; PNG, JPG, WEBP for images; ZIP for mixed arrays. Connect a NAME handle for custom filenames. Supports auto, from-edge, and incremental naming modes.",
    in: "in (Any), name (String, optional)",
    out: "None",
  },
  imageProcess: {
    desc: "Resizes, crops, and converts images. Supports aspect ratio presets, resolution scaling (1K/2K/4K), crop anchoring, format conversion, quality control, and round-to-8 toggle. Optional SIZE input overrides calculated dimensions (connect from another ImageProcess to match sizes). Outputs SIZE as 'WxH'.",
    in: "image (Data URL), size (String 'WxH', optional — overrides dimensions)",
    out: "out (Data URL), size (String 'WxH')",
  },
  reviewNode: {
    desc: "Pauses execution for manual approval. Buttons only: Approve, Rework (re-trigger upstream), and Cancel.",
    in: "in (Any)",
    out: "Approved data",
  },
  converter: {
    desc: "Converts data between formats: blob URLs, base64 data URIs, HTTPS URLs, plain text, and JSON. Use before API nodes that require a specific input format.",
    in: "in (Any)",
    out: "Converted data",
  },
  pollUntil: {
    desc: "Polls a URL at a configurable interval until a JSON status field matches the done value. Ideal for queue-based APIs (fal.ai, Wavespeed, etc.). Optionally fetches a separate result URL when done.",
    in: "url (String), headers (JSON String), resultUrl (String, optional)",
    out: "Final JSON response",
  },
  textTemplate: {
    desc: "Interpolates {{var1}}, {{var2}}, etc. placeholders in a template string with values from connected inputs. Great for assembling prompts, headers, and structured text.",
    in: "var1, var2, var3, var4 (Any)",
    out: "Interpolated string",
  },
  switchNode: {
    desc: "Routes data to TRUE or FALSE output based on a condition. Modes: match value, truthy/falsy, contains, or regex match.",
    in: "in (Any)",
    out: "true (matched data), false (unmatched data)",
  },
  mergeNode: {
    desc: "Combines up to 4 inputs into a single object or array. Object mode uses handle names as keys. Array mode collects values in order. Concat mode flattens array inputs into one flat array.",
    in: "in1, in2, in3, in4 (Any)",
    out: "Merged object, array, or flattened array",
  },
  stringOps: {
    desc: "Performs string operations: split, join, replace, uppercase, lowercase, trim, slice, regex extract, or length.",
    in: "in (String)",
    out: "Transformed result",
  },
  counterNode: {
    desc: "Increments a counter each time triggered. Outputs both the raw count and a formatted label with optional prefix/suffix. Useful in batch loops for naming.",
    in: "trigger (Any)",
    out: "count (Number), label (String)",
  },
  commentNode: {
    desc: "A non-executing annotation node for documenting your workflow. Has no inputs or outputs.",
    in: "None",
    out: "None",
  },
  chatNode: {
    desc: "Displays messages in a chat-style interface. Connect text to LEFT and RIGHT handles to show messages on each side. Supports streaming. Labels are editable.",
    in: "left (String), right (String)",
    out: "None",
  },
  // Transformers.js nodes
  transformersPipeline: {
    desc: "Runs a Transformers.js pipeline task. Select task and model to execute inference in the browser.",
    in: "Task-specific inputs",
    out: "Pipeline result (JSON)",
  },
  transformersModelLoader: {
    desc: "Loads a model from Hugging Face Hub using a specific Auto class or named class.",
    in: "None (configured via params)",
    out: "Model instance",
  },
  transformersTokenizerLoader: {
    desc: "Loads an AutoTokenizer for text encoding/decoding.",
    in: "None (configured via params)",
    out: "Tokenizer instance",
  },
  transformersProcessorLoader: {
    desc: "Loads an AutoProcessor for multimodal preprocessing.",
    in: "None (configured via params)",
    out: "Processor instance",
  },
  transformersGenerate: {
    desc: "Runs model.generate() with configurable generation parameters. Supports streaming via TextStreamer.",
    in: "model, tensors, generation_config",
    out: "Generated token IDs, stream text",
  },
  transformersTokenizerEncode: {
    desc: "Encodes text into token tensors using a loaded tokenizer.",
    in: "tokenizer, text",
    out: "Tensor inputs",
  },
  transformersTokenizerDecode: {
    desc: "Decodes token IDs back into text using a loaded tokenizer.",
    in: "tokenizer, token_ids",
    out: "Decoded text",
  },
  transformersProcessor: {
    desc: "Processes multimodal inputs (text, images, audio) using a loaded processor.",
    in: "processor, text/image/audio",
    out: "Processed tensors",
  },
  transformersChatTemplate: {
    desc: "Applies a chat template to format messages for a model.",
    in: "tokenizer/processor, messages (JSON)",
    out: "Formatted text or tensors",
  },
  transformersEnvConfig: {
    desc: "Configures Transformers.js environment settings (cache, remote models, etc.).",
    in: "None",
    out: "Config applied signal",
  },
  transformersGenerationConfig: {
    desc: "Builds a generation config object from parameters (temperature, top_k, etc.).",
    in: "None",
    out: "Config object",
  },
  audioInput: {
    desc: "Provides audio data from file upload.",
    in: "None",
    out: "Audio data (Float32Array)",
  },
  audioOutput: {
    desc: "Plays back audio data.",
    in: "Audio data",
    out: "None",
  },
  videoInput: {
    desc: "Provides video data from file upload or URL.",
    in: "None",
    out: "Video data",
  },
  transformersModelCall: {
    desc: "Runs a forward pass (model call) on the model with tensor inputs. Use this for models that don't support .generate().",
    in: "model, tensors",
    out: "Raw model outputs",
  },
  transformersPostProcessCall: {
    desc: "Post-processes raw model call outputs into human-readable results based on the model's task category.",
    in: "outputs, tokenizer/processor, encoded_inputs",
    out: "Processed result",
  },
};
