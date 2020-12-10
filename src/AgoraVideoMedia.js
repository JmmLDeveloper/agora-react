import React, { useCallback, useEffect, useState } from 'react'
import AgoraRTC from 'agora-rtc-sdk'

const angoraConfig = {
  mode: 'rtc',
  appId: '3115e1973648472fb304395111f753da',
  token: '0063115e1973648472fb304395111f753daIABq5yAb2P0cByuyGeMV7SgdTthgkzIP568Vq2U7h/XFzwx+f9gAAAAAEAAPIFh76YjSXwEAAQDpiNJf',
  room: 'test'
}

AgoraRTC.Logger.setLogLevel(AgoraRTC.Logger.NONE)


const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
let isClientReady = false;
const screenClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });



const localScreenStream = AgoraRTC.createStream({
  audio: false,
  video: false,
  screen: true,
  screenAudio: true,
  mediaSource: 'screen',
});

function VideoBox({ stream, audioFlag, videoFlag, localFlag }) {

  const id = stream.getId()

  useEffect(() => {
    stream.play(String(id))
    return () => {
      console.log('where i am')
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

function initNormalClient() {
  return new Promise((resolve, reject) => {
    const localStream = AgoraRTC.createStream({
      audio: true,
      video: true,
      screen: false
    });
    client.init(angoraConfig.appId);

    client.join(angoraConfig.token, angoraConfig.room, null, (uid) => {
      localStream.setVideoProfile('360p_4');
      localStream.init(() => {
        client.publish(localStream, function (err) {
          console.log("[ERROR] : publish local stream error: " + err);
          reject()
        })
        resolve(localStream);
      }, (err) => {
        console.log('failure at init normal local stream')
        reject(err)
      });
    }, (err) => {
      console.log('there seems to be and error with localStream')
      reject(err)
    })
  })
}

client.on('stream-added', function (evt) {
  var stream = evt.stream;
  client.subscribe(stream, function (err) {
    console.log("[ERROR] : subscribe stream failed", err);
  });
});

//VERY IMPORTANT NOTE
//THIS CODE IS GARBAGE AND NEEDS REFACTOR , WE ARE JUST TESTING HERE






function flagListeners(setRemoteStreams) {
  client.on("mute-video", (ev) => {
    let id = ev.uid;
    setRemoteStreams(streams => {
      let result = streams.map(stream => {
        if (stream.stream.getId() == id)
          return { ...stream, videoFlag: false }
        else
          return stream
      })
      return result
    })
  })

  client.on("unmute-video", (ev) => {
    let id = ev.uid;

    setRemoteStreams(streams => {
      let result = streams.map(stream => {
        if (stream.stream.getId() == id)
          return { ...stream, videoFlag: true}
        else
          return stream
      })
      return result
    })
  })


  client.on("unmute-audio", (ev) => {
    let id = ev.uid;
    setRemoteStreams(streams => {
      console.log(streams)
      return streams.map(stream => {
        if (stream.stream.getId() == id)
          return { ...stream, audioFlag: true }
        else
          return stream
      })
    })
  })

  client.on("mute-audio", (ev) => {
    let id = ev.uid;
    setRemoteStreams(streams => {
      return streams.map(stream => {
        if (stream.stream.getId() == id)
          return { ...stream, audioFlag: false }
        else
          return stream
      })
    })
  })
}

export default function AgoraVideoMedia() {
  const [audioFlag, setAudioFlag] = useState(true)
  const [videoFlag, setVideoFlag] = useState(true)
  const [remoteStreams, setRemoteStreams] = useState([])
  const [screenFlag, setScreenFlag] = useState(false)
  const [localStream, setLocalStream] = useState(false)

  useEffect(() => {
    (async () => {
      if (!localStream) {
        let ls;
        try {
          ls = await initNormalClient()
          flagListeners(setRemoteStreams)
          client.on('stream-subscribed', function (evt) {
            console.log(evt)
            const addNewStream = (streams) => {
              if (evt.stream && streams.some(s => s.stream.getId() == evt.stream.getId()))
                return streams
              else
                return streams.concat({ stream: evt.stream, audioFlag: true, videoFlag: true })
            }
            setRemoteStreams(addNewStream)
          })
          client.on("peer-leave", function (evt) {
            if (!evt.stream)
              return
            setRemoteStreams(streams => streams.filter(({ stream }) => stream.getId() != evt.stream.getId()))
          });
        } catch (err) {

          console.log(err)
          return
        }
        setLocalStream(ls)
      }
    })()
  }, [localStream])


  const toggleAudio = () => {
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
    console.log('toggle video')
    if (videoFlag) {
      setVideoFlag(false)
      localStream.muteVideo()
    }
    else {
      setVideoFlag(true)
      localStream.unmuteVideo()
    }
    console.log('toggle video')

  }
  const toggleScreen = () => {
    if (screenFlag) {
      setScreenFlag(false)
    }
    else {
      setScreenFlag(true)
    }
  }
  const endCall = () => {

  }

  return (

    <div id="agora-main-container" >
      <div id="streams">
        {
          localStream && <VideoBox localFlag={true} stream={localStream} />
        }
        {
          remoteStreams.map(s => {
            console.log(s, 'WEEENO PUES')
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
            screenFlag ?
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

