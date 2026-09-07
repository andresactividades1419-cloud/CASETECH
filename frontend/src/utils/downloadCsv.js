/**
 * utils/downloadCsv.js — Helper compartido para descargar respuestas CSV (RF12).
 *
 * Toma una respuesta de Axios con responseType: 'blob' y dispara la descarga
 * en el navegador, tomando el nombre de archivo del header Content-Disposition
 * si está presente.
 */

export function downloadCsvResponse(response, fallbackFilename) {
  const url = window.URL.createObjectURL(
    new Blob([response.data], { type: 'text/csv;charset=utf-8;' })
  );
  const link = document.createElement('a');
  link.href = url;

  const contentDisposition = response.headers['content-disposition'];
  let filename = fallbackFilename;
  if (contentDisposition) {
    const match = contentDisposition.match(/filename="?([^"]+)"?/);
    if (match && match[1]) filename = match[1];
  }

  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export default downloadCsvResponse;
