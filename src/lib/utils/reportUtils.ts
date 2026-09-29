// Helper to inject signature images into the raw HTML report before rendering/PDF export
export function injectSignaturesIntoHtml(
  rawHtml: string, 
  leadSignatureUrl?: string, 
  dddSignatureUrl?: string,
  mergedSignatures?: any
): string {

  console.log('Calling injectSignaturesIntoHtml: ');
  let updatedHtml = rawHtml;

  if (leadSignatureUrl) {
    updatedHtml = updatedHtml.replace(
      "<!-- SIGNATURE_IMAGE_LEAD_INSPECTOR -->",
      `<img src="${leadSignatureUrl}" alt="Lead Inspector Signature" style="max-height:40px; width:auto; display:block; margin:0 auto;" />`
    );
  }
  if (mergedSignatures['Yusuf Adeiza Y']) {
    console.log('mergedSignatures first in array is: ', mergedSignatures['Yusuf Adeiza Y']);
    updatedHtml = updatedHtml.replace(
      "<!-- SIGNATURE_IMAGE_LEAD_INSPECTOR -->",
      `<img src="${mergedSignatures['Yusuf Adeiza Y']}" alt="Lead Inspector Signature" style="max-height:40px; width:auto; display:block; margin:0 auto;" />`
    );
  }

  if (dddSignatureUrl) {
    updatedHtml = updatedHtml.replace(
      "<!-- SIGNATURE_IMAGE_DDD -->",
      `<img src="${dddSignatureUrl}" alt="DDD Signature" style="max-height:40px; width:auto; display:block; margin:0 auto;" />`
    );
  }

  return updatedHtml;
}