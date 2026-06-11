// pyodideWorker.js
importScripts('https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js');

let pyodideReadyPromise = null;

async function loadPyodideAndPackages() {
  self.pyodide = await loadPyodide();
  // Override stdout and stderr to send messages back to main thread
  self.pyodide.setStdout({
    batched: (str) => {
      self.postMessage({ type: 'stdout', text: str });
    }
  });
  self.pyodide.setStderr({
    batched: (str) => {
      self.postMessage({ type: 'stderr', text: str });
    }
  });
  self.postMessage({ type: 'ready' });
}

pyodideReadyPromise = loadPyodideAndPackages();

self.onmessage = async (event) => {
  if (event.data.type === 'run') {
    await pyodideReadyPromise;
    const { code, runId } = event.data;
    try {
      await self.pyodide.runPythonAsync(code);
      self.postMessage({ type: 'done', runId });
    } catch (error) {
      self.postMessage({ type: 'error', error: error.message, runId });
    }
  }
};
