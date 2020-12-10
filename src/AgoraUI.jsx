import React, { useCallback, useEffect, useState } from 'react'
import AgoraRTC from 'agora-rtc-sdk'

function VideoBox({ stream, audioFlag, videoFlag, localFlag }) {

    const id = stream.getId()

    useEffect(() => {
        stream.play(String(id))
        return () => {
            stream.stop()
        }
    }, [id])

    return (
        <div className="video-box-container">
            <div className="video-box-info" >
                {
                    !localFlag && (
                        audioFlag ?
                            <span className="material-icons">
                                mic
            </span> :
                            <span className="material-icons">
                                mic_off
            </span>
                    )
                }
                {
                    !localFlag && (videoFlag ?
                        <span className="material-icons">
                            videocam
            </span> :
                        <span className="material-icons">
                            videocam_off
            </span>
                    )
                }
                <span>{id}</span>
            </div>
            <div id={id} className="video-box"></div>
        </div>
    )
}






export default function AgoraVideoMedia({
    remoteStreams,
    localStreamReady,
    localStream,
    screenStream,
    screenStreamReady,
    toggleScreen
}) {
    const [audioFlag, setAudioFlag] = useState(true)
    const [videoFlag, setVideoFlag] = useState(true)

    const toggleAudio = () => {
        if (!localStreamReady)
            return
        if (audioFlag) {
            setAudioFlag(false)
            localStream.muteAudio()
        }
        else {
            setAudioFlag(true)
            localStream.unmuteAudio()
        }
    }
    const toggleVideo = () => {
        if (!localStreamReady)
            return
        if (videoFlag) {
            setVideoFlag(false)
            localStream.muteVideo()
        }
        else {
            setVideoFlag(true)
            localStream.unmuteVideo()
        }
    }
    const endCall = () => {

    }

    return (

        <div id="agora-main-container" >
            <div id="streams">
                {
                    localStreamReady && <VideoBox localFlag={true} stream={localStream} />
                }
                {
                    screenStream && screenStreamReady && <VideoBox localFlag={true} stream={screenStream} />
                }
                {
                    remoteStreams.map(s => {
                        return (<VideoBox
                            key={s.stream.getId()}
                            localFlag={false}
                            videoFlag={s.videoFlag}
                            audioFlag={s.audioFlag}
                            stream={s.stream}
                        />)
                    })
                }
            </div>
            <div id="agora-controls">
                <p> {localStream && localStream.getId()} </p>
                <button onClick={toggleAudio}>
                    {
                        audioFlag ?
                            <span className="material-icons">
                                mic
                        </span> :
                        <span className="material-icons">
                                mic_off
                        </span>
                    }
                </button>
                <button onClick={toggleVideo}>
                    {
                        videoFlag ?
                        <span className="material-icons">
                                videocam
                        </span> :
                        <span className="material-icons">
                                videocam_off
                        </span>
                    }
                </button>
                <button onClick={toggleScreen}>
                    {
                        videoFlag ?
                        <span className="material-icons">
                                screen_share
                        </span> :
                        <span className="material-icons">
                                stop_screen_share
                        </span>
                    }
                </button>
                <button>
                    <span className="material-icons">
                        call_end
                </span>
                </button>
            </div>
        </div>
    )
}

