import {
  Content,
  FunctionDeclaration,
  FunctionResponsePart,
  GoogleGenerativeAI,
  SchemaType,
} from "@google/generative-ai";
import readline from "node:readline/promises";
import sqlite3 from "sqlite3";

// Open the database
const dbFile = `${__dirname}/db.sqlite`;
const db = new sqlite3.Database(dbFile);

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

const getTablesDcl: FunctionDeclaration = {
  name: "getTables",
  description:
    "List tables in a database that will help answer the user's question",
};

const getTableSchemaDcl: FunctionDeclaration = {
  name: "getTableSchema",
  description:
    "Get information about a table, including the description, schema, and number of rows that will help answer the user's question. Always use the names coming from the getTables tool.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      tableName: {
        type: SchemaType.STRING,
        description: "Table name of the table to get information about",
      },
    },
    required: ["tableName"],
  },
};

const executeQueryDcl: FunctionDeclaration = {
  name: "executeQuery",
  description: "Get information from data in SQLite using SQL queries",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      query: {
        type: SchemaType.STRING,
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
    functionDeclarations: [getTablesDcl, getTableSchemaDcl, executeQueryDcl],
  },
];
// const systemInstruction = `Your a business analytis engineer, plese generate formatted resposes extracting information from the database. Only use information that you learn from SQLite, do not make up information. Always use the names coming from the getTables tool.`;
// const systemInstruction = `Your a business analytis engineer, plese generate formatted resposes extracting information from the database. Only use information that you learn from SQLite, do not make up information. Use the information from the history to reduce the calls to get the database schema.`;
// const systemInstruction = `Your a business analytis engineer, plese generate formatted resposes extracting information from the database. Only use information that you learn from SQLite, do not make up information. If the tables or table schema are available in the history, use them to reduce the calls to the database. Otherwise, use the available tools to get the information.`;
const systemInstruction = `Act as a business analytis engineer, plese generate formatted resposes extracting information from the SQLite database.
### INSTRUCTIONS ###
- Only use information that you learn from SQLite.
- Refrain from making up information.
- If the availble table names are needed, use the getTables tool to get the table names.
- If the tables or table schema are available in the history, use them to reduce the calls to the database. Otherwise, use the available tools to get the information.

### OUTPUT FORMAT ###
- Use markdown tables to format the responses.
- Include a summary of the information extracted from the database.`;

const model = genAI.getGenerativeModel(
  {
    model: process.env.GEMINI_MODEL!!,
    tools,
    // toolConfig: {
    //   functionCallingConfig: {
    //     mode: FunctionCallingMode.ANY,
    //   },
    // },
    // systemInstruction: {
    //   role: "system",
    //   parts: [{ text: systemInstruction }],
    // },
    generationConfig: {
      temperature: 0,
    },
  },
  { apiVersion: "v1beta" }
);

let count = 0;
const history: Content[] = [];

async function handlePrompt(
  userInput: string = "Generate a list of the students in the sudent table"
) {
  const prompt = `${systemInstruction}. ${userInput}`;

  const chat = model.startChat({
    history,
  });

  let functionCallingInProcess = true;
  let result = await chat.sendMessage(prompt);

  while (functionCallingInProcess) {
    count++;
    const functionCalls = result?.response?.functionCalls() || [];
    // console.dir(result, { depth: null });
    // console.log(count, functionCalls);

    if (functionCalls?.length === 0) {
      functionCallingInProcess = false;
      break;
    }

    const apiResponses: FunctionResponsePart[] = [];
    for await (const { name, args } of functionCalls) {
      console.log("functionCall", { name, args });

      const response = await functions[name](args);
      // console.log(name, response);

      apiResponses.push({
        functionResponse: {
          name,
          response: {
            content: response,
          },
        },
      });
    }

    result = await chat.sendMessage(apiResponses);
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
