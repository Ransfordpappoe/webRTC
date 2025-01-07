const bcrypt = require('bcrypt');
const { realtimeDB } = require('../model/firebaseAdmin');

const handleLogin = async (req, res) => {
    const {userEmail, pwd} = req.body;

    if (!userEmail || !pwd) {
        return res.status(400).json({message: "email and password required"});
    }

    try {
        const sanitizeemail = userEmail.replace(/[^a-zA-Z0-9]/g, '');
        const user_ref = realtimeDB.ref(`admin/${sanitizeemail.toLowerCase()}`);
        const snapshot = await user_ref.once('value');
        if (!snapshot.exists()) {
            return res.status(409).json({message: "user not found"});
        }
        const userPwd = snapshot.child("pwd").val();
        const userFound = await bcrypt.compare(pwd, userPwd);

        if (userFound) {
            res.status(201).json({success: "login successful"});
        }else{
            return res.status(401).json({message: "incorrect password"});
        }
    } catch (error) {
        res.status(500).json({message: error.message});
    }
};
module.exports = {handleLogin};