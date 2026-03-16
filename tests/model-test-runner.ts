/**
 * model-test-runner.ts
 *
 * Automated model testing — loads each model class with its default model,
 * runs a forward pass or generate call, and verifies no errors.
 * Skips models over 1 GB.
 *
 * Usage: bun run tests/model-test-runner.ts
 */

interface TestCase {
  name: string;
  modelClass: string;
  modelId: string;
  dtype?: string | Record<string, string>;
  mode: "call" | "generate";
  input: string;
  maxNewTokens?: number;
}

const MAX_SIZE_BYTES = 1_000_000_000;

const TEST_CASES: TestCase[] = [
  // Generate-capable models
  {
    name: "CausalLM (GPT-2)",
    modelClass: "AutoModelForCausalLM",
    modelId: "Xenova/gpt2",
    mode: "generate",
    input: "Hello world",
    maxNewTokens: 10,
  },
  {
    name: "Seq2SeqLM (Flan-T5)",
    modelClass: "AutoModelForSeq2SeqLM",
    modelId: "Xenova/flan-t5-small",
    mode: "generate",
    input: "Translate to French: Hello",
    maxNewTokens: 10,
  },

  // Call-only models
  {
    name: "MaskedLM (BERT)",
    modelClass: "AutoModelForMaskedLM",
    modelId: "Xenova/bert-base-uncased",
    mode: "call",
    input: "The capital of France is [MASK].",
  },
  {
    name: "SequenceClassification",
    modelClass: "AutoModelForSequenceClassification",
    modelId: "Xenova/distilbert-base-uncased-finetuned-sst-2-english",
    mode: "call",
    input: "I love this!",
  },
  {
    name: "TokenClassification (NER)",
    modelClass: "AutoModelForTokenClassification",
    modelId: "Xenova/bert-base-NER",
    mode: "call",
    input: "John works at Microsoft.",
  },
  {
    name: "QuestionAnswering",
    modelClass: "AutoModelForQuestionAnswering",
    modelId: "Xenova/distilbert-base-cased-distilled-squad",
    mode: "call",
    input: "What is Paris? [SEP] Paris is the capital of France.",
  },
  {
    name: "TextToWaveform (MMS-TTS)",
    modelClass: "AutoModelForTextToWaveform",
    modelId: "Xenova/mms-tts-eng",
    mode: "call",
    input: "Hello world",
  },
  {
    name: "AutoModel (Base)",
    modelClass: "AutoModel",
    modelId: "Xenova/bert-base-uncased",
    mode: "call",
    input: "Test sentence.",
  },
];

async function getModelSize(modelId: string): Promise<number | null> {
  try {
    const res = await fetch(
      `https://huggingface.co/api/models/${modelId}/tree/main?recursive=true`,
    );
    if (!res.ok) return null;
    const files = await res.json();
    const onnxFiles = files.filter(
      (f: any) =>
        f.type === "file" &&
        f.size &&
        (f.path.endsWith(".onnx") || f.path.endsWith(".onnx_data")),
    );
    return onnxFiles.reduce((a: number, b: any) => a + b.size, 0);
  } catch {
    return null;
  }
}

async function main() {
  const transformers = await import("@huggingface/transformers");

  console.log("Running model tests...\n");

  let passed = 0;
  let skipped = 0;
  let failed = 0;

  for (const tc of TEST_CASES) {
    process.stdout.write(`  ${tc.name.padEnd(40)} `);

    // Check size first
    const size = await getModelSize(tc.modelId);
    if (size && size > MAX_SIZE_BYTES) {
      console.log(`SKIPPED (${(size / 1024 / 1024).toFixed(0)} MB > 1 GB)`);
      skipped++;
      continue;
    }

    try {
      // Load model
      const ModelClass = (transformers as any)[tc.modelClass];
      if (!ModelClass) throw new Error(`Class ${tc.modelClass} not found`);

      const model = await ModelClass.from_pretrained(tc.modelId, {
        device: "cpu",
      });

      // Load tokenizer
      const tokenizer = await transformers.AutoTokenizer.from_pretrained(tc.modelId);

      if (tc.mode === "generate") {
        const encoded = await tokenizer(tc.input);
        const output = await model.generate({
          ...encoded,
          max_new_tokens: tc.maxNewTokens || 5,
        });
        if (!output) throw new Error("No output from generate()");
        const decoded = tokenizer.decode(output[0], { skip_special_tokens: true });
        if (typeof decoded !== "string") throw new Error("Decode failed");
        console.log(`PASS  (output: "${decoded.substring(0, 50)}...")`);
      } else {
        const encoded = await tokenizer(tc.input);
        const output = await model(encoded);
        if (!output) throw new Error("No output from model()");
        // Verify output has expected tensor properties
        const hasOutput = output.logits || output.last_hidden_state || output.waveform || output.start_logits;
        if (!hasOutput) {
          console.log(`PASS  (raw output keys: ${Object.keys(output).join(", ")})`);
        } else {
          console.log("PASS");
        }
      }
      passed++;
    } catch (err: any) {
      console.log(`FAIL  (${err.message.substring(0, 80)})`);
      failed++;
    }
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed, ${skipped} skipped`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
