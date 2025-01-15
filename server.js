require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const http = require("http");
const {Server} = require("socket.io");
const cors = require("cors");
// const {workerSettings, routerOptions} = require('./controllers/mediasoupConfig');
// const mediasoup = require('mediasoup');
const path = require('path');
const corsOptions = require('./config/corsOptions');
const {logger} = require('./middleware/logEvents');
const errorHandler = require('./middleware/errorHandler');
const {realtimeDB, firestoreDB} = require('./model/firebaseAdmin');
const webrtc = require("wrtc");
const PORT =  process.env.PORT || 3500;

app.use(cors(corsOptions));

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
    cors:{
        origin: "*",
        methods: ["GET", "POST"], 
    }
});
const rooms = {};
app.use(logger);
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use('/',express.static(path.join(__dirname, '/public')));

app.use('/', require('./routes/root'));
app.use('/broadcast', require('./routes/api/broadcast'));
app.use('/consume', require('./routes/api/consume'));
app.use('/createadmin', require('./routes/api/createAdmin'));
app.use('/login', require('./routes/api/login'));
app.use('/endbroadcast', require('./routes/api/endBroadcast'));
app.use('/sharescreen', require('./routes/api/screenshare'));
app.use('/viewscreenshare', require('./routes/api/consumescreenshare'));
app.use('/endscreenshare', require('./routes/api/endscreenshare'));


app.all('*',(req, res)=>{
    res.status(404);
    if (req.accepts('html')) {
        res.sendFile(path.join(__dirname, 'views', '404.html'));
    }else if(req.accepts('json')){
        res.json({"error":"404 Not Found"});
    }else{
        res.type('txt').send("404 Not Found");
    }
});
app.use(errorHandler);

// let worker;
// let router;

// let transports = [];
// let producers = [];
// let consumers = [];

// (async () => {
//     worker = await mediasoup.createWorker(workerSettings);
//     worker.on('died', () => {
//         console.log('mediaSoup worker has died');
//     });
//     router = await worker.createRouter({mediaCodecs: routerOptions});
// })();

// const worker = await mediasoup.createWorker({...workerSettings});
// const router = await worker.createRouter({...routerOptions});



