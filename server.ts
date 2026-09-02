import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "20mb" }));

// Lazy Gemini client helper
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not set.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    framework: "NIO DeepOcean-Transformer",
    channels: 7,
    depths: 15,
    spatial_bounds: { lat: [5, 30], lon: [45, 105], resolution: 0.25 },
  });
});

// AI Oceanographic Diagnostics Endpoint using Gemini
app.post("/api/gemini/analyze", async (req, res) => {
  try {
    const {
      regionName,
      coordinates,
      surfaceConditions,
      subsurfaceProfile,
      cycloneRiskMetrics,
      customQuery,
    } = req.body;

    const ai = getGeminiClient();

    const systemInstruction = `You are a Senior Oceanographic AI Research Scientist & Tropical Marine Dynamicist specializing in the Northern Indian Ocean (Arabian Sea, Bay of Bengal, and Equatorial Indian Ocean).
You analyze 3D subsurface temperature reconstructions predicted by a CNN-Transformer deep learning model (7 satellite surface channels: SST, SSS, SSH, Geostrophic Currents U/V, 10m Wind U/V to 15 vertical depth layers: 0m to 1000m).

Provide rigorous, physics-informed oceanographic insights covering:
1. Subsurface Thermal Structure & Thermocline Dynamics (D20, D26, Mixed Layer Depth MLD, Barrier Layer thickness in BoB or Arabian Sea).
2. Ocean Heat Content & Tropical Cyclone Heat Potential (TCHP in kJ/cm²), explaining cyclone rapid intensification potential.
3. Mesoscale Eddies & Upwelling Dynamics (Somali Upwelling, Great Whirl, Sri Lanka Dome, East India Coastal Current).
4. Validation & Confidence Analysis (comparing Transformer prediction with GLORYS12V1 reanalysis and in-situ Argo floats).

Keep explanations clear, structured, scientifically precise, and actionable.`;

    const prompt = `Analyze the following oceanographic state in the Northern Indian Ocean:
Region: ${regionName || "Northern Indian Ocean Point"}
Coordinates: Lat ${coordinates?.lat?.toFixed(2)}°N, Lon ${coordinates?.lon?.toFixed(2)}°E
Surface Satellite Inputs:
- Sea Surface Temperature (SST): ${surfaceConditions?.sst?.toFixed(2)} °C
- Sea Surface Salinity (SSS): ${surfaceConditions?.sss?.toFixed(2)} PSU
- Sea Surface Height Anomaly (SSH/SLA): ${surfaceConditions?.ssh?.toFixed(3)} m
- Surface Geostrophic Velocity (U, V): (${surfaceConditions?.u_curr?.toFixed(2)}, ${surfaceConditions?.v_curr?.toFixed(2)}) m/s
- 10m Wind Velocity (U, V): (${surfaceConditions?.u_wind?.toFixed(2)}, ${surfaceConditions?.v_wind?.toFixed(2)}) m/s

Reconstructed Subsurface Features:
- 26°C Isotherm Depth (D26): ${subsurfaceProfile?.d26?.toFixed(1)} m
- 20°C Isotherm Depth (D20 / Main Thermocline): ${subsurfaceProfile?.d20?.toFixed(1)} m
- Mixed Layer Depth (MLD): ${subsurfaceProfile?.mld?.toFixed(1)} m
- Tropical Cyclone Heat Potential (TCHP): ${cycloneRiskMetrics?.tchp?.toFixed(1)} kJ/cm²
- 100m Temperature: ${subsurfaceProfile?.tempAt100m?.toFixed(2)} °C
- 500m Temperature: ${subsurfaceProfile?.tempAt500m?.toFixed(2)} °C

User specific focus / question: ${customQuery || "Provide a comprehensive oceanographic diagnostic assessment and cyclone heat risk analysis for this location."}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    res.json({
      insight: response.text || "No response generated.",
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Gemini ocean analysis error:", error);
    res.status(500).json({
      error: error.message || "Failed to generate oceanographic analysis.",
      fallbackInsight:
        "The reconstructed profile indicates strong thermal stratification with a shallow thermocline in upwelling zones, while the Bay of Bengal exhibits significant freshwater capping resulting in a pronounced barrier layer and elevated Tropical Cyclone Heat Potential (>75 kJ/cm²).",
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`DeepOcean NIO Server running on port ${PORT}`);
  });
}

startServer();
