"use client";

/**
 * 클라이언트 PDF → 페이지 이미지 변환 (pdfjs-dist)
 *
 * 스캔 PDF 한 부를 페이지별 JPEG 이미지로 렌더링한다.
 * JPEG를 쓰는 이유: 머리글 분류(/api/classify)·OCR(/api/ocr) 요청 본문 크기를 줄여
 * 서버리스 함수 바디 제한을 넘기지 않기 위함. (Storage 보관본도 동일 이미지 사용)
 *
 * 워커는 설치된 버전과 일치하는 CDN 워커를 사용한다.
 */
export interface RenderedPage {
  pageNumber: number;
  /** "data:image/jpeg;base64,..." */
  dataUrl: string;
  width: number;
  height: number;
}

export async function renderPdfToImages(
  file: File,
  opts: { scale?: number; quality?: number } = {},
): Promise<RenderedPage[]> {
  const scale = opts.scale ?? 2;
  const quality = opts.quality ?? 0.85;

  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

  const data = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data }).promise;

  const pages: RenderedPage[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D 컨텍스트를 만들 수 없습니다.");

    await page.render({ canvasContext: ctx, viewport }).promise;
    pages.push({
      pageNumber: i,
      dataUrl: canvas.toDataURL("image/jpeg", quality),
      width: canvas.width,
      height: canvas.height,
    });
    page.cleanup();
  }

  await doc.cleanup();
  return pages;
}

/** "data:...;base64,XXXX" → "XXXX" */
export function dataUrlToBase64(dataUrl: string): string {
  const comma = dataUrl.indexOf(",");
  return comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
}
