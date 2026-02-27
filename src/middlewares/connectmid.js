const User = require('../models/user');
const Connection = require('../models/connections');

const validateRequest=async(req,res,next)=>{
try {
    const fromUserId = req.user._id;
    const  toUserId = req.params.toUserId;
    const status = req.params.status.toLowerCase();
    const toUser = await User.findById(toUserId);

    if (fromUserId.toString() === toUserId.toString()) {
        return res.status(400).json({ error: "Cannot send a connection to yourself!" });
      }
      if (!toUser) {
        return res.status(404).json({ error: "User Not Found!" });
      }

      const validStatus = ["ignored", "interested"];
      if (!validStatus.includes(status)) {
        return res.status(400).json({ error: "Invalid Status!" });
      }

      req.toUser = toUser;
      next();
} catch (err) {
   return res.status(400).json({error : err.message});
}}

const existingConnection=async(req,res,next)=>{
    try {
        const fromUserId = req.user._id;
        const  toUserId = req.params.toUserId;

        const existingconnection = await Connection.findOne({
          $or: [
            { fromUserId, toUserId },
            { fromUserId: toUserId, toUserId: fromUserId },
          ],
        });

        if (existingconnection) {
            const status = req.params.status.toLowerCase();

            // If we already initiated the connection previously, block it.
            if (existingconnection.fromUserId.toString() === fromUserId.toString()) {
                return res.status(400).json({ error: "You have already sent a request to this user!"});
            }

            // If THEY initiated the connection, and we are ignoring them, block it or let it handle reject logic.
            // But if we are sending "interested" back, we want to ALLOW it to proceed so it becomes a match.
            if (existingconnection.fromUserId.toString() === toUserId.toString()) {
                if (status === "ignored") {
                     return res.status(400).json({ error: "A connection already exists between both users" });
                }
                // If status === "interested", we intentionally bypass the block to let pendingStatus handle the match!
            }
        }
        next();
    } catch (err) {
        return res.status(400).json({error : err.message});
    }}

const pendingStatus=async(req,res,next)=>{
        try {
            const fromUserId = req.user._id;
            const  toUserId = req.params.toUserId;
            const status = req.params.status.toLowerCase();
            
            const reverseConnection = await Connection.findOne({
                fromUserId: toUserId,
                toUserId: fromUserId,
                status: "interested",
              });
        
              if (reverseConnection && status === "interested") {
                // We mark it as 'matched' directly since both are interested!
                await Connection.findOneAndUpdate(
                  { fromUserId: toUserId, toUserId: fromUserId },
                  { $set: { status: "matched" } }, 
                  { new: true }
                );
        
                // Instead of creating two records, we just update the existing one to 'matched'
                // The frontend relies on the 200 OK message to know it worked.
                req.isPending = true;
              }
              next();
        } catch (err) {
           return res.status(400).json({error : err.message});
        }}

        module.exports = {validateRequest,existingConnection,pendingStatus};