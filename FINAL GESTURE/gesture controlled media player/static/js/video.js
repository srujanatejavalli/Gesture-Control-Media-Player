class VideoController {
    constructor() {
        this.player = null;
        this.currentVideoId = '';
        this.isPlayerReady = false;
        this.volume = 50;
        this.isPlaying = false;
        
        this.initializeYouTubeAPI();
        this.setupEventListeners();
    }

    initializeYouTubeAPI() {
        // Load YouTube IFrame API
        if (!window.YT) {
            const tag = document.createElement('script');
            tag.src = "https://www.youtube.com/iframe_api";
            const firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
            
            window.onYouTubeIframeAPIReady = () => {
                console.log('YouTube API loaded');
                this.createPlayer();
            };
        } else {
            this.createPlayer();
        }
    }

    createPlayer() {
        const playerElement = document.getElementById('youtube-player');
        if (!playerElement) return;

        this.player = new YT.Player('youtube-player', {
            height: '400',
            width: '100%',
            playerVars: {
                'playsinline': 1,
                'controls': 1,
                'rel': 0,
                'modestbranding': 1
            },
            events: {
                'onReady': this.onPlayerReady.bind(this),
                'onStateChange': this.onPlayerStateChange.bind(this)
            }
        });
    }

    onPlayerReady(event) {
        this.isPlayerReady = true;
        this.player.setVolume(this.volume);
        console.log('YouTube player ready');
        this.updateStatus('Player ready - Load a video to start');
    }

    onPlayerStateChange(event) {
        switch(event.data) {
            case YT.PlayerState.PLAYING:
                this.isPlaying = true;
                this.updateStatus('Video playing');
                break;
            case YT.PlayerState.PAUSED:
                this.isPlaying = false;
                this.updateStatus('Video paused');
                break;
            case YT.PlayerState.ENDED:
                this.isPlaying = false;
                this.updateStatus('Video ended');
                break;
        }
    }

    setupEventListeners() {
        const loadBtn = document.getElementById('load-video');
        const urlInput = document.getElementById('video-url');

        if (loadBtn && urlInput) {
            loadBtn.addEventListener('click', () => {
                this.loadVideo(urlInput.value);
            });

            urlInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.loadVideo(urlInput.value);
                }
            });
        }
    }

    async loadVideo(url) {
        if (!url) {
            this.showAlert('Please enter a YouTube URL', 'error');
            return;
        }

        try {
            const response = await fetch('/api/validate-youtube-url', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url: url })
            });

            const data = await response.json();

            if (data.valid) {
                this.currentVideoId = data.video_id;
                
                if (this.isPlayerReady && this.player) {
                    this.player.loadVideoById(this.currentVideoId);
                    this.updateStatus('Video loaded successfully');
                    this.showAlert('Video loaded! Use hand gestures to control playback.', 'success');
                } else {
                    this.updateStatus('Player not ready yet...');
                }
            } else {
                this.showAlert(data.error, 'error');
            }
        } catch (error) {
            console.error('Error loading video:', error);
            this.showAlert('Error loading video', 'error');
        }
    }

    handleGesture(gesture) {
        if (!this.isPlayerReady || !this.player || !this.currentVideoId) {
            console.log('Player not ready or no video loaded');
            return;
        }

        console.log('Handling gesture:', gesture);

        switch(gesture) {
            case 'skip_forward':
                this.skipForward();
                break;
            case 'skip_backward':
                this.skipBackward();
                break;
            case 'volume_up':
                this.volumeUp();
                break;
            case 'volume_down':
                this.volumeDown();
                break;
            case 'play_pause':
                this.togglePlayPause();
                break;
            default:
                console.log('Unknown gesture:', gesture);
        }
    }

    skipForward() {
        const currentTime = this.player.getCurrentTime();
        const newTime = Math.min(currentTime + 10, this.player.getDuration());
        this.player.seekTo(newTime);
        this.showGestureEffect('<i class="fa-solid fa-forward-step"></i> Skip Forward +10s');
        console.log('Skipped forward 10 seconds');
    }

    skipBackward() {
        const currentTime = this.player.getCurrentTime();
        const newTime = Math.max(currentTime - 10, 0);
        this.player.seekTo(newTime);
        this.showGestureEffect('<i class="fa-solid fa-backward-step"></i> Skip Backward -10s');
        console.log('Skipped backward 10 seconds');
    }

    volumeUp() {
        this.volume = Math.min(this.volume + 10, 100);
        this.player.setVolume(this.volume);
        this.showGestureEffect(`<i class="fa-solid fa-volume-high"></i> Volume Up ${this.volume}%`);
        console.log('Volume increased to', this.volume);
    }

    volumeDown() {
        this.volume = Math.max(this.volume - 10, 0);
        this.player.setVolume(this.volume);
        this.showGestureEffect(`<i class="fa-solid fa-volume-low"></i> Volume Down ${this.volume}%`);
        console.log('Volume decreased to', this.volume);
    }

    togglePlayPause() {
        if (this.isPlaying) {
            this.player.pauseVideo();
            this.showGestureEffect('<i class="fa-solid fa-pause"></i> Paused');
        } else {
            this.player.playVideo();
            this.showGestureEffect('<i class="fa-solid fa-play"></i> Playing');
        }
        console.log('Toggled play/pause');
    }

    showGestureEffect(message) {
        // Create floating effect element
        const effect = document.createElement('div');
        effect.className = 'gesture-effect';
        effect.innerHTML = message;
        effect.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 15px 25px;
            border-radius: 25px;
            font-size: 1.2rem;
            z-index: 1000;
            pointer-events: none;
            animation: gesturePopup 2s ease-out forwards;
        `;

        // Add CSS animation
        if (!document.querySelector('#gesture-animation-style')) {
            const style = document.createElement('style');
            style.id = 'gesture-animation-style';
            style.textContent = `
                @keyframes gesturePopup {
                    0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
                    20% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
                    40% { transform: translate(-50%, -50%) scale(1); }
                    100% { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(effect);
        setTimeout(() => effect.remove(), 2000);

        // Update status
        this.updateStatus(message);
    }

    showAlert(message, type) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type}`;
        alertDiv.textContent = message;
        alertDiv.style.display = 'block';

        const container = document.querySelector('.video-section') || document.body;
        container.insertBefore(alertDiv, container.firstChild);

        setTimeout(() => alertDiv.remove(), 5000);
    }

    updateStatus(message) {
        const statusElement = document.getElementById('video-status');
        if (statusElement) {
            statusElement.innerHTML = message;
        }
        console.log('Video Status:', message);
    }
}

// Initialize video controller when page loads
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('youtube-player')) {
        window.videoController = new VideoController();
        console.log('Video controller initialized');
    }
});

// Utility functions for manual testing
window.testGesture = function(gesture) {
    if (window.videoController) {
        console.log('Testing gesture:', gesture);
        window.videoController.handleGesture(gesture);
    }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VideoController;
}