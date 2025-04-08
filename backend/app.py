import flask
from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import numpy as np
import cv2
import os
import io
from PIL import Image # Using PIL for easier handling initially

# --- Configuration ---
IMG_SIZE = 96 # Must match the size used for training/saving
N_COMPONENTS_SELECTED = 273 # Must match the components used for pca model training
ORIGINAL_FEATURES = IMG_SIZE * IMG_SIZE # e.g., 9216
VARIANCE_EXPLAINED = 0.9501 # Get this value from your Colab Cell 9 output

# Define paths relative to app.py location
SCALER_PATH = "scaler_96x96.joblib"
PCA_TRANSFORMER_PATH = "pca_transformer_96x96_c273.joblib"
BASELINE_MODEL_PATH = "lgbm_baseline_96x96_model.joblib"
PCA_MODEL_PATH = "lgbm_pca_96x96_model.joblib"

# Define emotion map list (must match training)
emotion_map_list = ['angry', 'disgust', 'fear', 'happy', 'neutral', 'sad', 'surprise']

# --- Load Models and Objects ---
print("Loading models and preprocessing objects...")
try:
    scaler = joblib.load(SCALER_PATH)
    pca_transformer = joblib.load(PCA_TRANSFORMER_PATH)
    baseline_model = joblib.load(BASELINE_MODEL_PATH)
    pca_lgbm_model = joblib.load(PCA_MODEL_PATH)
    # Extract necessary components and mean from the loaded pca_transformer
    pca_components = pca_transformer.components_[:N_COMPONENTS_SELECTED]
    pca_mean = pca_transformer.mean_
    print("Models and objects loaded successfully.")
except FileNotFoundError as e:
    print(f"Error loading file: {e}. Make sure joblib files are in the backend directory.")
    exit()
except Exception as e:
    print(f"An error occurred during loading: {e}")
    exit()
# -----------------------------


app = Flask(__name__)
CORS(app) # Enable CORS

@app.route('/')
def home():
    return "Emotion Prediction Backend (v2) is running!"

@app.route('/predict', methods=['POST'])
def predict():
    print("Received prediction request...")
    # Check if the post request has the file part
    if 'file' not in request.files:
        print("No file part in request")
        return jsonify({'error': 'No file part in the request'}), 400

    file = request.files['file']
    # If the user does not select a file, the browser submits an
    # empty file without a filename.
    if file.filename == '':
        print("No selected file")
        return jsonify({'error': 'No selected file'}), 400

    if file:
        try:
            # Read image file bytes
            img_bytes = file.read()
            # Decode image using OpenCV
            nparr = np.frombuffer(img_bytes, np.uint8)
            img_color = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            if img_color is None:
                 print("Error decoding image")
                 return jsonify({'error': 'Could not decode image file'}), 400

            # --- Preprocessing ---
            img_gray = cv2.cvtColor(img_color, cv2.COLOR_BGR2GRAY)
            img_resized = cv2.resize(img_gray, (IMG_SIZE, IMG_SIZE), interpolation=cv2.INTER_AREA)
            img_normalized = img_resized / 255.0
            img_flat = img_normalized.reshape(1, -1) # Shape (1, IMG_SIZE*IMG_SIZE)

            # --- Scaling ---
            img_scaled = scaler.transform(img_flat)

            # --- Prediction 1: Baseline Model (Get Probabilities) ---
            baseline_probs = baseline_model.predict_proba(img_scaled)[0] # Get probabilities for the first (only) sample
            baseline_top_idx = np.argmax(baseline_probs)
            baseline_confidence = baseline_probs[baseline_top_idx]
            baseline_emotion_name = emotion_map_list[baseline_top_idx]

            # --- PCA Transformation ---
            img_pca = (img_scaled - pca_mean) @ pca_components.T # Manual projection

            # --- Prediction 2: PCA Model (Get Probabilities) ---
            pca_probs = pca_lgbm_model.predict_proba(img_pca)[0] # Get probabilities
            pca_top_idx = np.argmax(pca_probs)
            pca_confidence = pca_probs[pca_top_idx]
            pca_emotion_name = emotion_map_list[pca_top_idx]

            print(f"Predictions: Baseline={baseline_emotion_name} ({baseline_confidence:.2f}), PCA={pca_emotion_name} ({pca_confidence:.2f})")

            # --- Construct JSON Response ---
            response_data = {
                'baseline_pred': {
                    'emotion': baseline_emotion_name,
                    'confidence': float(baseline_confidence) # Convert numpy float to standard float
                },
                'pca_pred': {
                    'emotion': pca_emotion_name,
                    'confidence': float(pca_confidence) # Convert numpy float to standard float
                },
                'pca_info': {
                    'original_features': ORIGINAL_FEATURES,
                    'pca_components': N_COMPONENTS_SELECTED,
                    'variance_explained': float(round(VARIANCE_EXPLAINED, 4)) # Use value from Colab
                }
            }
            return jsonify(response_data)

        except Exception as e:
            print(f"Error during prediction: {e}")
            import traceback
            traceback.print_exc()
            return jsonify({'error': f'An internal error occurred processing the image'}), 500

    return jsonify({'error': 'Unexpected error'}), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True) # Keep port 5000