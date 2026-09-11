#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');

const QUERY_STRING_VERSION = '7.1.3';
const DECODE_URI_COMPONENT_VERSION = '0.5.0';
const ORIGINAL_IMPORT = "const decodeComponent = require('decode-uri-component');";
const COMPATIBLE_IMPORT = [
  "const decodeComponentModule = require('decode-uri-component');",
  'const decodeComponent = decodeComponentModule.default ?? decodeComponentModule;',
].join('\n');

const hasCompatibleImport = (source) =>
  source.replaceAll('\r\n', '\n').includes(COMPATIBLE_IMPORT);

const readPackageMetadata = (packageDirectory) =>
  JSON.parse(fs.readFileSync(path.join(packageDirectory, 'package.json'), 'utf8'));

const resolvePackageDirectory = (packageName, paths) => {
  const entrypoint = require.resolve(packageName, { paths });
  return path.dirname(entrypoint);
};

const patchQueryString = (mobileDirectory = path.resolve(__dirname, '..')) => {
  const queryStringDirectory = resolvePackageDirectory('query-string', [mobileDirectory]);
  const queryStringMetadata = readPackageMetadata(queryStringDirectory);

  if (queryStringMetadata.version !== QUERY_STRING_VERSION) {
    throw new Error(
      `Expected query-string@${QUERY_STRING_VERSION}, found ${queryStringMetadata.version}`,
    );
  }

  const decoderDirectory = resolvePackageDirectory('decode-uri-component', [queryStringDirectory]);
  const decoderMetadata = readPackageMetadata(decoderDirectory);
  if (
    decoderMetadata.version !== DECODE_URI_COMPONENT_VERSION ||
    decoderMetadata.type !== 'module'
  ) {
    throw new Error(
      `Expected ESM decode-uri-component@${DECODE_URI_COMPONENT_VERSION}, found ${decoderMetadata.version}`,
    );
  }

  const queryStringEntrypoint = path.join(queryStringDirectory, 'index.js');
  const source = fs.readFileSync(queryStringEntrypoint, 'utf8');
  if (!hasCompatibleImport(source)) {
    const occurrences = source.split(ORIGINAL_IMPORT).length - 1;
    if (occurrences !== 1) {
      throw new Error(
        `Expected one CommonJS decoder import in ${queryStringEntrypoint}, found ${occurrences}`,
      );
    }
    fs.writeFileSync(
      queryStringEntrypoint,
      source.replace(ORIGINAL_IMPORT, COMPATIBLE_IMPORT),
    );
  }

  delete require.cache[queryStringEntrypoint];
  const queryString = require(queryStringEntrypoint);
  const parsed = queryString.parse('screen=Inbox%20Today&tag=next');
  if (parsed.screen !== 'Inbox Today' || parsed.tag !== 'next') {
    throw new Error('query-string compatibility smoke returned unexpected values');
  }
};

// Bun's Windows hoisted linker can attempt the same patched package rename
// concurrently for these consumers (ENOTEMPTY). Apply the already verified CJS
// compatibility patch after linking instead. Resolve each consumer explicitly:
// correctness must not depend on node_modules being hardlinked rather than copied.
const patchAllQueryStringConsumers = (mobileDirectory = path.resolve(__dirname, '..')) => {
  const navigationDirectory = path.dirname(require.resolve('@react-navigation/native/package.json', { paths: [mobileDirectory] }));
  const consumerDirectories = new Set([
    mobileDirectory,
    path.dirname(require.resolve('@react-navigation/core/package.json', { paths: [mobileDirectory] })),
    path.dirname(require.resolve('@react-navigation/core/package.json', { paths: [navigationDirectory] })),
    path.dirname(require.resolve('expo-router/package.json', { paths: [mobileDirectory] })),
  ]);
  for (const consumerDirectory of consumerDirectories) patchQueryString(consumerDirectory);
  return [...consumerDirectories];
};

if (require.main === module) {
  patchAllQueryStringConsumers();
}

module.exports = { hasCompatibleImport, patchQueryString, patchAllQueryStringConsumers };
