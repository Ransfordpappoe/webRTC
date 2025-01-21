const webrtc = require("wrtc");
const { realtimeDB, firestoreDB } = require("../model/firebaseAdmin");

let streamStore={};
let screenShareStream={};


const consumeStream = async (req, res)=>{
    const {sdp, roomId, userid, docid} = req.body;
   
    if(!sdp || !roomId){
        return res.status(400).json({message: "sdp and roomid required"});
    }
    const senderStream = streamStore[roomId]; 
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
                    username: process.env.TURN_USERNAME,
                    credential: process.env.TURN_CREDENTIAL
                }
            ]
        });

        // const docID = await realtimeDB.ref(`iceDocRefs/${roomId}/${userid}/docid`).get();
        const callDoc = firestoreDB.collection("ice-candidates").doc(docid);
        const answerCandidates = callDoc.collection("answerCandidates");

        answerCandidates.onSnapshot((snapshot)=>{
            snapshot.docChanges().forEach((change)=>{
                if (change.type === "added") {
                    let data = change.doc.data();
                    try {
                        peer.addIceCandidate(new webrtc.RTCIceCandidate(data));
                    } catch (error) {
                        console.log(error);
                    }
                }
            });
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
        console.log(error)
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
                    username: process.env.TURN_USERNAME,
                    credential: process.env.TURN_CREDENTIAL
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
                    username: process.env.TURN_USERNAME,
                    credential: process.env.TURN_CREDENTIAL
                }
            ]
        });

        const callDoc = firestoreDB.collection("ice-candidates-screensharing").doc(docid);
        const answerCandidates = callDoc.collection("answerCandidates");

        answerCandidates.onSnapshot((snapshot)=>{
            snapshot.docChanges().forEach((change)=>{
                if (change.type === "added") {
                    let data = change.doc.data();
                    try {
                        peer.addIceCandidate(new webrtc.RTCIceCandidate(data));
                    } catch (error) {
                        console.log(error);
                    }
                }
            });
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
                    username: process.env.TURN_USERNAME,
                    credential: process.env.TURN_CREDENTIAL
                }
            ]
        });
        peer.ontrack = (e) => {
            screenShareStream[roomId] = e.streams[0];
        };
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

const endScreenSharing =async(req, res)=>{
    const {roomid} = req.body;
    if (!roomid || roomid === "") {
        res.sendStatus(400).json({message: "roomid required"});
    }
    try {
        const roomid_ref = realtimeDB.ref(`rooms/${roomid}`);
    await roomid_ref.remove().catch((e)=>console.log(e));
    screenShareStream[roomid] = null;
    res.status(201).json({message: "screen sharing ended"});
    console.log("screen sharing ended");
    } catch {
    }
}

const endBroadcast =async(req, res)=>{
    const {roomId} = req.body;
    if (!roomId || roomId === "") {
        res.sendStatus(400).json({message: "roomid required"});
    }
    try {
        const roomid_ref = realtimeDB.ref(`rooms/${roomId}`);
        await roomid_ref.remove().catch((e)=>console.log(e));
        streamStore[roomId] = null;
        screenShareStream[roomId] = null;
        res.status(201).json({message: "production ended"});
        console.log("production ended")
    } catch(error){
        console.log(error)
    }
}
module.exports={consumeStream, uploadStream, endBroadcast, consumeScreenSharing, uploadScreenShareStream, endScreenSharing};