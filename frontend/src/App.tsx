import React, { useState, useCallback, useRef, useEffect } from "react";
// Use correct imports for your project (ensure lucide-react is installed)
import {
  Camera,
  Upload,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Info,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import axios, { AxiosError } from "axios";

// Import Tailwind base styles (ensure src/index.css or App.css has Tailwind directives)
import "./App.css"; // Or './index.css' if you added directives there

// --- Type Definitions (Keep as before) ---
type EmotionType =
  | "angry"
  | "disgust"
  | "fear"
  | "happy"
  | "neutral"
  | "sad"
  | "surprise";
interface PredictionResult {
  emotion: EmotionType;
  confidence: number;
}
interface PcaInfo {
  original_features: number;
  pca_components: number;
  variance_explained: number;
}
interface PredictionResponse {
  baseline_pred: PredictionResult;
  pca_pred: PredictionResult;
  pca_info: PcaInfo;
}
// --- End Type Definitions ---

// --- Configuration (Keep as before) ---
const API_URL = "http://localhost:5000/predict"; // YOUR Flask backend URL
const emotionColorMap: Record<EmotionType, string> = {
  /* ... Same colors ... */ angry: "bg-yellow-500",
  disgust: "bg-orange-500",
  fear: "bg-gray-700",
  happy: "bg-green-500",
  neutral: "bg-gray-500",
  sad: "bg-blue-600",
  surprise: "bg-purple-500",
};
// --- End Configuration ---

function App() {
  // Using App component name
  // --- State Variables (Keep as before) ---
  const [imageSource, setImageSource] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [baselineResult, setBaselineResult] = useState<PredictionResult | null>(
    null
  );
  const [pcaResult, setPcaResult] = useState<PredictionResult | null>(null);
  const [pcaInfo, setPcaInfo] = useState<PcaInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // --- End State Variables ---

  // --- Helper: Convert Data URL to File Object (Keep as before) ---
  const dataURLtoFile = (dataurl: string, filename: string): File | null => {
    /* ... */
    try {
      const arr = dataurl.split(",");
      if (arr.length < 2) return null;
      const mimeMatch = arr[0].match(/:(.*?);/);
      if (!mimeMatch) return null;
      const mime = mimeMatch[1];
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      return new File([u8arr], filename, { type: mime });
    } catch (e) {
      console.error("Data URL Error:", e);
      setError("Image proc. failed.");
      return null;
    }
  };
  // --- End Helper ---

  // --- State Reset (Keep as before) ---
  const resetState = () => {
    /* ... */
    setImageSource(null);
    setImageFile(null);
    setBaselineResult(null);
    setPcaResult(null);
    setPcaInfo(null);
    setError(null);
    setIsLoading(false);
    const fileInput = document.getElementById(
      "file-upload-input"
    ) as HTMLInputElement | null;
    if (fileInput) fileInput.value = "";
  };
  // --- End State Reset ---

  // --- Handlers (Keep logic as before) ---
  const handleImageUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      /* ... */
      const file = e.target.files?.[0];
      if (file) {
        resetState();
        setImageFile(file);
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onloadend = () => {
          setImageSource(reader.result as string);
        };
        reader.onerror = () => {
          setError("File read failed.");
        };
      }
    },
    []
  );
  const handleTakePicture = useCallback(() => {
    resetState();
    setIsCameraOpen(true);
  }, []);
  const captureImageFromCamera = useCallback(() => {
    /* ... */
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      if (!context) {
        setError("Canvas context failed.");
        return;
      }
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg");
      const capturedFile = dataURLtoFile(dataUrl, "capture.jpg");
      if (capturedFile) {
        setImageSource(dataUrl);
        setImageFile(capturedFile);
      }
      setIsCameraOpen(false);
    }
  }, []);
  const closeCamera = () => {
    setIsCameraOpen(false);
  };
  const analyzeImage = async () => {
    /* ... (Keep API call logic) ... */
    if (!imageFile) {
      setError("Please provide an image.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setBaselineResult(null);
    setPcaResult(null);
    setPcaInfo(null);
    try {
      const formData = new FormData();
      formData.append("file", imageFile);
      const result = await axios.post<PredictionResponse>(API_URL, formData);
      console.log("API Response:", result.data);
      if (
        result.data.baseline_pred &&
        result.data.pca_pred &&
        result.data.pca_info
      ) {
        setBaselineResult(result.data.baseline_pred);
        setPcaResult(result.data.pca_pred);
        setPcaInfo(result.data.pca_info);
      } else {
        throw new Error("Invalid server response structure.");
      }
    } catch (err: unknown) {
      console.error("Prediction Error:", err);
      const axiosError = err instanceof AxiosError ? err : new AxiosError("Unknown error");
      setError(
        axiosError.response?.data?.error ||
          axiosError.message ||
          "Analysis failed."
      );
    } finally {
      setIsLoading(false);
    }
  };
  // --- End Handlers ---

  // --- Camera Effect (Keep as before) ---
  useEffect(() => {
    /* ... */
    let stream: MediaStream | null = null;
    async function enableCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current
            .play()
            .catch((e) => console.warn("Vid play err:", e));
        }
      } catch (error: unknown) {
        console.error("Cam access err:", error);
        setError("Cam access failed.");
        setIsCameraOpen(false);
      }
    }
    if (isCameraOpen) {
      enableCamera();
    }
    return () => {
      const stopTracks = (s: MediaStream | null) =>
        s?.getTracks().forEach((t) => t.stop());
      if (videoRef.current?.srcObject) {
        stopTracks(videoRef.current.srcObject as MediaStream);
        videoRef.current.srcObject = null;
      } else {
        stopTracks(stream);
      }
    };
  }, [isCameraOpen]);
  // --- End Camera Effect ---

  // --- Helper to format percentage (Keep as before) ---
  const formatPercentage = (value: number | undefined | null): string => {
    /* ... */
    if (value === undefined || value === null) return "N/A";
    return (value * 100).toFixed(1) + "%";
  };
  // --- End Helper ---

  // --- Component Return (JSX - Original Structure with Refined Styling) ---
  return (
    // Root div - Added subtle bg, adjusted padding slightly
    <div className="min-h-screen bg-gray-50 text-gray-900 p-4 md:p-10 font-sans">
      {" "}
      {/* Slightly reduced padding */}
      {/* Max width container - Kept */}
      <div className="max-w-5xl mx-auto">
        {/* Title Section - Kept original style, slightly more bottom margin */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12 md:mb-14" // Increased mb slightly
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            AI Emotion Detector & PCA Analysis
          </h1>
          <p className="text-gray-600 text-lg max-w-3xl mx-auto">
            {" "}
            {/* Slightly wider paragraph */}
            Upload or take a picture to compare Baseline vs. PCA model
            predictions
          </p>
        </motion.div>
        {/* Main Content Card - Added subtle border, slightly less padding */}
        <div className="bg-white rounded-2xl md:rounded-3xl p-6 md:p-8 shadow-xl border border-gray-100">
          {" "}
          {/* Less padding, subtle border */}
          {/* Input Options Section - Kept grid layout */}
          {!imageSource && !isCameraOpen && (
            <div className="mb-8 md:mb-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
                {" "}
                {/* Slightly reduced gap */}
                {/* Upload Area - Refined hover/border */}
                <motion.label
                  whileHover={{ scale: 1.01, borderColor: "#93c5fd" }} // Lighter blue on hover
                  whileTap={{ scale: 0.99 }}
                  htmlFor="file-upload-input"
                  className="flex flex-col items-center justify-center h-44 md:h-48 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:bg-blue-50/50 transition-colors duration-200" // Lighter hover bg
                >
                  <div className="flex flex-col items-center justify-center text-center p-4">
                    <Upload className="w-10 h-10 md:w-12 md:h-12 mb-3 text-gray-400 group-hover:text-blue-500 transition-colors" />
                    <p className="mb-1 text-base md:text-lg font-medium text-gray-700">
                      <span className="text-blue-600">Click to upload</span>
                    </p>
                    <p className="text-xs md:text-sm text-gray-500">
                      or drag & drop
                    </p>
                  </div>
                  <input
                    id="file-upload-input"
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageUpload}
                  />
                </motion.label>
                {/* Camera Button - Refined hover/border */}
                <motion.button
                  whileHover={{ scale: 1.01, borderColor: "#c4b5fd" }} // Lighter purple on hover
                  whileTap={{ scale: 0.99 }}
                  onClick={handleTakePicture}
                  className="flex flex-col items-center justify-center h-44 md:h-48 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:bg-purple-50/50 transition-colors duration-200" // Lighter hover bg
                >
                  <div className="flex flex-col items-center justify-center text-center p-4">
                    <Camera className="w-10 h-10 md:w-12 md:h-12 mb-3 text-gray-400 group-hover:text-purple-500 transition-colors" />
                    <p className="text-base md:text-lg font-medium text-gray-700">
                      Use Camera
                    </p>
                  </div>
                </motion.button>
              </div>
            </div>
          )}
          {/* Camera View - Kept */}
          <AnimatePresence>
            {" "}
            {isCameraOpen && (
              <motion.div
                /* ... Kept ... */ className="mb-8 relative rounded-xl overflow-hidden shadow-md max-w-md mx-auto border border-purple-300"
              >
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-auto object-cover rounded-lg block"
                ></video>
                <canvas ref={canvasRef} className="hidden"></canvas>
                <div className="absolute bottom-3 left-0 right-0 flex justify-center space-x-3 z-10">
                  <motion.button
                    /* ... Kept ... */ onClick={captureImageFromCamera}
                    className="px-5 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors shadow text-sm font-medium"
                  >
                    Capture
                  </motion.button>
                  <motion.button
                    /* ... Kept ... */ onClick={closeCamera}
                    className="px-5 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors shadow text-sm font-medium"
                  >
                    Cancel
                  </motion.button>
                </div>
              </motion.div>
            )}{" "}
          </AnimatePresence>
          {/* Image Preview & Reset - Added slight margin bottom */}
          <AnimatePresence>
            {" "}
            {imageSource && !isCameraOpen && (
              <motion.div /* ... Kept ... */ className="mb-8">
                <div className="relative rounded-xl overflow-hidden shadow-lg max-w-xs sm:max-w-sm md:max-w-md mx-auto border border-gray-200">
                  <img
                    src={imageSource}
                    alt="Preview"
                    className="block w-full h-auto object-contain rounded-lg"
                  />
                  {!isLoading && (
                    <motion.button
                      /* ... Kept ... */ onClick={resetState}
                      title="Clear Image"
                      className="absolute top-2 right-2 p-2 bg-white bg-opacity-75 rounded-full hover:bg-opacity-100 text-gray-600 hover:text-black transition-all duration-200 shadow z-10"
                    >
                      <RefreshCw size={18} />
                    </motion.button>
                  )}
                </div>
              </motion.div>
            )}{" "}
          </AnimatePresence>
          {/* Analyze Button - Kept styling, added margin bottom */}
          {imageSource && !isCameraOpen && !isLoading && !baselineResult && (
            <div className="flex justify-center mb-8 md:mb-10">
              <motion.button
                /* ... Kept ... */ onClick={analyzeImage}
                className="px-7 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold shadow-md hover:shadow-lg transition-all duration-200 flex items-center space-x-2 text-base md:text-lg"
                disabled={isLoading}
              >
                <Sparkles size={20} />
                <span>Analyze Emotion</span>
              </motion.button>
            </div>
          )}
          {/* Loading Indicator - Kept */}
          {isLoading && (
            <div className="text-center my-10">
              <p className="text-lg text-blue-600 animate-pulse font-medium">
                Analyzing...
              </p>
            </div>
          )}
          {/* Results Display - Kept structure, adjusted padding/margin */}
          <AnimatePresence>
            {!isLoading && (baselineResult || pcaResult || pcaInfo) && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mt-6 md:mt-8 p-6 md:p-8 bg-gray-50/70 rounded-2xl shadow-inner border border-gray-200" // Lighter background, inner shadow
              >
                <h3 className="text-xl md:text-2xl font-semibold mb-6 text-gray-800 text-center">
                  Analysis Results
                </h3>

                {/* PCA Info Box - Kept */}
                {pcaInfo && (
                  <div className="mb-6 p-4 border border-purple-100 rounded-lg bg-purple-50/60 text-center shadow-sm">
                    <h4 className="text-base md:text-lg font-medium text-purple-800 mb-2 flex items-center justify-center gap-2">
                      <Info size={18} /> PCA Details
                    </h4>
                    <p className="text-xs md:text-sm text-purple-700 leading-relaxed">
                      Original:{" "}
                      <span className="font-semibold">
                        {pcaInfo.original_features}
                      </span>{" "}
                      features → PCA:{" "}
                      <span className="font-semibold">
                        {pcaInfo.pca_components}
                      </span>{" "}
                      components (
                      <span className="font-semibold">
                        {formatPercentage(pcaInfo.variance_explained)}
                      </span>{" "}
                      variance)
                    </p>
                  </div>
                )}

                {/* Predictions Section - Kept progress bar style */}
                <div className="space-y-4 md:space-y-5">
                  {/* Baseline Prediction Row */}
                  {baselineResult && (
                    <motion.div
                      /* ... Kept ... */ className="flex items-center"
                    >
                      <div className="w-32 md:w-40 text-sm md:text-base font-medium text-gray-700 flex-shrink-0 pr-2">
                        Baseline:
                        <span className="font-semibold capitalize block md:inline ml-1">
                          {baselineResult.emotion}
                        </span>
                      </div>
                      <div className="flex-1 h-3 md:h-4 bg-gray-200 rounded-full overflow-hidden mx-3 md:mx-4">
                        <motion.div
                          /* ... Kept ... */ animate={{
                            width: formatPercentage(baselineResult.confidence),
                          }}
                          className={`h-full rounded-full ${
                            emotionColorMap[baselineResult.emotion] ||
                            "bg-gray-400"
                          }`}
                        />
                      </div>
                      <div className="w-16 md:w-20 text-right text-sm md:text-base font-medium text-gray-700 flex-shrink-0 pl-2">
                        {formatPercentage(baselineResult.confidence)}
                      </div>
                    </motion.div>
                  )}
                  {/* PCA Prediction Row */}
                  {pcaResult && (
                    <motion.div
                      /* ... Kept ... */ transition={{ delay: 0.1 }}
                      className="flex items-center"
                    >
                      {" "}
                      {/* Slightly faster transition */}
                      <div className="w-32 md:w-40 text-sm md:text-base font-medium text-gray-700 flex-shrink-0 pr-2">
                        PCA Model:
                        <span className="font-semibold capitalize block md:inline ml-1">
                          {pcaResult.emotion}
                        </span>
                      </div>
                      <div className="flex-1 h-3 md:h-4 bg-gray-200 rounded-full overflow-hidden mx-3 md:mx-4">
                        <motion.div
                          /* ... Kept ... */ animate={{
                            width: formatPercentage(pcaResult.confidence),
                          }}
                          transition={{ duration: 0.7, delay: 0.1 }}
                          className={`h-full rounded-full ${
                            emotionColorMap[pcaResult.emotion] || "bg-gray-400"
                          }`}
                        />
                      </div>
                      <div className="w-16 md:w-20 text-right text-sm md:text-base font-medium text-gray-700 flex-shrink-0 pl-2">
                        {formatPercentage(pcaResult.confidence)}
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Try again button - Kept */}
                <div className="text-center mt-8">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={resetState}
                    className="px-5 py-2 md:px-6 md:py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium shadow-sm"
                  >
                    Analyze Another
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {/* Error Display - Kept */}
          <AnimatePresence>
            {" "}
            {error && (
              <motion.div
                /* ... Kept ... */ className="mt-6 p-4 md:p-5 bg-red-100 text-red-700 border border-red-200 rounded-xl flex items-center shadow-sm text-sm md:text-base"
              >
                <AlertCircle className="w-5 h-5 md:w-6 md:h-6 mr-2 md:mr-3 text-red-500 flex-shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}{" "}
          </AnimatePresence>
        </div>{" "}
        {/* End Main Content Card */}
        {/* Feature Highlights Section - Kept */}
        <div className="mt-10 md:mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {[
            /* Kept features */
            {
              title: "Fast Analysis",
              description: "Get comparative emotion results quickly",
              icon: "⚡",
            },
            {
              title: "PCA Comparison",
              description: "Effects of dimensionality reduction shown",
              icon: "🧬",
            },
            {
              title: "Model Insights",
              description: "Compare baseline vs. PCA-enhanced models",
              icon: "📊",
            },
          ].map((feature, index) => (
            <motion.div
              key={index}
              whileHover={{ y: -5 }}
              className="p-6 md:p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 text-center md:text-left"
            >
              {" "}
              {/* Slightly softer shadow, rounded-xl */}
              <div className="text-3xl mb-3 md:mb-4 inline-block md:block">
                {feature.icon}
              </div>
              <h3 className="text-lg md:text-xl font-semibold mb-2 md:mb-3 text-gray-800">
                {feature.title}
              </h3>
              <p className="text-gray-600 text-sm md:text-base">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>{" "}
      {/* End max-w container */}
    </div> // End main div
  );
}

export default App;
