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
    // console.log(`new user joinded: ${socket.id}`);

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
        const {roomid, userName, userPicture, userid, docid} = roomData;

        socket.join(roomid);
        if (!rooms[roomid]) {
            rooms[roomid] = {
                users: [],
                producers: [],
            };
        }
      
        const user = {
            socketId: socket.id,
            userName,
            userPicture,
            userid,
            docid
        };
        try {
            rooms[roomid].users.push(user);

            const users_ref = realtimeDB.ref(`rooms/${roomid}/${socket.id}`);
            await users_ref.set({
                socketId: socket.id,
                userName,
                userPicture
            });
        } catch(err){
            console.log(err);
        }
    });

    socket.on("end_broadcast", async(roomid)=>{
        try {
            const roomid_ref = realtimeDB.ref(`rooms/${roomid}`);
            await roomid_ref.remove().catch((e)=>console.log(e));
            const castStatus = realtimeDB.ref(`broadcast_status/${roomid}/stream_type`);
            castStatus.set({
                cast_status: "inactive",
                screenShare: "inactive"
            });
            
            realtimeDB.ref(`broadcast_status/${roomid}/end_message`).set({message: "live broadcast has ended. Thanks for joining us. bye and see you next time"});
        } catch (error) {
            console.log(error)
        }
   
    });

    socket.on("broadcast_started", async(data)=>{
            const {roomid} = data;
            // socket.join(roomid);
            // if (!rooms[roomid]) {
            //     rooms[roomid] = {
            //         users: [],
            //         producers: [],
            //     };
            // }

            // const producer ={
            //     socketId: socket.id,
            //     userName
            // }
           
          try {
                // rooms[roomid].producers.push(producer);

                realtimeDB.ref(`broadcast_status/${roomid}/stream_type`).set({
                    cast_status: "active",
                    screenShare: "inactive"
                });
                realtimeDB.ref(`broadcast_status/${roomid}/end_message`).set({message: ""});
                // console.log("production is in progress");
                
            } catch {
                
            }
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
                    // socket.to(roomid).emit("disconnected", `${disconnectedUser.userName}`);
                    // socket.to(roomid).emit("members", rooms[roomid].users.length);
                    // socket.to(roomid).emit("member_id_removed", socket.id);
                    await user_ref.remove().catch((e)=>{console.log(e)});
                    const docID = disconnectedUser.docid
                    console.log(docID);
                    const iceDocRef = firestoreDB.collection("ice-candidates").doc(docID);
                    const answerCandidates = await iceDocRef.collection("answerCandidates").get()

                    answerCandidates.forEach(async(doc)=>{
                        await doc.ref.delete();
                    });

                    await iceDocRef.delete();
                  
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
httpServer.listen(PORT, ()=>console.log(`listening on port ${PORT}`));