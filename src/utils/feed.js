const Connection = require("../models/connections");
const User = require("../models/user");

const experienceLevel = {
  Student: 1,
  Entry: 2,
  Junior: 3,
  Intermediate: 4,
  Senior: 5,
  Lead: 6,
};

const getConnectedIds = async (currUserId) => {
  try {
    const connectedUsers = await Connection.find({
      $or: [{ toUserId: currUserId , status: { $ne: "interested" } }, { fromUserId: currUserId }],
    }).select("fromUserId toUserId");

    let ids = new Set();
    connectedUsers.forEach((user) => {
      ids.add(user.toUserId.toString());
      ids.add(user.fromUserId.toString());
    });
    return [...ids];
  } catch (err) {
    throw new Error("Failed to fetch existing connections!");
  }
};

const getSkillsPoint =  (probFeedUsers, currUserSkills) => {
  try {
    if (!currUserSkills) {
      throw new Error("Skills not present");
    }

    let updFeedUsersData = probFeedUsers.map((user) => {
      const tempUser = {...user, totalPoint: 0};
      const skillMatchCnt = user.skills.filter(skill => 
        currUserSkills.includes(skill)
      ).length;
      
      tempUser.totalPoint += skillMatchCnt * 2;
      return tempUser;
    });
    return updFeedUsersData;
  } catch (err) {
    throw new Error("Point calc error!");
  }
};

const getExperiencePoint = (probFeedUsers, currUserExperience) => {
  try {
    const currUserExpLvl = experienceLevel[currUserExperience];
    if (currUserExpLvl === undefined) {
      throw new Error("Invalid experience!");
    }
    let updFeedUsersData = probFeedUsers
      .map((user) => {
       const userExpLvl = experienceLevel[user.experience];
        if (userExpLvl === undefined) return null;
        const difExp = Math.abs(currUserExpLvl - userExpLvl);
        if (difExp > 2) return null;

        const updUser = {...user, totalPoint: user.totalPoint || 0};
        if (difExp === 0) {
          updUser.totalPoint += 2;
        } else {
          updUser.totalPoint += 2 - difExp / 2;
        }
        return updUser;
      })
      .filter((user) => user !== null);
    return updFeedUsersData;
  } catch (err) {
    throw new Error("Point calc error!");
  }
};

const getLikesPoint = (probFeedUsers) => {
    try {
      const newProbFeedUsers =   probFeedUsers.map(user => {
          const updUser = {...user, totalPoint: user.totalPoint || 0};
          const likesCnt = updUser.likes || 0;
          updUser.totalPoint += Math.log(likesCnt + 1);
          return updUser;
        });
        return newProbFeedUsers;
    } catch (err) {
      throw new Error("Point calc error!");
    }
}

const getUserFeed = async (loggedInUser) => {
    try {
      const safeData = "firstName lastName age gender about skills likes experience githubUsername linkedinProfile photoUrl";
        const connectedIds = await getConnectedIds(loggedInUser._id.toString());

        let probFeedUsers = await User.find({
          _id: { $nin: [...connectedIds, loggedInUser._id] },
        }).select(safeData).lean();
        
        probFeedUsers =  getSkillsPoint(probFeedUsers, loggedInUser.skills);
        probFeedUsers =  getExperiencePoint(probFeedUsers,loggedInUser.experience);
        probFeedUsers =  getLikesPoint(probFeedUsers);

        
        probFeedUsers.sort((a,b) => b.totalPoint - a.totalPoint);
        return probFeedUsers.slice(0,15);
    } catch (err) {
        throw new Error("Failed to fetch feed!");
    }

};

module.exports = getUserFeed;