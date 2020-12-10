import React, { useCallback, useEffect, useState } from 'react'
import AgoraRTC from 'agora-rtc-sdk'
import AgoraUI from './AgoraUI'

const defaultConfig = {
  mode: 'rtc',
  appId: '3115e1973648472fb304395111f753da',
  token: '0063115e1973648472fb304395111f753daIADeloUtG58ySENWY+WbBAE8zWlgLhueSBBuU6eWmCgr6Qx+f9gAAAAAEACokQXejcjTXwEAAQCNyNNf',
  room: 'test'
}


// THIS COMPONENT MUST NOT ME RERENDER FRECUENTLY
// MUST BE USED WITH REACT MEMO

// THIS STILL NEEDS SOME REFACTOR
export default function AgoraVideoMedia({ config = defaultConfig }) {
  const [client, setClient] = useState(null)
  const [screenClient, setScreenClient] = useState(null)
  const [localStream, setLocalStream] = useState(null)
  const [screenStream, setScreenStream] = useState(null)
  const [remoteStreams, setRemoteStreams] = useState([])
  const [localStreamReady, setLocalStreamReady] = useState(false)
  const [screenStreamReady,setScreenStreamReady] = useState(false)

  //on first render
  useEffect(() => {
    (async () => {
      AgoraRTC.Logger.setLogLevel(AgoraRTC.Logger.NONE)
      let { client, localStream } = createAgoraObjecs(config, {
        setClient,
        setScreenClient,
        setLocalStream,
        setScreenStream,
        setRemoteStreams
      })
      await initClient(config, client, localStream)
      setLocalStreamReady(true)
    })()
  }, [config])

  const toggleScreen = async () => {
    if(!screenStreamReady  && screenClient && screenStream ) {
      await initScreenClient(config,screenClient,screenStream)
      setScreenStreamReady(true)
    } else if( screenClient && screenStream ) {
      await stopScreenShare(screenClient,screenStream)
      setScreenStreamReady(false)

    }
  }

  return (
    <>
      <AgoraUI
        localStreamReady={localStreamReady}
        remoteStreams={remoteStreams}
        client={client}
        localStream={localStream}
        toggleScreen={toggleScreen}
        screenStream={screenStream}
        screenStreamReady={screenStreamReady}
      />
    </>
  )
}

function createAgoraObjecs(config, {
  setClient,
  setScreenClient,
  setLocalStream,
  setScreenStream,
  setRemoteStreams
}) {
  // later fix select diferent codecs for optimaze screen and camara streams
  const client = AgoraRTC.createClient({ mode: config.mode, codec: config.codec });
  const screenClient = AgoraRTC.createClient({ mode: config.mode, codec: config.codec });
  const localStream = AgoraRTC.createStream({
    audio: true,
    video: true,
    screen: false
  });
  const screenStream = AgoraRTC.createStream({
    audio: false,
    video: false,
    screen: true,
    screenAudio: true,
    mediaSource: 'screen',
  });

  setClient(client)
  setLocalStream(localStream)
  setScreenStream(screenStream)
  setScreenClient(screenClient)

  for (const eventName of ['mute-video', 'unmute-video', 'mute-audio', 'unmute-audio']) {
    client.on(eventName, (ev) => {
      const id = ev.uid;
      if (id === undefined || id === null)
        return;
      setRemoteStreams(streams => {
        return streams.map(stream => {
          const localId = localStream.getId() // will return null if not init
          const screenId = screenStream.getId() // will return null if not init
          const local = localId == id || screenId == id
          if (!local && stream.stream.getId() == id) {
            if (eventName === 'mute-video')
              return { ...stream, videoFlag: false }
            else if (eventName === 'unmute-video')
              return { ...stream, videoFlag: true }
            else if (eventName === 'mute-audio')
              return { ...stream, audioFlag: false }
            else if (eventName === 'unmute-audio')
              return { ...stream, audioFlag: true }
          }
          else
            return stream
        })
      })
    })
  }

  // pendiente de esto hey por que aunque no muestre los streams
  // igual tiene el overhead debo de hacer filtrado aqui
  client.on('stream-added', function (evt) {
    const stream = evt.stream;
    client.subscribe(stream, function (err) {
      console.log("[ERROR] : subscribe stream failed", err);
    });
  });

  client.on('stream-subscribed', function (evt) {
    if (!evt.stream)
      return;
    const id = evt.stream.getId()
    if (id === null || id === undefined)
      return;
    setRemoteStreams((streams) => {
      const localId = localStream.getId() // will return null if not init
      const screenId = screenStream.getId() // will return null if not init
      const local = localId == id || screenId == id
      if (local || streams.some(s => s.stream.getId() == id))
        return streams
      else
        return streams.concat( {stream:evt.stream,videoFlag:true,audioFlag:false} )
    })
  })

  client.on("peer-leave", function (evt) {
    if (!evt.stream)
      return
    setRemoteStreams(streams => streams.filter(({ stream }) => stream.getId() != evt.stream.getId()))
  });

  return {
    client,
    localStream
  }
}


function initScreenClient(config,screenClient,screenStream) {
  return new Promise((resolve, reject) => {
    screenClient.init(config.appId);
    screenClient.join(config.token, config.room, null, (uid) => {
      screenStream.setVideoProfile('360p_4');
      screenStream.init(() => {
        screenClient.publish(screenStream, function (err) {
          console.log("[ERROR] : publish local stream error: " + err);
          reject()
        })
        console.log( screenStream.getId() )
        resolve(screenStream);
      }, (err) => {
        console.log('failure at init normal local stream')
        reject(err)
      });
    }, (err) => {
      console.log('there seems to be and error with localSCreenStream')
      reject(err)
    })
  })
}


function initClient(config, client, localStream) {
  console.log(config, client, localStream);
  return new Promise((resolve, reject) => {
    client.init(config.appId);
    client.join(config.token, config.room, null, (uid) => {
      localStream.setVideoProfile('360p_4');
      localStream.init(() => {
        client.publish(localStream, function (err) {
          console.log("[ERROR] : publish local stream error: " + err);
          reject(err)
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

function stopScreenShare(screenClient,screenStream) {
  return new Promise((resolve,reject)=>{
    screenStream.disableVideo(); // disable the local video stream (will send a mute signal)
    screenStream.stop(); // stop playing the local stream

    screenClient.leave(() => {
      console.log("screen client leaves channel");
      screenClient.unpublish(screenStream);
      screenStream.close();
      resolve()
    }, function(err) {

      console.log("client leave failed ", err); //error handling
      reject(err)
    });
  })
}