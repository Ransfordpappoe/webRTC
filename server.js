require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const http = require("http");
const {Server} = require("socket.io");
const cors = require("cors");
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
const connectedPeers = new Map();
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


io.on("connection", (socket) => {
    // console.log(`new user joinded: ${socket.id}`);

    socket.on("horemowgh_socket", async(roomData)=>{
        const {roomid, userName, userPicture, userid, unitloc, peerDocId} = roomData;
        connectedPeers.set(socket.id, {roomid, userName, userPicture, userid, unitloc, peerDocId});

        socket.join(roomid);
       
        try {
            const users_ref = realtimeDB.ref(`socket${roomid}/${userid}`);
            await users_ref.set({
                userid: userid,
                userName,
                userPicture,
                unitloc
            });
        } catch(err){
            console.log(err);
        }
    });

    socket.on("auto_disconnect", async(data) => {
      const {roomid, userid, userName} = data;
      const user_ref = realtimeDB.ref(`socket${roomid}/${userid}`);
      const snapshot = await user_ref.once('value');
      if (snapshot.exists()) {
        await user_ref.remove().catch((e)=>{console.log(e)});
      }
      const roompeerRef = realtimeDB.ref(`roompeers${roomid}/${userid}`);
      const roompeersnapshot = await roompeerRef.once('value');
      if (roompeersnapshot.exists()) {
          await roompeerRef.remove().catch((e)=>{console.log(e)});
      }
    });

    socket.on("disconnect", async()=>{
        for(const[key, user] of connectedPeers){
          if (key === socket.id) {
            const user_ref = realtimeDB.ref(`socket${user.roomid}/${user.userid}`);
            const disconnectedUser = user.userName;
            const snapshot = await user_ref.once('value');
            if (snapshot.exists()) {
              await user_ref.remove().catch((e)=>{console.log(e)});
            }
            if (user.peerDocId) {
                try {
                    const offerAnswerRef = firestoreDB.collection(`calls${user.roomid}`).doc(user.peerDocId);
                    const answerCandidates = offerAnswerRef.collection("answerCandidates");
                    const offerCandidates = offerAnswerRef.collection("offerCandidates");
        
                    (await answerCandidates.get()).docs.forEach(async (doc) => {
                        await doc.ref.delete();
                    });
                    (await offerCandidates.get()).docs.forEach(async (doc) => {
                        await doc.ref.delete();
                    });
                    offerAnswerRef.delete();
                } catch (error) {
                    console.log(error);
                }
            }
               //current conditional function to check whether disconnection occurred in the bethel cast room. will change this in later updates
            if (user.roomid !== "hghradioroom") {
                const bethelcastuser_ref = realtimeDB.ref(`disconnected${user.roomid}`);
                await bethelcastuser_ref.set({
                    peerID: user.userid,
                    userName: user.userName
                });
            }
            const roompeerRef = realtimeDB.ref(`roompeers${user.roomid}/${user.userid}`);
            const roompeersnapshot = await roompeerRef.once('value');
            if (roompeersnapshot.exists()) {
                await roompeerRef.remove().catch((e)=>{console.log(e)});
            }
            console.log(`${disconnectedUser} is disconnected`);
            connectedPeers.delete(socket.id);
            break;
          }
        }
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