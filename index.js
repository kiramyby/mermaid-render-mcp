import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import pako from "pako";
import axios from "axios";

class MermaidMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: "mermaid-render-mcp",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "render_mermaid",
            description: "Render a Mermaid diagram to PNG or SVG using mermaid.ink",
            inputSchema: {
              type: "object",
              properties: {
                mermaid_code: {
                  type: "string",
                  description: "The Mermaid diagram code to render",
                },
                format: {
                  type: "string",
                  enum: ["png", "svg"],
                  default: "png",
                  description: "The output format (png or svg)",
                },
              },
              required: ["mermaid_code"],
            },
          },
          {
            name: "encode_mermaid",
            description: "Encode Mermaid code to the format used by mermaid.ink",
            inputSchema: {
              type: "object",
              properties: {
                mermaid_code: {
                  type: "string",
                  description: "The Mermaid diagram code to encode",
                },
              },
              required: ["mermaid_code"],
            },
          },
          {
            name: "decode_mermaid",
            description: "Decode an encoded Mermaid string from mermaid.ink format",
            inputSchema: {
              type: "object",
              properties: {
                encoded_string: {
                  type: "string",
                  description: "The encoded string to decode (with or without 'pako:' prefix)",
                },
              },
              required: ["encoded_string"],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "render_mermaid":
            return await this.renderMermaid(args.mermaid_code, args.format || "png");
          case "encode_mermaid":
            return await this.encodeMermaid(args.mermaid_code);
          case "decode_mermaid":
            return await this.decodeMermaid(args.encoded_string);
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        throw new McpError(
          ErrorCode.InternalError,
          `Error executing tool ${name}: ${error.message}`
        );
      }
    });
  }

  encodeMermaidCode(mermaidCode) {
    // Create a JSON object with the mermaid code
    const graphDefinition = {
      code: mermaidCode,
      mermaid: {
        theme: "default"
      }
    };

    // Convert to JSON string
    const jsonString = JSON.stringify(graphDefinition);
    
    // Compress using pako (deflate)
    const compressed = pako.deflate(jsonString, { to: "string" });
    
    // Convert to base64
    const base64 = Buffer.from(compressed, "binary").toString("base64");
    
    // Make URL safe
    const urlSafe = base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
    
    return `pako:${urlSafe}`;
  }

  decodeMermaidCode(encodedString) {
    try {
      // Remove 'pako:' prefix if present
      const base64String = encodedString.replace(/^pako:/, "");
      
      // Make base64 URL-safe characters back to standard base64
      const standardBase64 = base64String.replace(/-/g, "+").replace(/_/g, "/");
      
      // Add padding if needed
      const padding = "=".repeat((4 - standardBase64.length % 4) % 4);
      const paddedBase64 = standardBase64 + padding;
      
      // Convert from base64 to binary
      const compressed = Buffer.from(paddedBase64, "base64").toString("binary");
      
      // Decompress using pako
      const decompressed = pako.inflate(compressed, { to: "string" });
      
      // Parse JSON
      const graphDefinition = JSON.parse(decompressed);
      
      return graphDefinition.code || graphDefinition;
    } catch (error) {
      throw new Error(`Failed to decode mermaid string: ${error.message}`);
    }
  }

  async renderMermaid(mermaidCode, format = "png") {
    try {
      const encoded = this.encodeMermaidCode(mermaidCode);
      const baseUrl = format === "svg" ? "https://mermaid.ink/svg" : "https://mermaid.ink/img";
      const imageUrl = `${baseUrl}/${encoded}`;

      // Test if the URL is accessible
      const response = await axios.head(imageUrl, { timeout: 10000 });
      
      if (response.status === 200) {
        return {
          content: [
            {
              type: "text",
              text: `Mermaid diagram rendered successfully!\n\nImage URL: ${imageUrl}\n\nEncoded string: ${encoded}\n\nYou can use this URL directly in your applications or save the image.`,
            },
          ],
        };
      } else {
        throw new Error(`Failed to render diagram. HTTP status: ${response.status}`);
      }
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        throw new Error("Request timeout. The mermaid.ink service might be slow or unavailable.");
      }
      throw new Error(`Failed to render Mermaid diagram: ${error.message}`);
    }
  }

  async encodeMermaid(mermaidCode) {
    try {
      const encoded = this.encodeMermaidCode(mermaidCode);
      
      return {
        content: [
          {
            type: "text",
            text: `Mermaid code encoded successfully!\n\nEncoded string: ${encoded}\n\nYou can use this with mermaid.ink:\n- PNG: https://mermaid.ink/img/${encoded}\n- SVG: https://mermaid.ink/svg/${encoded}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to encode Mermaid code: ${error.message}`);
    }
  }

  async decodeMermaid(encodedString) {
    try {
      const decoded = this.decodeMermaidCode(encodedString);
      
      return {
        content: [
          {
            type: "text",
            text: `Mermaid code decoded successfully!\n\nDecoded code:\n\`\`\`mermaid\n${decoded}\n\`\`\``,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to decode Mermaid string: ${error.message}`);
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Mermaid MCP Server running on stdio");
  }
}

const server = new MermaidMCPServer();
server.run().catch(console.error);

export { MermaidMCPServer };
