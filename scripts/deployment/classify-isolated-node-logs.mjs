const MAX_RETAINED_LOG_BYTES = 1024 * 1024;
let retained = '';
let bytesSeen = 0;

for await (const chunk of process.stdin) {
  const text = Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk);
  bytesSeen += Buffer.byteLength(text);
  retained = `${retained}${text}`.slice(-MAX_RETAINED_LOG_BYTES);
}

const normalized = retained.toLowerCase();
const v8HeapOom = /javascript heap out of memory|reached heap limit[^\n]*heap out of memory|allocation failed[^\n]*javascript heap/i.test(normalized);
const nativeOom = !v8HeapOom && /out of memory: kill process|oom-kill|oom killer|killed process [0-9]+/i.test(normalized);
const uncaughtException = /uncaught exception|uncaughtexception|unhandled promise rejection|unhandledrejection/i.test(normalized);
const nodeFatal = /fatal error:/i.test(normalized);
const abortFailure = /aborted \(core dumped\)|sigabrt|assertion failure/i.test(normalized);

let fatalCategory = 'none';
if (v8HeapOom) fatalCategory = 'v8_heap_oom';
else if (nativeOom) fatalCategory = 'kernel_or_container_oom';
else if (uncaughtException) fatalCategory = 'uncaught_exception';
else if (nodeFatal) fatalCategory = 'node_fatal';
else if (abortFailure) fatalCategory = 'abort_or_assertion';

process.stdout.write(`${JSON.stringify({
  fatal_category: fatalCategory,
  v8_heap_oom_seen: v8HeapOom,
  native_oom_seen: nativeOom,
  uncaught_exception_seen: uncaughtException,
  node_fatal_seen: nodeFatal,
  abort_or_assertion_seen: abortFailure,
  inspected_bytes: Math.min(bytesSeen, MAX_RETAINED_LOG_BYTES),
  input_was_truncated: bytesSeen > MAX_RETAINED_LOG_BYTES,
})}\n`);
