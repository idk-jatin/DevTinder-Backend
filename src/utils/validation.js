const validator = require("validator");
const User = require("../models/user");

const validateSignupData = async(data) => {
  const { firstName, lastName, emailId, password } = data;
  let errors = [];
  if(await User.findOne({emailId : emailId})){
    errors.push("User Exists!");
  }
  if (!firstName || firstName.length < 3 || firstName.length > 40) {
    errors.push("First Name should be between 3-40 characters.");
  }
  if (lastName && (lastName.length < 3 || lastName.length > 40)) {
    errors.push("Last Name should be between 3-40 characters.");
  }

  if (!emailId || !validator.isEmail(emailId)) {
    errors.push("Invalid email format.");
  }

  if (!password || !validator.isStrongPassword(password, { minLength: 8, minLowercase: 0, minUppercase: 0, minNumbers: 1, minSymbols: 1 })) {
    errors.push("Password must be at least 8 characters long and include at least one number and one special character.");
  }
  if (errors.length > 0) {
    throw new Error(errors.join(" | "));
  }
};


const validateProfileData = (req)=>{
  let errors = [];
  const validFields = ["firstName","lastName","age","about","gender","skills","experience","githubUsername","linkedinProfile", "profileCompleted"]
  const isDataValid = Object.keys(req.body).every(field => validFields.includes(field));
  if(!isDataValid) errors.push("Invalid Edit Fields!!");

  if ( req.body.firstName && (req.body.firstName.length < 3 || req.body.firstName.length > 40)) {
    errors.push("First Name should be between 3-40 characters.");
  }
  if (req.body.lastName && (req.body.lastName.length < 3 || req.body.lastName.length > 40)) {
    errors.push("Last Name should be between 3-40 characters.");
  }
  if(req.body.gender && !["Male","Female","Others"].includes(req.body.gender)){
    errors.push("Genders can be Male/Female or Others");
  }
  if (req.body.about && req.body.about.length > 500) {
    errors.push("About max length is 500 chars");
  }
  if(req.body.photoUrl && !validator.isURL(req.body.photoUrl)){
    errors.push("Not a valid URL");
  }
  if(req.body.skills && (!Array.isArray(req.body.skills) || req.body.skills.length > 10)){
    errors.push("Skills can be maximum 10");
  }

  if (req.body.experience && !["Student", "Entry", "Junior", "Intermediate", "Senior", "Lead"].includes(req.body.experience)) {
    errors.push("Experience can be - Student, Entry, Junior, Intermediate, Senior, Lead");
  }

  if (req.body.githubUsername && !/^[a-zA-Z0-9-]+$/.test(req.body.githubUsername)) {
    errors.push("Github username is not valid");
  }

  if (req.body.linkedinProfile && !validator.isURL(req.body.linkedinProfile)) {
    errors.push("linkedin profile not a valid Url");
  }

  if (errors.length >0){
    throw new Error(errors.join(' | '));
  }
}

module.exports = { validateSignupData , validateProfileData};
