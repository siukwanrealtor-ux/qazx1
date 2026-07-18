export interface CropArea {
  width: number;
  height: number;
  x: number;
  y: number;
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to load image for cropping."));
    image.src = src;
  });
}

export async function createCroppedImageBlob(src: string, area: CropArea) {
  const image = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = area.width;
  canvas.height = area.height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Unable to prepare the image crop.");
  }

  context.drawImage(
    image,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    area.width,
    area.height
  );

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Unable to export the cropped image."));
          return;
        }
        resolve(blob);
      },
      "image/jpeg",
      0.92
    );
  });
}