const express = require("express");
const userRouter = express.Router();

const { userAuth } = require("../middlewares/auth");
const Connection = require('../models/connections');
const User = require('../models/user');

const getUserFeed = require("../utils/feed");

// pending users
userRouter.get("/user/requests",userAuth,async(req,res)=>{
    try {
        const loggedInUser = req.user;
        const pendingRequests = await Connection.find({
        toUserId: loggedInUser._id,
        status: "pending",
        }).populate("fromUserId","firstName lastName age gender about");
        res.json({ Message: "Request Processed Successfully!!", pendingRequests });

  } catch (err) {
      res.status(500).json({ Error: err.message });
    }
});

// user matches
userRouter.get("/user/matches",userAuth,async(req,res)=>{
    try {
        const loggedInUser = req.user;
        const matches = await Connection.find({
            $or: [
                { toUserId: loggedInUser._id, status: "matched" },
                { fromUserId: loggedInUser._id, status: "matched" }
            ]
        }).populate("fromUserId", "firstName lastName age gender about photoUrl")
          .populate("toUserId", "firstName lastName age gender about photoUrl");
          
        const matchDataRefined = matches.map(match => {
            if (match.fromUserId._id.toString() === loggedInUser._id.toString()) {
                return match.toUserId;
            }
            return match.fromUserId;
        });
        
        res.json({matchList : matchDataRefined });
}  catch (err) {
    res.status(500).json({Error: err.message})
}
});

//user feed
userRouter.get("/feed",userAuth,async(req,res)=>{
    try {
      const loggedInUser = req.user;
      const feedUsers = await getUserFeed(loggedInUser);

      if(!feedUsers || feedUsers.length===0) {
          // Changed from 404 to 200 so the frontend doesn't treat an empty feed as an error
          return res.status(200).json({ Feed : [], message: "No current user matches!"});
      }
      return res.status(200).json({ Feed : feedUsers,message:"Feed Fetched Succesfully"});   
}  catch (err) {
    return res.status(500).json({error: err.message})
}
});

//user like

userRouter.post("/user/like/:userId",userAuth,async (req,res) => {
    try {
        const loggedInUserId = req.user._id;
        const toUserId = req.params.userId;
    
        if (loggedInUserId.toString() === toUserId) {
            return res.status(400).json({ error: "Can't like Yourself !!" });
          }
       
          const [toUser, connection] = await Promise.all([
            User.findById(toUserId),
            Connection.findOne({
              $or: [
                { fromUserId: loggedInUserId, toUserId: toUserId, status: "matched" },
                { toUserId: loggedInUserId, fromUserId: toUserId, status: "matched" },
              ],
            }),
          ]);

        if(!toUser){
            return res.status(404).json({error : "User not found!"});
        }
    
        if(!connection){
            return res.status(404).json({error : "Connection not found"});
        }

        if(connection.likedBy && connection.likedBy.includes(loggedInUserId)){
            return res.status(400).json({ error: "Already liked this user!"});
        }

        if(!connection.likedBy) {
            connection.likedBy = [];
        }
        
        connection.likedBy.push(loggedInUserId);
        await connection.save();

        toUser.likes = (toUser.likes || 0) + 1;
       await toUser.save();

       res.json({message : `You liked ${toUser.firstName} <3`})
    } catch (err) {
        res.status(500).json({error: err.message})
    }
});


module.exports = userRouter;