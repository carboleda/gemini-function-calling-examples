import {
  FunctionDeclaration,
  SchemaType,
  GoogleGenerativeAI,
} from "@google/generative-ai";

interface Tools {
  functionDeclarations: FunctionDeclaration[];
}

export const genAI = new GoogleGenerativeAI(process.env.API_KEY || "");

(async () => {
  function getMultipleLocationCoordinates({
    locations,
  }: {
    locations: Array<{
      pointOfInterest: string;
      city: string;
      country: string;
    }>;
  }): any {
    const coordinates = [
      { lat: 48.8584, lon: 2.2945 },
      { lat: 40.6892, lon: -74.0445 },
      { lat: -16.4833, lon: 145.4667 },
    ];
    return locations.map((l, index) => ({
      pointOfInterest: l.pointOfInterest,
      lat: coordinates[index % locations.length].lat,
      lon: coordinates[index % locations.length].lon,
    }));
  }

  const functions: { [name: string]: Function } = {
    getMultipleLocationCoordinates,
  };

  const tools: Tools[] = [
    {
      functionDeclarations: [
        {
          name: "getMultipleLocationCoordinates",
          description: "Get coordinates of multiple locations",
          parameters: {
            type: SchemaType.OBJECT,
            properties: {
              locations: {
                type: SchemaType.ARRAY,
                description: "A list of locations",
                items: {
                  description: "Components of the location",
                  type: SchemaType.OBJECT,
                  properties: {
                    pointOfInterest: {
                      type: SchemaType.STRING,
                      description: "Name or type of point of interest",
                    },
                    city: {
                      type: SchemaType.STRING,
                      description: "City",
                    },
                    country: {
                      type: SchemaType.STRING,
                      description: "Country",
                    },
                  },
                  required: ["pointOfInterest", "city", "country"],
                },
              },
            },
          },
        },
      ],
    },
  ];

  const model = genAI.getGenerativeModel(
    { model: process.env.GEMINI_MODEL!!, tools },
    { apiVersion: "v1beta" }
  );

  // >>>> First turn
  const promptTurn1 = {
    role: "user",
    parts: [
      {
        text:
          "I'd like to get the coordinates for\n" +
          "the Eiffel tower in Paris,\n" +
          "the statue of liberty in New York,\n" +
          "and Port Douglas near the Great Barrier Reef.",
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
