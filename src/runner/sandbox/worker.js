/*
 * Worker harness for learner code.
 *
 * This file is a classic script (no imports). build/sandboxPage.js inlines it
 * into sandbox.html, and the sandbox host turns it into a blob: URL worker.
 * A fresh worker is created for every run and terminated afterwards, so each
 * run starts from a clean global scope.
 *
 * The worker inherits the sandbox page's Content Security Policy: it may
 * evaluate code ('unsafe-eval') but may not make network requests
 * (connect-src 'none'), and its opaque origin has no access to the app's
 * storage. The host enforces the timeout by terminating this worker.
 */
"use strict";

(function startHarness() {
  // Keep references to built-ins before learner code can replace them.
  const post = self.postMessage.bind(self);
  const stringify = JSON.stringify;
  const isArray = Array.isArray;
  const StringFn = String;
  const FunctionCtor = Function;
  const now = () => (self.performance ? self.performance.now() : Date.now());

  // Lines added in front of the learner's code by `new Function` below:
  // "function anonymous(console\n) {\n" plus our "\"use strict\";\n".
  const LINE_OFFSET = 3;
  const SOURCE_NAME = "your-code.js";

  function clip(text, max) {
    return text.length > max ? text.slice(0, max) + "… (shortened)" : text;
  }

  function describeType(value) {
    if (value === null) return "null";
    if (isArray(value)) return "array";
    if (value && typeof value.then === "function") return "promise";
    return typeof value;
  }

  function formatLogArg(value, maxChars) {
    if (typeof value === "string") return clip(value, maxChars);
    if (value === undefined) return "undefined";
    if (typeof value === "function") return "[function " + (value.name || "anonymous") + "]";
    if (typeof value === "symbol" || typeof value === "bigint") return StringFn(value);
    if (value instanceof Error) return value.name + ": " + value.message;
    try {
      const text = stringify(value);
      return clip(text === undefined ? StringFn(value) : text, maxChars);
    } catch {
      return clip(StringFn(value), maxChars);
    }
  }

  function locate(error) {
    const stack = error && typeof error.stack === "string" ? error.stack : "";
    const match = stack.match(/your-code\.js:(\d+):(\d+)/);
    if (!match) return {};
    const line = Number(match[1]) - LINE_OFFSET;
    return line > 0 ? { line, column: Number(match[2]) } : {};
  }

  function describeError(error, stage, maxChars) {
    if (error instanceof Error || (error && typeof error === "object" && "message" in error)) {
      return {
        stage,
        name: clip(StringFn(error.name || "Error"), 60),
        message: clip(StringFn(error.message), maxChars),
        ...locate(error),
      };
    }
    // Learner code can `throw` any value, such as a string.
    return { stage, name: "Thrown value", message: clip(formatLogArg(error, maxChars), maxChars) };
  }

  // Resolves to { line, column } for a syntax error, or {} if unknown.
  // The code is wrapped in a function so it is parsed but never run.
  function findSyntaxErrorLocation(code) {
    return new Promise((resolve) => {
      let checker;
      const done = (location) => {
        clearTimeout(timer);
        if (checker) checker.terminate();
        resolve(location);
      };
      const timer = setTimeout(() => done({}), 1000);
      try {
        const source = '"use strict";\n(function () {\n' + code + '\n});\npostMessage("parsed");\n';
        checker = new Worker(URL.createObjectURL(new Blob([source], { type: "text/javascript" })));
        checker.onmessage = () => done({});
        checker.onerror = (event) => {
          event.preventDefault();
          const line = Number(event.lineno) - 2;
          const lastLine = code.split("\n").length;
          if (line > lastLine) done({ line: lastLine, atEnd: true });
          else done(line > 0 ? { line, column: Number(event.colno) || undefined } : {});
        };
      } catch {
        done({});
      }
    });
  }

  self.onmessage = function handleRun(event) {
    self.onmessage = null; // one run per worker
    const message = event.data || {};
    const { runId, nonce, code, rows, limits } = message;
    const started = now();

    const logs = [];
    let logChars = 0;
    let droppedLogs = 0;

    function capture(level) {
      return function captureLog(...args) {
        if (logs.length >= limits.maxLogEntries || logChars >= limits.maxLogChars) {
          droppedLogs += 1;
          return;
        }
        const text = clip(
          args.map((arg) => formatLogArg(arg, limits.maxLogEntryChars)).join(" "),
          limits.maxLogEntryChars,
        );
        logChars += text.length;
        logs.push({ level, text });
      };
    }

    const learnerConsole = Object.freeze({
      log: capture("log"),
      info: capture("info"),
      debug: capture("log"),
      table: capture("log"),
      warn: capture("warn"),
      error: capture("error"),
    });

    function finish(fields) {
      post({
        type: "done",
        runId,
        nonce,
        logs,
        droppedLogs,
        durationMs: Math.round(now() - started),
        ...fields,
      });
    }

    // 1. Load the learner's code and find their `transform` function.
    let factory;
    try {
      factory = new FunctionCtor(
        "console",
        '"use strict";\n' +
          code +
          "\n;return typeof transform === \"function\" ? transform : undefined;\n//# sourceURL=" +
          SOURCE_NAME,
      );
    } catch (error) {
      const described = describeError(error, "load", limits.maxErrorChars);
      if (error instanceof SyntaxError) {
        // Browsers don't report where a syntax error is for `new Function`, but
        // they do for a worker script, so parse the code once more there.
        findSyntaxErrorLocation(code).then((location) => finish({ status: "error", error: { ...described, ...location } }));
      } else {
        finish({ status: "error", error: described });
      }
      return;
    }
    let transform;
    try {
      transform = factory(learnerConsole);
    } catch (error) {
      finish({ status: "error", error: describeError(error, "load", limits.maxErrorChars) });
      return;
    }
    if (typeof transform !== "function") {
      finish({
        status: "error",
        error: {
          stage: "load",
          name: "Missing function",
          message: "Couldn't find a function named transform.",
        },
      });
      return;
    }

    // 2. Call it on the rows, noting whether it changes them.
    const before = stringify(rows);
    let result;
    try {
      result = transform(rows);
    } catch (error) {
      finish({ status: "error", error: describeError(error, "run", limits.maxErrorChars) });
      return;
    }
    let mutated;
    try {
      mutated = stringify(rows) !== before;
    } catch {
      mutated = true; // e.g. the code added a circular reference to a row
    }

    // 3. Return a bounded JSON copy of the result.
    const resultType = describeType(result);
    if (resultType === "array" && result.length > limits.maxResultItems) {
      finish({
        status: "error",
        mutated,
        resultType,
        error: {
          stage: "result",
          name: "Result too large",
          message:
            "transform returned " +
            result.length +
            " items. The limit here is " +
            limits.maxResultItems +
            ".",
        },
      });
      return;
    }
    let outputJson = null;
    if (resultType !== "undefined" && resultType !== "function" && resultType !== "promise" && resultType !== "symbol") {
      try {
        outputJson = stringify(result);
      } catch (error) {
        finish({
          status: "error",
          mutated,
          resultType,
          error: {
            stage: "result",
            name: "Result can't be shown",
            message: "The result couldn't be turned into JSON: " + clip(StringFn(error && error.message), 300),
          },
        });
        return;
      }
      if (typeof outputJson === "string" && outputJson.length > limits.maxResultChars) {
        finish({
          status: "error",
          mutated,
          resultType,
          error: {
            stage: "result",
            name: "Result too large",
            message:
              "The result is " +
              outputJson.length +
              " characters of JSON. The limit here is " +
              limits.maxResultChars +
              ".",
          },
        });
        return;
      }
    }
    finish({ status: "ok", mutated, resultType, outputJson: outputJson === undefined ? null : outputJson });
  };
})();
