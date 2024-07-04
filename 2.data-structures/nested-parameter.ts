import {
  FunctionDeclaration,
  FunctionDeclarationSchemaType,
  GoogleGenerativeAI,
} from "@google/generative-ai";

interface Tools {
  functionDeclarations: FunctionDeclaration[];
}

export const genAI = new GoogleGenerativeAI(process.env.API_KEY || "");

(async () => {
  function createProductListing({
    product,
  }: {
    product: Array<{
      name: string;
      brand: string;
      price: number;
      category: string;
      description: string;
      colors: Array<{ color: string }>;
    }>;
  }): any {
    return `Product listing created for ${product.length} products`;
  }

  const functions: { [name: string]: Function } = {
    createProductListing,
  };

  const tools: Tools[] = [
    {
      functionDeclarations: [
        {
          name: "createProductListing",
          description:
            "Create a product listing using the details provided by the user",
          parameters: {
            type: FunctionDeclarationSchemaType.OBJECT,
            properties: {
              product: {
                type: FunctionDeclarationSchemaType.ARRAY,
                items: {
                  type: FunctionDeclarationSchemaType.OBJECT,
                  properties: {
                    name: {
                      type: FunctionDeclarationSchemaType.STRING,
                    },
                    brand: {
                      type: FunctionDeclarationSchemaType.STRING,
                    },
                    price: {
                      type: FunctionDeclarationSchemaType.NUMBER,
                    },
                    category: {
                      type: FunctionDeclarationSchemaType.STRING,
                    },
                    description: {
                      type: FunctionDeclarationSchemaType.STRING,
                    },
                    colors: {
                      type: FunctionDeclarationSchemaType.ARRAY,
                      items: {
                        type: FunctionDeclarationSchemaType.OBJECT,
                        properties: {
                          color: { type: FunctionDeclarationSchemaType.STRING },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      ],
    },
  ];

  const model = genAI.getGenerativeModel(
    { model: "gemini-1.5-flash-latest", tools },
    { apiVersion: "v1beta" }
  );

  // >>>> First turn
  const promptTurn1 = {
    role: "user",
    parts: [
      {
        text:
          "Create a listing for noise-canceling headphones for $149.99.\n" +
          "These headphones create a distraction-free environment.\n" +
          "Available colors include black, white, and red.",
      },
    ],
  };

  const resultTurn1 = await model.generateContent({
    contents: [promptTurn1],
  });
  const responseTurn1 = resultTurn1.response;
  //   console.dir(response, { depth: null });

  if (responseTurn1?.candidates?.length === 0) {
    throw new Error("No candidates");
  }

  const content = resultTurn1?.response?.candidates?.[0]?.content;
  if (content?.parts.length === 0) {
    throw new Error("No parts");
  }
  // <<<< First turn

  // >>>> Second turn
  const functionCall = content?.parts[0].functionCall;

  if (functionCall) {
    console.dir(functionCall, { depth: null });
    const { name, args } = functionCall;
    const functionRef = functions[name];

    if (!functionRef) {
      throw new Error(`Unknown function "${name}"`);
    }

    const functionResponse = {
      role: "function",
      parts: [
        {
          functionResponse: {
            name,
            response: {
              content: functionRef(args),
            },
          },
        },
      ],
    };
    const promptTurn2 = {
      contents: [promptTurn1, content, functionResponse],
    };
    const responseTurn2 = await model.generateContent(promptTurn2);
    console.log(responseTurn2.response.text());
    // <<<< Second turn
  } else {
    const text = content?.parts.map(({ text }) => text).join("");
    if (text) {
      console.log(text);
    }
  }
})();
