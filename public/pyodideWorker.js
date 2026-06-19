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

  // Generate input files for tasks 17 and 27 in Pyodide virtual filesystem
  try {
    await self.pyodide.runPythonAsync(`
import random
# 17.txt
random.seed(42)
with open('17.txt', 'w') as f:
    for _ in range(10000):
        f.write(str(random.randint(-1000, 1000)) + '\\n')

# 27.txt
random.seed(777)
with open('27.txt', 'w') as f:
    f.write('100000\\n')
    for _ in range(100000):
        f.write(str(random.randint(1, 10000)) + '\\n')
`);
  } catch (e) {
    console.error("Failed to generate test files:", e);
  }

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
