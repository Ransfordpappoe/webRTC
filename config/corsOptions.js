const whitelist =[
    process.env.SITE_URI,
    'http://localhost:3002',
    'https://horemowbookreaderlite.web.app',
    'https://horemowbookreaderlite.com',
    `https://horemowghana.web.app`,
    "https://e552-154-161-33-213.ngrok-free.app",
];

const corsOptions = {
    origin: (origin, callback)=>{
        if(whitelist.indexOf(origin) !== -1 || !origin){
            callback(null, true)
        }else{
            callback(new Error('Access blocked by CORS'));
        }
    },
    optionsSuccessStatus: 200
}
module.exports = corsOptions;