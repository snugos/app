export default [
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        window: "readonly",
        document: "readonly",
        console: "readonly",
        localStorage: "readonly",
        indexedDB: "readonly",
        requestAnimationFrame: "readonly",
        fetch: "readonly",
        URL: "readonly",
        Blob: "readonly",
        File: "readonly",
        FileReader: "readonly",
        ArrayBuffer: "readonly",
        Uint8Array: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        navigator: "readonly",
        AudioContext: "readonly",
        Error: "readonly",
        Math: "readonly",
        Date: "readonly",
        parseInt: "readonly",
        parseFloat: "readonly",
        isNaN: "readonly",
        Array: "readonly",
        Object: "readonly",
        JSON: "readonly",
        Promise: "readonly",
        Map: "readonly",
        Set: "readonly",
        Symbol: "readonly",
        Number: "readonly",
        String: "readonly",
        Boolean: "readonly",
        Tone: "readonly"
      }
    },
    rules: {
      "no-undef": "error",
      "no-unused-vars": "off"
    }
  }
];
