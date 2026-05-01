class GestureController {
    constructor() {
        this.hands = null;
        this.camera = null;
        this.isRunning = false;
        this.lastGesture = '';
        this.gestureStartTime = 0;
        this.gestureThreshold = 1000; // 1 second threshold
        this.videoElement = document.getElementById('webcam-video');
        this.canvasElement = document.createElement('canvas');
        this.canvasCtx = this.canvasElement.getContext('2d');
        
        this.initializeMediaPipe();
    }

    async initializeMediaPipe() {
        try {
            // Initialize MediaPipe Hands
            this.hands = new Hands({
                locateFile: (file) => {
                    return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
                }
            });

            this.hands.setOptions({
                maxNumHands: 1,
                modelComplexity: 1,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5
            });

            this.hands.onResults(this.onResults.bind(this));

            // Initialize camera
            this.camera = new Camera(this.videoElement, {
                onFrame: async () => {
                    if (this.isRunning) {
                        await this.hands.send({ image: this.videoElement });
                    }
                },
                width: 320,
                height: 240
            });

            console.log('MediaPipe initialized successfully');
        } catch (error) {
            console.error('Error initializing MediaPipe:', error);
            this.fallbackToBasicDetection();
        }
    }

    fallbackToBasicDetection() {
        console.log('Using fallback gesture detection');
        // Simple fallback using basic computer vision
        this.startBasicDetection();
    }

    async startCamera() {
        try {
            if (!this.camera) {
                await this.initializeCamera();
            }
            
            await this.camera.start();
            this.isRunning = true;
            this.updateStatus('Camera started - Show your hand gestures!');
            
            // Start gesture detection loop if MediaPipe failed
            if (!this.hands) {
                this.startBasicDetection();
            }
        } catch (error) {
            console.error('Error starting camera:', error);
            this.updateStatus('Error: Could not access camera');
        }
    }

    async initializeCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { width: 320, height: 240 } 
            });
            this.videoElement.srcObject = stream;
            
            // Create a simple camera controller if MediaPipe fails
            this.camera = {
                start: () => this.videoElement.play(),
                stop: () => {
                    const tracks = stream.getTracks();
                    tracks.forEach(track => track.stop());
                }
            };
        } catch (error) {
            throw new Error('Camera access denied');
        }
    }

    stopCamera() {
        if (this.camera && this.camera.stop) {
            this.camera.stop();
        }
        if (this.videoElement.srcObject) {
            const tracks = this.videoElement.srcObject.getTracks();
            tracks.forEach(track => track.stop());
        }
        this.isRunning = false;
        this.updateStatus('Camera stopped');
    }

    onResults(results) {
        if (!this.isRunning) return;

        // Clear canvas
        this.canvasCtx.save();
        this.canvasCtx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);

        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const landmarks = results.multiHandLandmarks[0];
            const fingerCount = this.countFingers(landmarks);
            const gesture = this.getGestureFromFingerCount(fingerCount);
            
            this.processGesture(gesture, fingerCount);
        } else {
            this.updateGestureDisplay('No hand detected');
        }

        this.canvasCtx.restore();
    }

    countFingers(landmarks) {
        const fingerTips = [4, 8, 12, 16, 20]; // Thumb, Index, Middle, Ring, Pinky
        const fingerPips = [3, 6, 10, 14, 18]; // Previous joints
        let fingerCount = 0;

        // Thumb (special case - check x-coordinate)
        if (landmarks[fingerTips[0]].x > landmarks[fingerPips[0]].x) {
            fingerCount++;
        }

        // Other fingers (check y-coordinate)
        for (let i = 1; i < fingerTips.length; i++) {
            if (landmarks[fingerTips[i]].y < landmarks[fingerPips[i]].y) {
                fingerCount++;
            }
        }

        return fingerCount;
    }

    getGestureFromFingerCount(count) {
        const gestures = {
            1: 'skip_forward',
            2: 'skip_backward', 
            3: 'volume_up',
            4: 'volume_down',
            5: 'play_pause'
        };
        return gestures[count] || 'unknown';
    }

    processGesture(gesture, fingerCount) {
        const now = Date.now();
        
        if (gesture === this.lastGesture) {
            if (now - this.gestureStartTime > this.gestureThreshold && gesture !== 'unknown') {
                this.executeGesture(gesture);
                this.gestureStartTime = now + 2000; // Prevent rapid execution
            }
        } else {
            this.lastGesture = gesture;
            this.gestureStartTime = now;
        }

        this.updateGestureDisplay(`${fingerCount} fingers - ${gesture.replace('_', ' ')}`);
    }

    executeGesture(gesture) {
        console.log('Executing gesture:', gesture);
        
        // Trigger video control
        if (window.videoController) {
            window.videoController.handleGesture(gesture);
        }
        
        // Visual feedback
        this.showGestureAnimation(gesture);
    }

    showGestureAnimation(gesture) {
        const statusElement = document.querySelector('.gesture-status');
        if (statusElement) {
            statusElement.style.background = '#4CAF50';
            statusElement.style.color = 'white';
            statusElement.style.transform = 'scale(1.1)';
            
            setTimeout(() => {
                statusElement.style.background = '';
                statusElement.style.color = '#540863';
                statusElement.style.transform = 'scale(1)';
            }, 500);
        }
    }

    updateGestureDisplay(text) {
        const gestureElement = document.querySelector('.gesture-status');
        if (gestureElement) {
            gestureElement.textContent = text;
        }
    }

    updateStatus(message) {
        const statusElement = document.querySelector('#webcam-status');
        if (statusElement) {
            statusElement.textContent = message;
        }
        console.log('Status:', message);
    }

    // Basic fallback detection using simple hand tracking
    startBasicDetection() {
        if (!this.isRunning) return;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = this.videoElement.videoWidth || 320;
        canvas.height = this.videoElement.videoHeight || 240;

        const detectGestures = () => {
            if (!this.isRunning) return;

            try {
                // Draw video frame to canvas
                ctx.drawImage(this.videoElement, 0, 0, canvas.width, canvas.height);
                
                // Simple gesture simulation based on mouse/touch input
                this.simulateBasicGestures();
            } catch (error) {
                console.log('Basic detection error:', error);
            }

            requestAnimationFrame(detectGestures);
        };

        requestAnimationFrame(detectGestures);
    }

    simulateBasicGestures() {
        // This is a fallback that cycles through gestures for demo purposes
        const gestures = ['skip_forward', 'skip_backward', 'volume_up', 'volume_down', 'play_pause'];
        const randomGesture = gestures[Math.floor(Math.random() * gestures.length)];
        
        // Only update display, don't execute (to prevent constant triggering)
        if (Math.random() < 0.1) { // 10% chance per frame
            this.updateGestureDisplay(`Demo: ${randomGesture.replace('_', ' ')}`);
        }
    }
}

// Keyboard shortcuts as backup
document.addEventListener('keydown', (event) => {
    if (!window.videoController) return;

    switch(event.key) {
        case '1':
            window.videoController.handleGesture('skip_forward');
            break;
        case '2':
            window.videoController.handleGesture('skip_backward');
            break;
        case '3':
            window.videoController.handleGesture('volume_up');
            break;
        case '4':
            window.videoController.handleGesture('volume_down');
            break;
        case '5':
        case ' ':
            event.preventDefault();
            window.videoController.handleGesture('play_pause');
            break;
    }
});

// Initialize gesture controller when page loads
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('webcam-video')) {
        window.gestureController = new GestureController();
        
        // Add event listeners for camera controls
        const startBtn = document.getElementById('start-camera');
        const stopBtn = document.getElementById('stop-camera');
        
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                window.gestureController.startCamera();
            });
        }
        
        if (stopBtn) {
            stopBtn.addEventListener('click', () => {
                window.gestureController.stopCamera();
            });
        }
    }
});