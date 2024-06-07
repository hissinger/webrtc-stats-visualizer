import React from "react";
import Button from "@mui/material/Button";
import WebRTCStatsVisualizer, {
  WebRTCStatsVisualizerHandle,
} from "./WebRTCStatsVisualizer";
import "./Stats.css";

type StatsValue = {
  timestamp: number;
  value: any;
};

function Stats() {
  const localVideoRef = React.useRef<HTMLVideoElement>(null);
  const remoteVideoRef = React.useRef<HTMLVideoElement>(null);

  const localPcRef = React.useRef<RTCPeerConnection | null>(null);
  const remotePcRef = React.useRef<RTCPeerConnection | null>(null);
  const localStreamRef = React.useRef<MediaStream | null>(null);

  const videoBitrateRef = React.useRef<WebRTCStatsVisualizerHandle>(null);
  const rttRef = React.useRef<WebRTCStatsVisualizerHandle>(null);
  const jitterRef = React.useRef<WebRTCStatsVisualizerHandle>(null);
  const packetLostRef = React.useRef<WebRTCStatsVisualizerHandle>(null);

  const prevStatsRef = React.useRef<Map<string, StatsValue>>(new Map());

  // Get stream
  const getStream = React.useCallback(async () => {
    const constraints = {
      video: true,
      audio: false,
    };
    localStreamRef.current = await navigator.mediaDevices.getUserMedia(
      constraints
    );

    localVideoRef.current!.srcObject = localStreamRef.current;
  }, []);

  // Start
  // This function is called when the "Remote Button" is clicked.
  // It creates two RTCPeerConnection objects, localPc and remotePc.
  const handleStart = React.useCallback(() => {
    const localPc = new RTCPeerConnection();
    const remotePc = new RTCPeerConnection();

    localPcRef.current = localPc;
    remotePcRef.current = remotePc;

    localStreamRef.current!.getTracks().forEach((track) => {
      localPc.addTrack(track, localStreamRef.current!);
    });

    localPc.onicecandidate = (e) => {
      if (e.candidate) {
        remotePc.addIceCandidate(e.candidate);
      }
    };

    remotePc.onicecandidate = (e) => {
      if (e.candidate) {
        localPc.addIceCandidate(e.candidate);
      }
    };

    remotePc.ontrack = (e) => {
      remoteVideoRef.current!.srcObject = e.streams[0];
    };

    localPc.onnegotiationneeded = () => {
      localPc.createOffer().then((offer) => {
        localPc.setLocalDescription(offer);
        remotePc.setRemoteDescription(offer);

        remotePc.createAnswer().then((answer) => {
          remotePc.setLocalDescription(answer);
          localPc.setRemoteDescription(answer);
        });
      });
    };
  }, []);

  // Collect stats
  const collectStats = React.useCallback(() => {
    const pc = remotePcRef.current;
    if (!pc) {
      return;
    }

    const now = new Date().getTime();
    pc.getStats().then((stats) => {
      stats.forEach((report) => {
        if (report.type === "inbound-rtp" && report.kind === "video") {
          const prev = prevStatsRef.current?.get("videoBytesReceived");
          if (prev) {
            const bitrate =
              ((report.bytesReceived - prev.value) * 8) /
              (now - prev.timestamp);
            videoBitrateRef.current!.pushData(new Date().getTime(), bitrate);
          }

          prevStatsRef.current?.set("videoBytesReceived", {
            timestamp: now,
            value: report.bytesReceived,
          });

          jitterRef.current!.pushData(new Date().getTime(), report.jitter);

          packetLostRef.current!.pushData(
            new Date().getTime(),
            report.packetsLost
          );
        }

        if (report.type === "candidate-pair") {
          rttRef.current!.pushData(
            new Date().getTime(),
            report.currentRoundTripTime
          );
        }
      });
    });
  }, []);

  // Initialize
  React.useEffect(() => {
    getStream();

    const intervalId = setInterval(collectStats, 5_000);

    return () => {
      clearInterval(intervalId);
    };
  }, [getStream, collectStats]);

  return (
    <div>
      <div>
        <video
          ref={localVideoRef}
          width={160}
          height={120}
          autoPlay
          playsInline
          muted
        />
        <video
          ref={remoteVideoRef}
          width={160}
          height={120}
          autoPlay
          playsInline
          muted
        />
      </div>

      <Button variant="contained" color="secondary" onClick={handleStart}>
        Start
      </Button>

      <div>
        <div className="grid-container">
          <div className="grid-item">
            <WebRTCStatsVisualizer
              ref={videoBitrateRef}
              label="video Bitrate"
              borderColor="rgb(255, 0, 0, 1)"
              width={300}
              height={200}
            />
          </div>
          <div className="grid-item">
            <WebRTCStatsVisualizer
              ref={rttRef}
              label="RTT"
              borderColor="rgb(255, 0, 0, 1)"
              width={300}
              height={200}
            />
          </div>
          <div className="grid-item">
            <div className="grid-item">
              <WebRTCStatsVisualizer
                ref={jitterRef}
                label="jitter"
                borderColor="rgb(255, 0, 0, 1)"
                width={300}
                height={200}
              />
            </div>
          </div>
          <div className="grid-item">
            <div className="grid-item">
              <WebRTCStatsVisualizer
                ref={packetLostRef}
                label="packet loss"
                borderColor="rgb(255, 0, 0, 1)"
                width={300}
                height={200}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Stats;
