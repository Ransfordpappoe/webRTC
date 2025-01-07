const workerSettings ={
    logLevel: 'warn',
    rtcMinPort: 10000,
    rtcMaxPort: 10100
};

const routerOptions = {
    mediaCodecs: [
        {
            kind: 'audio',
            mimeType: 'audio/opus',
            clockRate: 48000,
            channels: 2
        },
        {
            kind: 'video',
            mimeType: 'video/VP8',
            clockRate: 90000,
            parameters:
            {
              'x-google-start-bitrate': 1000
            }
        },
        {
            kind       : "video",
            mimeType   : 'video/h264',
            // name       : "",
            clockRate  : 90000,
            parameters :
            {
              "packetization-mode"      : 1,
              "profile-level-id"        : "42e01f",
              "level-asymmetry-allowed" : 1
            }
          },
    ]
};

// let worker, router;

// const createWorker = async () => {
//     worker = await mediasoup.createWorker(workerSettings);
//     worker.on('died', () => {
//         console.log('mediaSoup worker has died');
//     });

//     router = await worker.createRouter({mediaCodecs: routerOptions});
// };
module.exports = {workerSettings, routerOptions};