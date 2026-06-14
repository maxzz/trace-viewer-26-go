## About

Wails template which includes: Vite, React, TS, TailwindCSS out of the box.

Build with `Wails CLI v2.0.0`.

To use this [template](https://wails.io/docs/community/templates):
```shell
wails init -n "Your Project Name" -t https://github.com/hotafrika/wails-vite-react-ts-tailwind-template
cd frontend/src
npm install
```

[Here](scripts) you can find useful scripts for building on different platforms and Wails CLI installation.

## Live Development

To run in live development mode, run `wails dev` in the project directory. In another terminal, go into the `frontend`
directory and run `npm run dev`. The frontend dev server will run on http://localhost:34115. Connect to this in your
browser and connect to your application.

## Building

To build a redistributable, production mode package, use `wails build`.

## Initial setup

This was created from tm-template-go-26 template as:
* clone the template project (tm-template-go-26) which is template itself
* remove everything from template cloned project except wails.js folder
* copy everything from the new vite project (trace-viewer-25) to this project
* move folder .cursor and .vscode to the repo root if required
