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
  function getDestination({
    destination,
    modeOfTransportation,
    departureTime,
  }: {
    destination: string;
    modeOfTransportation: string;
    departureTime: string;
  }): any {
    return {
      destination,
      directions: [
        `Leve at ${departureTime} from your location`,
        `Take the ${modeOfTransportation} in direction to the north`,
        "Get off the train at the last stop",
        "Take the first left",
        "Continue straight for 2 miles",
        "Take the second right",
        "You have arrived at your destination",
      ],
    };
  }

  const functions: { [name: string]: Function } = {
    getDestination,
  };

  const tools: Tools[] = [
    {
      functionDeclarations: [
        {
          name: "getDestination",
          description: "Get directions to a destination",
          parameters: {
            type: FunctionDeclarationSchemaType.OBJECT,
            properties: {
              destination: {
                type: FunctionDeclarationSchemaType.STRING,
                description: "Destination that the user wants to go to",
              },
              modeOfTransportation: {
                type: FunctionDeclarationSchemaType.STRING,
                description: "Mode of transportation to use",
              },
              departureTime: {
                type: FunctionDeclarationSchemaType.STRING,
                description:
                  "Time that the user will leave for the destination",
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
        text: "I'd like to travel to Paris by train and leave at 9:00 am",
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
    console.log("functionCall", functionCall);
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
