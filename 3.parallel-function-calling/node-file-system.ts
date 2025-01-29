import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { SchemaType } from "@google/generative-ai";

export class NodeFileSystem {
  workspace: string;

  constructor(workspace: string) {
    this.workspace = workspace;
  }

  metadata = {
    functionDeclarations: [
      {
        name: "createFile",
        description:
          "Creates or replaces a file with the given filePath and content",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            filePath: { type: SchemaType.NUMBER },
            content: { type: SchemaType.NUMBER },
          },
          required: ["filePath", "content"],
        },
      },
    ],
  };

  resolve = (filePath: string) => {
    return path.resolve(process.cwd(), this.workspace, filePath);
  };

  createFile = ({
    filePath,
    content,
  }: {
    filePath: string;
    content: string;
  }) => {
    console.log(`Creating file ${filePath}...`);
    const _filePath = this.resolve(filePath);
    this.createDirIfNeeded(_filePath);

    const filehandle = fs.openSync(_filePath, "w+");
    fs.writeFileSync(
      filehandle,
      content
        .replace(/\\n/g, os.EOL)
        .replace(/\\'/g, "'")
        .replace(/\\'\\"/g, "'")
    );

    return true;
  };

  createDirIfNeeded = (filePath: string) => {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  };
}
