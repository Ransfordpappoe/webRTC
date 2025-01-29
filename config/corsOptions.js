const whitelist =[
    process.env.SITE_URI,
    'http://localhost:3002',
    'https://horemowbookreaderlite.web.app',
    'https://horemowbookreaderlite.com',
    `https://horemowghana.web.app`,
    "https://4615-154-161-131-21.ngrok-free.app",
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