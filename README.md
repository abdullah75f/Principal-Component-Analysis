# AI Emotion Detector & PCA Analysis UI

A web application demonstrating facial emotion recognition. It compares a baseline LightGBM model against a LightGBM model trained on PCA-reduced features, showcasing dimensionality reduction impact. Built with React (TypeScript) and Flask.

## Screenshots

**Input / Camera View:**
![Application Input/Camera View](frontend/public/image.png)


**Analysis Results:**
![Application Results Display](frontend/public/image1.png)
_(Replace `<./path/to/screenshot_results.png>` with the actual path to your screenshot)_

## Features

- Image Upload & Camera Capture
- Emotion Prediction using Baseline LightGBM Model (with confidence)
- Emotion Prediction using PCA-reduced LightGBM Model (with confidence)
- Display of PCA Transformation Details (features reduced, variance retained)
- Responsive UI with Tailwind CSS & Framer Motion

## Technology Stack

- **Frontend:** React, TypeScript, Tailwind CSS, Framer Motion, Axios
- **Backend:** Python, Flask, LightGBM, Scikit-learn (PCA, Scaler), Joblib, OpenCV, Pillow

## Setup & Running

**Prerequisites:**

- Python (3.8+), Pip
- Node.js, npm (or yarn)
- (macOS) Homebrew & `libomp` (`brew install libomp`)

**1. Backend Setup:**

1.  Navigate to the `backend` directory.
2.  Place the required `.joblib` files (baseline model, pca model, scaler, pca transformer) in this directory.
3.  Create/activate a Python virtual environment (e.g., `python/python3 -m venv venv -m venv venv`, `source venv/bin/activate`).
4.  Install dependencies: `pip install -r requirements.txt`
5.  Run the server: `python app.py` (Keep running)

**2. Frontend Setup:**

1.  Navigate to the `frontend` directory.
2.  Install dependencies: `npm install` (or `yarn install`)
3.  Run the development server: `npm run dev`
4.  Access the application in your browser (usually `http://localhost:5173`).

4:\*\* Upload or capture an image via the UI, click "Analyze Emotion", and. Access in browser (e.g., `http://localhost:3000` or `http view the comparative predictions and PCA details.) and see the output

## License

MIT License
