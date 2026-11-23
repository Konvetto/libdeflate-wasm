# Security

The compressors take bytes and return bytes; the decompressors parse untrusted DEFLATE, zlib and
gzip data with libdeflate's decompressor inside the wasm sandbox. A bug there can at worst corrupt
the module's own memory, not the page. Inputs are capped at 1 GiB and outputs at 2 GiB; size hints
(yours or a gzip trailer) are trusted only up to what the input can decode to, so a small corrupt
stream cannot make the module reserve a large buffer.

If you find a problem, write to hello@konvetto.com. Please do not open a public issue for a
vulnerability before a fix is out. You will get an answer within a week and a fix, when the
report holds, in the next release. Bugs in libdeflate itself also go upstream to
https://github.com/ebiggers/libdeflate.

Supported: the latest minor version.
