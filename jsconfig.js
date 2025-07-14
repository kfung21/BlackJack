{
    "compilerOptions": {
      "target": "esnext",
      "module": "esnext",
      "moduleResolution": "node",
      "allowSyntheticDefaultImports": true,
      "esModuleInterop": true,
      "allowJs": true,
      "checkJs": false,
      "strict": false,
      "noEmit": true,
      "baseUrl": ".",
      "paths": {
        "@/*": ["src/*"]
      }
    },
    "include": [
      "src/**/*"
    ],
    "exclude": [
      "node_modules",
      "dist"
    ]
  }