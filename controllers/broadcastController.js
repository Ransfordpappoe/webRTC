const webrtc = require("wrtc");
const { realtimeDB, firestoreDB, cloudStorage } = require("../model/firebaseAdmin");
const {Readable} = require('stream');

let streamStore={};
let screenShareStream={};


const consumeStream = async (req, res)=>{
    const {sdp, roomId} = req.body;
    if(!sdp || !roomId){
        return res.status(400).json({message: "sdp and roomid required"});
    }
    // const senderStream = streamStore[roomId]; 
    if (!senderStream) { 
        return res.status(400).json({ message: "No active stream available" }); 
    }
    try {
        const peer = new webrtc.RTCPeerConnection({
            iceServers: [
                {
                    urls: [
                        "stun:stun1.l.google.com:19302",
                        "stun:stun2.l.google.com:19302",
                        "stun:stun.relay.metered.ca:80"
                    ],
                },
                {
                    urls: [
                        "turn:standard.relay.metered.ca:80",
                        "turn:standard.relay.metered.ca:80?transport=tcp",
                        "turn:standard.relay.metered.ca:443",
                        "turns:standard.relay.metered.ca:443?transport=tcp",
                    ],
                    username: "7caa77b5c9bd3cb538c9d418",
                    credential: "0KsV2VDhnIVtIYNA"
                }
            ]
        });
        const desc = new webrtc.RTCSessionDescription(sdp);
        await peer.setRemoteDescription(desc);
        // senderStream.getTracks().forEach(track => {
        //     peer.addTrack(track, senderStream)
        // });
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        const payload = {
            sdp: peer.localDescription
        }
        // console.log(payload);
        res.status(201).json(payload);
      
    } catch (error) {
        res.status(500).json({message: error.message});
    }
   
};

const uploadStream = async (req, res) => {
    const {sdp, roomId} = req.body;
    if(!sdp || !roomId){
        return res.status(400).json({message: "sdp and roomid required"});
    }

    try {
        const peer = new webrtc.RTCPeerConnection({
            iceServers: [
                {
                    urls: [
                        "stun:stun1.l.google.com:19302",
                        "stun:stun2.l.google.com:19302",
                        "stun:stun.relay.metered.ca:80"
                    ],
                },
                {
                    urls: [
                        "turn:standard.relay.metered.ca:80",
                        "turn:standard.relay.metered.ca:80?transport=tcp",
                        "turn:standard.relay.metered.ca:443",
                        "turns:standard.relay.metered.ca:443?transport=tcp",
                    ],
                    username: "7caa77b5c9bd3cb538c9d418",
                    credential: "0KsV2VDhnIVtIYNA"
                }
            ]
        });
        peer.ontrack = async(e) => {
            streamStore[roomId] = e.streams[0];
        };
        const desc = new webrtc.RTCSessionDescription(sdp);
        await peer.setRemoteDescription(desc);
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        const payload = {
            sdp: peer.localDescription
        }
        // console.log(payload);

        console.log("production is in progress");
        res.status(201).json(payload);
    } catch (error) {
        res.status(500).json({message: error.message});
    }
}


const handleTrackEvent=async(e, roomId)=>{
    streamStore[roomId] = e.streams[0];
}

const consumeScreenSharing = async (req, res)=>{
    const {sdp, roomId} = req.body;
    if(!sdp || !roomId){
        return res.status(400).json({message: "sdp and roomid required"});
    }
    const senderStream = screenShareStream[roomId];
    if (!senderStream) { 
        return res.status(400).json({ message: "screen sharing is inactive" }); 
    }
    try {
        const peer = new webrtc.RTCPeerConnection({
            iceServers: [
                {
                    urls: [
                        "stun:stun1.l.google.com:19302",
                        "stun:stun2.l.google.com:19302",
                        "stun:stun.relay.metered.ca:80"
                    ],
                },
                {
                    urls: [
                        "turn:standard.relay.metered.ca:80",
                        "turn:standard.relay.metered.ca:80?transport=tcp",
                        "turn:standard.relay.metered.ca:443",
                        "turns:standard.relay.metered.ca:443?transport=tcp",
                    ],
                    username: "7caa77b5c9bd3cb538c9d418",
                    credential: "0KsV2VDhnIVtIYNA"
                }
            ]
        });
        const desc = new webrtc.RTCSessionDescription(sdp);
        await peer.setRemoteDescription(desc);
        senderStream.getTracks().forEach(track => {
            peer.addTrack(track, senderStream)
        });
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        const payload = {
            sdp: peer.localDescription
        }
        // console.log(payload);
        res.status(201).json(payload);
    } catch (error) {
        res.status(500).json({message: error.message});
    }
   
};

const uploadScreenShareStream = async (req, res) => {
    const {sdp, roomId} = req.body;
    if(!sdp || !roomId){
        return res.status(400).json({message: "sdp and roomid required"});
    }

    try {
        const peer = new webrtc.RTCPeerConnection({
            iceServers: [
                {
                    urls: [
                        "stun:stun1.l.google.com:19302",
                        "stun:stun2.l.google.com:19302",
                        "stun:stun.relay.metered.ca:80"
                    ],
                },
                {
                    urls: [
                        "turn:standard.relay.metered.ca:80",
                        "turn:standard.relay.metered.ca:80?transport=tcp",
                        "turn:standard.relay.metered.ca:443",
                        "turns:standard.relay.metered.ca:443?transport=tcp",
                    ],
                    username: "7caa77b5c9bd3cb538c9d418",
                    credential: "0KsV2VDhnIVtIYNA"
                }
            ]
        });
        peer.ontrack = (e) => handleTrackScreenSharingEvent(e, roomId);
        const desc = new webrtc.RTCSessionDescription(sdp);
        await peer.setRemoteDescription(desc);
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        const payload = {
            sdp: peer.localDescription
        }
        // console.log(payload);

        console.log("screensharing in progress");
        res.status(201).json(payload);
    } catch (error) {
        res.status(500).json({message: error.message});
    }
}

const handleTrackScreenSharingEvent=(e, roomId)=>{
    screenShareStream[roomId] = e.streams[0];
}

const endScreenSharing =async(req, res)=>{
    const {roomid} = req.body;
    if (!roomid || roomid === "") {
        res.sendStatus(400).json({message: "roomid required"});
    }
    const roomid_ref = realtimeDB.ref(`rooms/${roomid}`);
    await roomid_ref.remove().catch((e)=>console.log(e));
    screenShareStream[roomid] = null;
    res.status(201).json({message: "screen sharing ended"});
    console.log("screen sharing ended")
}

const endBroadcast =async(req, res)=>{
    const {roomid} = req.body;
    if (!roomid || roomid === "") {
        res.sendStatus(400).json({message: "roomid required"});
    }
    const roomid_ref = realtimeDB.ref(`rooms/${roomid}`);
    await roomid_ref.remove().catch((e)=>console.log(e));
    streamStore[roomid] = null;
    screenShareStream[roomid] = null;
    res.status(201).json({message: "production ended"});
    console.log("production ended")
}
module.exports={consumeStream, uploadStream, endBroadcast, consumeScreenSharing, uploadScreenShareStream, endScreenSharing};