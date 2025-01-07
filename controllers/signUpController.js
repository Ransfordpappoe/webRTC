const bcrypt = require('bcrypt');
const { realtimeDB } = require('../model/firebaseAdmin');

const handleCreateAdmin = async (req, res) => {
    const {userEmail, pwd} = req.body;

    if (!userEmail || !pwd) {
        return res.status(400).json({message: "username or email and password required"});
    }

    try {
        const sanitizeemail = userEmail.replace(/[^a-zA-Z0-9]/g, '');
        const user_ref = realtimeDB.ref(`admin/${sanitizeemail.toLowerCase()}`);
        // const snapshot = await user_ref.once('value');
        // if (snapshot.exists()) {
        //     return res.status(409).json({message: "user already exist"});
        // }
        const encryptedPwd = await bcrypt.hash(pwd, 10);

        await user_ref.set({
            userEmail: userEmail.toLowerCase(),
            pwd: encryptedPwd
        });
        res.status(201).json({success: "admin account successfully created"});
    } catch (error) {
        res.status(500).json({message: error.message});
    }
};
module.exports = {handleCreateAdmin};