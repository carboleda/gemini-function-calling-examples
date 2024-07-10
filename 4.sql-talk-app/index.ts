import {
  FunctionDeclaration,
  FunctionDeclarationSchemaType,
  FunctionResponse,
  FunctionResponsePart,
  GoogleGenerativeAI,
} from "@google/generative-ai";
import readline from "node:readline/promises";
import sqlite3 from "sqlite3";

// Open the database
const db = new sqlite3.Database("4.sql-talk-app/db.sqlite");

async function getTables() {
  return new Promise((resolve, reject) => {
    db.all(
      "SELECT name FROM sqlite_master WHERE type='table';",
      (err, rows) => {
        if (err) {
          console.error("Error fetching tables", err);
          return;
        }
        resolve(rows.map((row: any) => row.name));
      }
    );
  });
}

async function countRows({ tableName }: { tableName: string }) {
  return new Promise((resolve, reject) => {
    db.get(`SELECT COUNT(*) as count FROM ${tableName};`, (err, row: any) => {
      if (err) {
        console.error(`Error counting rows in table ${tableName}`, err);
        reject(err);
        return;
      }
      resolve(row.count);
    });
  });
}

async function getTableSchema({ tableName }: { tableName: string }) {
  const getSchema = new Promise((resolve, reject) => {
    db.all(`PRAGMA table_info(${tableName});`, (err, rows) => {
      if (err) {
        console.error(`Error fetching schema for table ${tableName}`, err);
        reject(err);
        return;
      }
      const schema = rows.map((row: any) => ({
        name: row.name,
        type: row.type,
        notNull: row.notnull === 1,
        defaultValue: row.dflt_value,
        primaryKey: row.pk === 1,
      }));
      resolve(schema);
    });
  });

  return Promise.all([countRows({ tableName }), getSchema]).then(
    ([count, schema]) => {
      return {
        rows: count,
        schema,
      };
    }
  );
}

async function executeQuery({ query }: { query: string }) {
  return new Promise((resolve, reject) => {
    db.all(query, (err, rows) => {
      if (err) {
        console.error("Error executing query", err);
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
}

const getTablesFunc: FunctionDeclaration = {
  name: "getTables",
  description:
    "List tables in a database that will help answer the user's question",
};

const getTableSchemaFunc: FunctionDeclaration = {
  name: "getTableSchema",
  description:
    "Get information about a table, including the description, schema, and number of rows that will help answer the user's question. Always use the names coming from the getTables tool.",
  parameters: {
    type: FunctionDeclarationSchemaType.OBJECT,
    properties: {
      tableName: {
        type: FunctionDeclarationSchemaType.STRING,
        description: "Table name of the table to get information about",
      },
    },
    required: ["tableName"],
  },
};

const executeQueryFunc: FunctionDeclaration = {
  name: "executeQuery",
  description: "Get information from data in SQLite using SQL queries",
  parameters: {
    type: FunctionDeclarationSchemaType.OBJECT,
    properties: {
      query: {
        type: FunctionDeclarationSchemaType.STRING,
        description:
          "SQL query on a single line that will help give quantitative answers to the user's question when run on a SQLite dataset and table. In the SQL query, always use the fully qualified dataset and table names.",
      },
    },
    required: ["query"],
  },
};

export const genAI = new GoogleGenerativeAI(process.env.API_KEY || "");

const functions: { [name: string]: Function } = {
  getTables,
  getTableSchema,
  executeQuery,
};
const tools = [
  {
    functionDeclarations: [getTablesFunc, getTableSchemaFunc, executeQueryFunc],
  },
];
const systemInstruction = `Please give a concise, high-level summary followed by detail in plain language about where the information in your response is coming from in the database. Only use information that you learn from SQLite, do not make up information. Always use the names coming from the getTables tool.`;

const model = genAI.getGenerativeModel(
  {
    model: process.env.GEMINI_MODEL!!,
    tools,
    generationConfig: {
      temperature: 0,
    },
  },
  { apiVersion: "v1beta" }
);

async function handlePrompt(
  userInput: string = "Generate a list of the students in the sudent table"
) {
  const prompt = `${systemInstruction}. ${userInput}`;

  const chat = model.startChat();

  let functionCallingInProcess = true;
  let result = await chat.sendMessage(prompt);

  while (functionCallingInProcess) {
    const functionCalls = result?.response?.functionCalls() || [];
    // console.dir(result, { depth: null });

    if (functionCalls?.length === 0) {
      functionCallingInProcess = false;
      break;
    }

    const apiResponse: FunctionResponse[] = [];
    for await (const functionCall of functionCalls) {
      console.log(functionCall);
      const response = await functions[functionCall.name](functionCall.args);
      // console.log(functionCall.name, response);
      apiResponse.push({
        name: functionCall.name,
        response: response,
      });
    }

    result = await chat.sendMessage(
      apiResponse.map(
        ({ name, response }): FunctionResponsePart => ({
          functionResponse: {
            name,
            response: {
              content: response,
            },
          },
        })
      )
    );
  }

  console.log("Answer: ", result.response.text());
}

(async () => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  while (true) {
    try {
      const input = await rl.question(
        'Enter "exit" or "q" to quit.\n' +
          'Ask your quesion about the database": '
      );

      if (input === "exit" || input === "q") {
        // Close the database connection
        db.close();
        rl.close();
        break;
      }

      await handlePrompt(input);
    } catch (error) {
      console.error("Error processing input", error);
    }
  }
})();
