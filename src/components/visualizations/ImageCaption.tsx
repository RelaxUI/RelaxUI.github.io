export function ImageCaption({
  data,
  sourceImage,
}: {
  data: any;
  sourceImage?: string;
}) {
  let caption = "";
  if (typeof data === "string") {
    caption = data;
  } else if (Array.isArray(data) && data.length > 0) {
    caption = data[0]?.generated_text || JSON.stringify(data[0]);
  } else if (data?.generated_text) {
    caption = data.generated_text;
  }

  return (
    <div className="flex flex-col gap-2 w-full items-center">
      {sourceImage && (
        <img
          src={sourceImage}
          alt="Source"
          className="max-h-[120px] rounded object-contain"
        />
      )}
      <div className="text-xs font-mono text-white text-center leading-relaxed bg-[var(--relax-bg-primary)] rounded p-2 w-full">
        {caption || "No caption generated"}
      </div>
    </div>
  );
}