io.on("connection", (socket) => {
    console.log(`new user joinded: ${socket.id}`);

    socket.on("join_room", async(roomData)=>{
        const {roomid, userName, userPicture} = roomData;
        const worker = await mediasoup.createWorker(workerSettings);
        const router = await worker.createRouter(routerOptions);
        socket.join(roomid);
        if (!rooms[roomid]) {
            rooms[roomid] = {
                users: [],
                producer: null,
            };
        }

        const user = {
            socketId: socket.id,
            userName,
            userPicture,
            producers: [],
        };
        rooms[roomid].users.push(user);

        // rooms[roomid].push({socketId: socket.id, userName, userPicture});
        // const transport = await createWebRtcTransport();
        // transports[socket.id] = transport;
        const transport = await router.createWebRtcTransport({
            listenIps: [{ip: '0.0.0.0', announcedIp: '34.89.120.12'}],
            enableUdp: true,
            enableTcp: true,
            preferUdp: true,
            initialAvailableOutgoingBitrate: 1000000,
        });
        transport.setMaxIncomingBitrate(1500000);
        transport.on('dtlsstatechange', dtlsState => {
            if (dtlsState === 'closed') {
                transport.close();
            }
        });
        transport.on('close', () => {
            console.log("transport closed");
        });
        socket.emit("transport_options",{
            id: transport.id,
            iceParameters: transport.iceParameters,
            dtlsParameters: transport.dtlsParameters,
            rtpCapabilities: router.rtpCapabilities,
            iceCandidates: transport.iceCandidates,
            sctpParameters: transport.sctpParameters,
            appData: transport.appData,
            iceServers: [
                {
                    urls: [
                        "stun:stun1.l.google.com:19302",
                        "stun:stun2.l.google.com:19302",
                    ],
                },
            ],
        });

        if (rooms[roomid].producer) {
            socket.to(roomid).emit('new_producer', rooms[roomid].producer);
            console.log("production info is active");
        }

        socket.on('produce', async ({kind, rtpParameters}, callback) => {
            const producer = await transport.produce({kind, rtpParameters});
            // rooms[roomid].producers.push({producerId: producer.id, socketId: socket.id });
            // socket.to(roomid).emit('new_producer', 
            //     {   producerId: producer.id, 
            //         id: transport.id,
            //         iceParameters: transport.iceParameters,
            //         dtlsParameters: transport.dtlsParameters,
            //         rtpCapabilities: router.rtpCapabilities,
            //         iceCandidates: transport.iceCandidates,
            //         sctpParameters: transport.sctpParameters,
            //         appData: transport.appData
            //     })
            rooms[roomid].producer = {
                    producerId: producer.id, 
                    id: socket.id,
                    transportId: transport.id,
                    rtpParameters: producer.rtpParameters,
                    kind: producer.kind,
                    appData: producer.appData,
                    rtpCapabilities: router.rtpCapabilities,
                    iceParameters: transport.iceParameters,
                    dtlsParameters: transport.dtlsParameters,
                    iceCandidates: transport.iceCandidates,
                    sctpParameters: transport.sctpParameters,
                    iceServers: [
                        {
                            urls: [
                                "stun:stun1.l.google.com:19302",
                                "stun:stun2.l.google.com:19302",
                            ],
                        },
                    ],
                    appData_trans: transport.appData
            }
            callback({id: producer.id});
            if (transport.con) {
                
            }

            socket.on('connect_transport', ({ dtlsParameters }, callback) => {
                try {
                transport.connect({ dtlsParameters });
                callback();
                } catch (error) {
                    
                }
         
            });  
          
            // console.log(`producer id: ${producer.id}`);
            producer.on('transportclose', () => {
                console.log('Transport for producer closed');
                producer.close();
            });
        });

        socket.on("consume", async ({producerId, rtpCapabilities}, callback) => {
            if (router.canConsume(producerId, rtpCapabilities)) {
                const consumer = await transport.consume({ producerId, rtpCapabilities });
                callback({ id: consumer.id, producerId, kind: consumer.kind, rtpParameters: consumer.rtpParameters, appData: consumer.appData });
                console.log("can consume");
                // console.log(rtpCapabilities)
                // console.log(`producer id: ${producerId}`);

                consumer.on('transportclose', () => {
                    console.log('Transport for consumer closed');
                    consumer.close();
                });
            }else{
                console.log("cannot consume")
            }
        });

        socket.to(roomid).emit("members", rooms[roomid].users.length);
        socket.to(roomid).emit("new_member", {userName, userPicture, userID: socket.id});
        // rooms[roomid].producers.forEach(producer => {
        //     socket.emit('new_producer', { 
        //         producerId: producer.producerId, 
        //         id: transport.id,
        //         iceParameters: transport.iceParameters,
        //         dtlsParameters: transport.dtlsParameters,
        //         rtpCapabilities: router.rtpCapabilities,
        //         iceCandidates: transport.iceCandidates,
        //         sctpParameters: transport.sctpParameters,
        //         appData: transport.appData,
        //     });
        //   });
    });

    
    socket.on("join_live_room", async(roomData)=>{
        const {roomid, userName, userPicture} = roomData;

        // socket.join(roomid);
        if (!rooms[roomid]) {
            rooms[roomid] = {
                users: [],
                producers: [],
                videoStream: null,
                screenShareStream: null
            };
        }
      
        const user = {
            socketId: socket.id,
            userName,
            userPicture,
        };
        rooms[roomid].users.push(user);
        newUserID = socket.id;

        const users_ref = realtimeDB.ref(`rooms/${roomid}/${socket.id}`);
        await users_ref.set({
            socketId: socket.id,
            userName,
            userPicture
        });
    });

    socket.on("end_broadcast", async(roomid)=>{
        try {
            const roomid_ref = realtimeDB.ref(`rooms/${roomid}`);
            const consumeSDP = realtimeDB.ref(`broadcast_status/${roomid}/consume_sdp`);
            const producerSDP = realtimeDB.ref(`broadcast_status/${roomid}/producer_sdp`);
            await roomid_ref.remove().catch((e)=>console.log(e));
            const castStatus = realtimeDB.ref(`broadcast_status/${roomid}/stream_type`);
            castStatus.set({
                cast_status: "inactive",
                screenShare: "inactive"
            });
            if (rooms[roomid].videoStream) {
                rooms[roomid].videoStream = null;
            }
            
            realtimeDB.ref(`broadcast_status/${roomid}/end_message`).set({message: "live broadcast has ended. Thanks for joining us. bye and see you next time"});
            await consumeSDP.remove().catch((e) => {console.log(e)});
            await producerSDP.remove().catch((e) => {console.log(e)});
            console.log("production ended");
        } catch (error) {
            console.log(error)
        }
   
    });

    socket.on("broadcast_started", async(data)=>{
            const {sdp, roomid, userName} = data;
            socket.join(roomid);
            if (!rooms[roomid]) {
                rooms[roomid] = {
                    users: [],
                    producers: [],
                    videoStream: null,
                    screenShareStream: null
                };
            }

            const producer ={
                socketId: socket.id,
                userName
            }

            rooms[roomid].producers.push(producer);
           
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
                    rooms[roomid].videoStream = e.streams[0];
                    console.log(rooms[roomid].videoStream);
                    // console.log('Video stream set for room:', rooms[roomid].videoStream);
                };
              
                const desc = new webrtc.RTCSessionDescription(sdp);
                await peer.setRemoteDescription(desc);
                const answer = await peer.createAnswer();
                await peer.setLocalDescription(answer);
             
                const payload = {
                    sdp: peer.localDescription
                }
              
                realtimeDB.ref(`broadcast_status/${roomid}/stream_type`).set({
                    cast_status: "active",
                    screenShare: "inactive"
                });
                realtimeDB.ref(`broadcast_status/${roomid}/producer_sdp`).set(payload);
                realtimeDB.ref(`broadcast_status/${roomid}/end_message`).set({message: ""});
                console.log("production is in progress");
                
            } catch (error) {
                realtimeDB.ref(`broadcast_status/${roomid}/production_err`).set({message: error});
            }
   
    });

    socket.on("consume_broadcast", async (data) => {
        const {sdp, roomid, iceID} = data;
        
           try {
            const ice_ref = realtimeDB.ref(`broadcast_status/${roomid}/${iceID}`);
            const iceSnapshot = await ice_ref.once("value");

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
                const videoStream = rooms[roomid].videoStream;
                if (!videoStream) {
                    console.log("null videoStream")
                   return;
                }
                console.log(videoStream);

                // peer.onicecandidate=(e)=>{
                //     if (e.candidate) {
                //         if (iceSnapshot.exists()) {
                //             firestoreDB.collection("broadcast").doc(iceSnapshot.val()).collection("answerCandidates").add(e.candidate.toJSON());
                //         }   
                //     }
                // };
              
                const desc = new webrtc.RTCSessionDescription(sdp);
                await peer.setRemoteDescription(desc);
                videoStream.getTracks().forEach(track => {
                    peer.addTrack(track, videoStream)
                });
                const answer = await peer.createAnswer();
                await peer.setLocalDescription(answer);
                const payload = {
                    sdp: peer.localDescription
                }
                const sessionSdp = realtimeDB.ref(`broadcast_status/${roomid}/consume_sdp`);
                sessionSdp.set(payload);

      
                if (iceSnapshot.exists()) {
                    const docRef = firestoreDB.collection("broadcast").doc(iceSnapshot.val()).collection("offerCandidates");
                    docRef.onSnapshot((snapshot)=>{
                        snapshot.docChanges().forEach((change)=>{
                            if (change.type === "added") {
                                const candidate = new webrtc.RTCIceCandidate(change.doc.data());
                                peer.addIceCandidate(candidate);
                            }
                        })
                    });
                }
                // console.log(payload)
            } catch (error) {
                console.log(error);
            }
    });

    socket.on("started_screenshare", async(roomData) => {
        const {sdp, roomid, screenShareId} = roomData;
        const userRoom = `${roomid}${socket.id}`;
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
            peer.ontrack = (e) => {
                rooms[roomid].screenShareStream = e.streams[0];
            };
            const desc = new webrtc.RTCSessionDescription(sdp);
            await peer.setRemoteDescription(desc);
            const answer = await peer.createAnswer();
            await peer.setLocalDescription(answer);
            const payload = {
                sdp: peer.localDescription
            }
            console.log("screensharing in progress");
            socket.to(userRoom).emit("producer_screenshare_sdp", payload);
            const castData = realtimeDB.ref(`broadcast_status/${roomid}/stream_type`);
            castData.set({
                screenShare: "active",
                cast_status: "active",
                screenShareId: screenShareId
            });
        } catch (error) {
            socket.to(userRoom).emit("production_err", "error encountered while establishing connection, report issue if error persist");
        }
    });

    socket.on("end_screenShare", async(roomid)=>{
        const roomid_ref = realtimeDB.ref(`rooms/${roomid}`);
        await roomid_ref.remove().catch((e)=>console.log(e));
        rooms[roomid].screenShareStream = null;
        realtimeDB.ref(`broadcast_status/${roomid}/stream_type`).set({
            screenShare: "inactive",
            cast_status: "active"
        });
        socket.to(roomid).emit("screensharing_ended", "screen sharing has ended");
        console.log("screen sharing ended");
    });

    socket.on("remoteStream", async (data) => {
        firestoreDB.collection("remoteStream").doc("hghstream").set(data);
    });

    // socket.on("send_message", (messageData)=>{
    //     const {roomid, userName, userPicture, message, messageID} = messageData;
    //     socket.to(roomid).emit("receive_message", {userName, userPicture, message, messageID});
    // });

    socket.on("disconnect", async()=>{
        for(const roomid in rooms){
            try {
                const userIndex = rooms[roomid].users.findIndex(user =>user.socketId === socket.id);
                
                
                if (userIndex !== -1) {
                    const user_ref = realtimeDB.ref(`rooms/${roomid}/${socket.id}`);
                    const [disconnectedUser] = rooms[roomid].users.splice(userIndex, 1);
                    socket.to(roomid).emit("disconnected", `${disconnectedUser.userName}`);
                    // socket.to(roomid).emit("members", rooms[roomid].users.length);
                    // socket.to(roomid).emit("member_id_removed", socket.id);
                    await user_ref.remove().catch((e)=>{console.log(e)});
                    console.log(`${disconnectedUser.userName} is disconnected`);
                    if (rooms[roomid].users.length === 0) {
                        delete rooms[roomid].users;
                    }
                    break;
                }
              
            } catch (error) {
               
            }
        }

        for(const roomid in rooms){
            try {
                const producerIndex = rooms[roomid].producers.findIndex(user =>user.socketId === socket.id);
                if (producerIndex !== -1) {
                    const [disconnectedUser] = rooms[roomid].producers.splice(producerIndex, 1);
                    console.log(`${disconnectedUser.userName} is disconnected`);
                    if (rooms[roomid].producers.length === 0) {
                        delete rooms[roomid].producers;
                    }
                    break;
                }
            } catch {
                
            }
        }
        // if (transports[socket.id]) transports[socket.id].close();
        // if (producers[socket.id]) producers[socket.id].close();
        // if (consumers[socket.id]) consumers[socket.id].close();
    });

});
//     const transport = await router.createWebRtcTransport({
//         listenIps: [{ip: '0.0.0.0', announcedIp: '34.89.120.12'}],
//         enableUdp: true,
//         enableTcp: true,
//         preferUdp: true
//     });
//     transport.on('dtlsstatechange', dtlsState => {
//         if (dtlsState === 'closed') {
//             transport.close();
//         }
//     });
//     transport.on('close', () => {
//         console.log("transport closed");
//     });
    
//     return transport;
// };
// app.listen(PORT, '0.0.0.0', ()=> console.log(`app listerning on ${PORT}`));
httpServer.listen(PORT, '0.0.0.0', ()=>console.log(`listening on port ${PORT}`));