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

// --- Type Definitions ---
// Use lowercase emotion names matching your backend's emotion_map_list
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
  confidence: number; // Confidence score (0-1)
}

interface PcaInfo {
  original_features: number;
  pca_components: number;
  variance_explained: number; // Variance explained (0-1)
}

// Expected structure of the JSON response from YOUR Flask backend
interface PredictionResponse {
  baseline_pred: PredictionResult;
  pca_pred: PredictionResult;
  pca_info: PcaInfo;
}
// --- End Type Definitions ---

// --- Configuration ---
const API_URL = "http://localhost:5000/predict"; // YOUR Flask backend URL

// Define colors based on lowercase emotion names, matching original desired UI where possible
const emotionColorMap: Record<EmotionType, string> = {
  angry: "bg-yellow-500", // Using yellow like original
  disgust: "bg-orange-500", // Using orange like original
  fear: "bg-gray-700", // Using gray like original
  happy: "bg-green-500", // Using green like original
  neutral: "bg-gray-500", // Using gray like original
  sad: "bg-blue-600", // Using blue instead of red for sad
  surprise: "bg-purple-500", // Using purple like original
};
// --- End Configuration ---

// Using App component name for standard CRA setup
function App() {
  // State variables adapted for our backend response
  const [imageSource, setImageSource] = useState<string | null>(null); // Data URL for preview
  const [imageFile, setImageFile] = useState<File | null>(null); // File object for sending
  const [baselineResult, setBaselineResult] = useState<PredictionResult | null>(
    null
  );
  const [pcaResult, setPcaResult] = useState<PredictionResult | null>(null);
  const [pcaInfo, setPcaInfo] = useState<PcaInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null); // Canvas for camera capture
  // REMOVED imageRef - not needed as we don't draw boxes

  // --- Helper: Convert Data URL to File Object ---
  const dataURLtoFile = (dataurl: string, filename: string): File | null => {
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

  // --- State Reset ---
  // Renamed from resetDetection to resetState for clarity
  const resetState = () => {
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

  // --- Handlers (Upload, Camera, Close - logic is the same) ---
  const handleImageUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
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
  }, []); // Dependencies removed as refs/setError/etc are stable
  const closeCamera = () => {
    setIsCameraOpen(false);
  };
  // --- End Handlers ---

  // --- detectEmotions: MODIFIED API CALL AND STATE UPDATE ---
  // Renamed from detectEmotions to analyzeImage for clarity
  const analyzeImage = async () => {
    if (!imageFile) {
      setError("Please upload or take a picture first.");
      return;
    } // Check imageFile
    setIsLoading(true);
    setError(null);
    setBaselineResult(null);
    setPcaResult(null);
    setPcaInfo(null); // Clear all results

    try {
      const formData = new FormData();
      formData.append("file", imageFile); // Send the actual File

      // Call YOUR backend API
      const result = await axios.post<PredictionResponse>(API_URL, formData);

      console.log("API Response:", result.data);

      // Update state based on YOUR backend response structure
      if (
        result.data.baseline_pred &&
        result.data.pca_pred &&
        result.data.pca_info
      ) {
        setBaselineResult(result.data.baseline_pred);
        setPcaResult(result.data.pca_pred);
        setPcaInfo(result.data.pca_info);
      } else {
        throw new Error("Invalid response structure from server.");
      }
    } catch (err: any) {
      console.error("Error during prediction:", err);
      const axiosError = err as AxiosError<any>;
      setError(
        axiosError.response?.data?.error ||
          axiosError.message ||
          "Failed to analyze image."
      );
    } finally {
      setIsLoading(false);
    }
  };
  // --- End detectEmotions ---

  // --- Camera Effect (Keep exact same logic) ---
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
      } catch (error: any) {
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

  // --- Helper to format percentage ---
  const formatPercentage = (value: number | undefined | null): string => {
    if (value === undefined || value === null) return "N/A";
    return (value * 100).toFixed(1) + "%"; // Using 1 decimal place
  };
  // --- End Helper ---

  // --- Component Return (JSX - Using EmotionDetector's Structure/Styling) ---
  return (
    // Root div with background gradient and padding - Kept from EmotionDetector
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 text-gray-900 font-sans">
      {/* Max width container */}
      <div>
        {/* Title Section - Kept from EmotionDetector */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            AI Emotion Detector & PCA Analysis {/* Updated Title Text */}
          </h1>
          <p className="text-gray-600 text-lg">
            Upload or take a picture to compare Baseline vs. PCA model
            predictions
          </p>
        </motion.div>
        {/* Main Content Card - Kept from EmotionDetector */}
        <div className="bg-white rounded-3xl shadow-xl backdrop-blur-lg bg-opacity-90">
          {/* Input Options Section - Kept from EmotionDetector */}
          {!imageSource && !isCameraOpen && (
            <div className="mb-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Upload Area */}
                <motion.label
                  /* ... Kept ... */ htmlFor="file-upload-input"
                  className="flex flex-col items-center justify-center h-40 md:h-48 border-2 border-dashed border-blue-300 rounded-xl cursor-pointer hover:border-blue-400 transition-all duration-300 bg-gradient-to-br from-blue-50 to-purple-50 group"
                >
                  <div className="flex flex-col items-center justify-center p-6 md:p-8 group-hover:transform group-hover:scale-105 transition-transform duration-300">
                    <Upload className="w-10 h-10 md:w-12 md:h-12 mb-3 text-blue-500 group-hover:text-blue-600" />
                    <p className="mb-2 text-base md:text-lg text-gray-600">
                      <span className="font-semibold text-blue-600">
                        Click to upload
                      </span>{" "}
                      or drag & drop
                    </p>
                    <p className="text-xs md:text-sm text-gray-500">
                      PNG, JPG or JPEG
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
                {/* Camera Button */}
                <motion.button
                  /* ... Kept ... */ onClick={handleTakePicture}
                  className="flex flex-col items-center justify-center h-40 md:h-48 border-2 border-dashed border-purple-300 rounded-xl cursor-pointer hover:border-purple-400 transition-all duration-300 bg-gradient-to-br from-purple-50 to-pink-50 group"
                >
                  <Camera className="w-10 h-10 md:w-12 md:h-12 mb-3 text-purple-500 group-hover:text-purple-600 transition-colors duration-300" />
                  <p className="text-base md:text-lg text-gray-600 group-hover:text-purple-600 transition-colors duration-300">
                    Take a Picture
                  </p>
                </motion.button>
              </div>
            </div>
          )}

          {/* Camera View - Kept from EmotionDetector */}
          <AnimatePresence>
            {" "}
            {isCameraOpen && (
              <motion.div
                /* ... Kept ... */ className="mb-6 relative rounded-2xl overflow-hidden shadow-xl max-w-md mx-auto border-4 border-purple-200"
              >
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-auto object-cover rounded-lg"
                ></video>
                <canvas ref={canvasRef} className="hidden"></canvas>
                <div className="absolute bottom-3 left-0 right-0 flex justify-center space-x-4 z-10">
                  <motion.button
                    /* ... Kept ... */ onClick={captureImageFromCamera}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors shadow-lg text-base md:text-lg"
                  >
                    Capture
                  </motion.button>
                  <motion.button
                    /* ... Kept ... */ onClick={closeCamera}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shadow-lg text-base md:text-lg"
                  >
                    Cancel
                  </motion.button>
                </div>
              </motion.div>
            )}{" "}
          </AnimatePresence>

          {/* Image Preview & Reset - Kept structure from EmotionDetector, removed canvas */}
          <AnimatePresence>
            {" "}
            {imageSource && !isCameraOpen && (
              <motion.div /* ... Kept ... */ className="mb-6 md:mb-8">
                <div className="relative rounded-2xl overflow-hidden shadow-xl max-w-sm md:max-w-md mx-auto border-2 border-gray-200">
                  <img
                    src={imageSource}
                    alt="Preview"
                    className="w-full h-auto object-contain rounded-lg"
                  />
                  {/* Removed second canvas for bounding boxes */}
                  {/* Reset Button - Kept */}
                  {!isLoading && (
                    <motion.button
                      /* ... Kept ... */ onClick={resetState}
                      className="absolute top-2 right-2 md:top-4 md:right-4 p-2 md:p-3 bg-white bg-opacity-80 rounded-full hover:bg-opacity-100 transition-all duration-300 shadow-lg z-10"
                    >
                      <RefreshCw className="w-5 h-5 md:w-6 md:h-6 text-gray-700" />
                    </motion.button>
                  )}
                </div>
              </motion.div>
            )}{" "}
          </AnimatePresence>

          {/* Analyze Button - Kept structure/styling from EmotionDetector */}
          {imageSource && !isCameraOpen && !isLoading && !baselineResult && (
            <div className="flex justify-center mb-6 md:mb-8">
              <motion.button
                /* ... Kept ... */ disabled={isLoading}
                onClick={analyzeImage}
                className="px-6 py-3 md:px-8 md:py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl md:rounded-2xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all duration-300 flex items-center space-x-2 md:space-x-3 text-base md:text-lg"
              >
                <Sparkles className="w-5 h-5 md:w-6 md:h-6" />
                {/* Changed Text */}
                <span>{isLoading ? "Analyzing..." : "Analyze Emotion"}</span>
              </motion.button>
            </div>
          )}

          {/* Loading Indicator - Kept simple version */}
          {isLoading && (
            <div className="text-center my-6 md:my-8">
              <p className="text-lg text-blue-600 animate-pulse">
                Analyzing image...
              </p>
            </div>
          )}

          {/* ===== MODIFIED RESULTS DISPLAY ===== */}
          <AnimatePresence>
            {/* Show results card only if loading is done AND there are results */}
            {!isLoading && (baselineResult || pcaResult || pcaInfo) && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                // Using styling from EmotionDetector results card
                className="mt-6 md:mt-8 p-5 md:p-8 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl shadow-xl"
              >
                {/* Using styling from EmotionDetector results header */}
                <h3 className="text-xl md:text-2xl font-semibold mb-5 md:mb-6 text-gray-800 text-center">
                  Analysis Results
                </h3>

                {/* --- PCA Info Box --- */}
                {pcaInfo && (
                  <div className="mb-6 p-4 border border-purple-200 rounded-lg bg-purple-50 text-center shadow-sm">
                    <h4 className="text-base md:text-lg font-medium text-purple-800 mb-2 flex items-center justify-center gap-2">
                      <Info size={18} /> PCA Transformation Details
                    </h4>
                    <p className="text-xs md:text-sm text-purple-700">
                      Original Features:{" "}
                      <span className="font-semibold">
                        {pcaInfo.original_features}
                      </span>{" "}
                      | PCA Components:{" "}
                      <span className="font-semibold">
                        {pcaInfo.pca_components}
                      </span>{" "}
                      | Variance Explained:{" "}
                      <span className="font-semibold">
                        {formatPercentage(pcaInfo.variance_explained)}
                      </span>
                    </p>
                  </div>
                )}
                {/* --- End PCA Info Box --- */}

                {/* --- Predictions Section (using progress bar style from EmotionDetector) --- */}
                {/* This replaces the original prediction.map(...) */}
                <div className="space-y-4 md:space-y-5">
                  {/* Baseline Prediction Row */}
                  {baselineResult && (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 }}
                      className="flex items-center" // Row structure from EmotionDetector
                    >
                      {/* Label */}
                      <div className="w-32 md:w-40 text-sm md:text-base font-medium text-gray-700 flex-shrink-0 pr-2">
                        Baseline:
                        <span className="font-semibold capitalize block md:inline ml-1">
                          {baselineResult.emotion}
                        </span>
                      </div>
                      {/* Progress Bar */}
                      <div className="flex-1 h-3 md:h-4 bg-gray-200 rounded-full overflow-hidden mx-3 md:mx-4">
                        <motion.div
                          initial={{ width: "0%" }}
                          animate={{
                            width: formatPercentage(baselineResult.confidence),
                          }}
                          transition={{ duration: 0.7, delay: 0.1 }}
                          // Apply color based on predicted emotion
                          className={`h-full ${
                            emotionColorMap[baselineResult.emotion] ||
                            "bg-gray-400"
                          }`}
                        />
                      </div>
                      {/* Percentage Text */}
                      <div className="w-16 md:w-20 text-right text-sm md:text-base font-medium text-gray-700 flex-shrink-0 pl-2">
                        {formatPercentage(baselineResult.confidence)}
                      </div>
                    </motion.div>
                  )}

                  {/* PCA Prediction Row */}
                  {pcaResult && (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                      className="flex items-center" // Row structure from EmotionDetector
                    >
                      {/* Label */}
                      <div className="w-32 md:w-40 text-sm md:text-base font-medium text-gray-700 flex-shrink-0 pr-2">
                        PCA Model:
                        <span className="font-semibold capitalize block md:inline ml-1">
                          {pcaResult.emotion}
                        </span>
                      </div>
                      {/* Progress Bar */}
                      <div className="flex-1 h-3 md:h-4 bg-gray-200 rounded-full overflow-hidden mx-3 md:mx-4">
                        <motion.div
                          initial={{ width: "0%" }}
                          animate={{
                            width: formatPercentage(pcaResult.confidence),
                          }}
                          transition={{ duration: 0.7, delay: 0.2 }}
                          // Apply color based on predicted emotion
                          className={`h-full ${
                            emotionColorMap[pcaResult.emotion] || "bg-gray-400"
                          }`}
                        />
                      </div>
                      {/* Percentage Text */}
                      <div className="w-16 md:w-20 text-right text-sm md:text-base font-medium text-gray-700 flex-shrink-0 pl-2">
                        {formatPercentage(pcaResult.confidence)}
                      </div>
                    </motion.div>
                  )}
                </div>
                {/* --- End Predictions Section --- */}

                {/* Try again button */}
                <div className="text-center mt-6 md:mt-8">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={resetState}
                    className="px-5 py-2 md:px-6 md:py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors text-sm md:text-base"
                  >
                    Analyze Another Image
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {/* ===== END MODIFIED RESULTS DISPLAY ===== */}

          {/* Error Display - Kept structure/styling from EmotionDetector */}
          <AnimatePresence>
            {" "}
            {error && (
              <motion.div
                /* ... Kept ... */ className="mt-5 p-4 md:p-5 bg-red-50 text-red-700 rounded-xl md:rounded-2xl flex items-center shadow-md text-sm md:text-base"
              >
                <AlertCircle className="w-5 h-5 md:w-6 md:h-6 mr-2 md:mr-3 text-red-500 flex-shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}{" "}
          </AnimatePresence>
        </div>{" "}
        {/* End Main Content Card */}
        {/* Feature Highlights Section - Kept structure/styling from EmotionDetector, updated text */}
        <div className="mt-8 md:mt-10 grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {[
            /* Updated features */
            {
              title: "Fast Analysis",
              description: "Get comparative emotion results quickly",
              icon: "⚡",
            },
            {
              title: "PCA Comparison",
              description: "See effects of dimensionality reduction",
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
              className="p-6 md:p-8 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 backdrop-blur-lg bg-opacity-90 text-center md:text-left"
            >
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

export default App; // Export App component
