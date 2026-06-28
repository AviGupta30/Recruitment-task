import React, { useRef, useEffect } from 'react';
import { HandTracker } from '../modules/handTracking';

const CameraView = ({ onResults, showFeed }) => {
  const videoRef = useRef(null);
  const trackerRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user',
          },
        });
        video.srcObject = stream;
        video.onloadedmetadata = () => {
          video.play();
          startTracking();
        };
      } catch (err) {
        console.error('Error accessing camera:', err);
      }
    };

    const startTracking = () => {
      trackerRef.current = new HandTracker(onResults);

      const processFrame = async () => {
        if (video.readyState === 4) {
          await trackerRef.current.send(video);
        }
        requestAnimationFrame(processFrame);
      };

      processFrame();
    };

    startCamera();

    return () => {
      if (video.srcObject) {
        const tracks = video.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, [onResults]);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        zIndex: -1,
        backgroundColor: '#000',
        // Fade in/out the camera feed without unmounting
        opacity: showFeed ? 1 : 0,
        transition: 'opacity 0.5s ease',
        pointerEvents: 'none',
      }}
    >
      <video
        ref={videoRef}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: 'scaleX(-1)',
        }}
        playsInline
      />
    </div>
  );
};

export default CameraView;
