const mongoose = require('mongoose');
const validator = require('validator')
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
        minLength:3,
        maxLength: 40,
        trim:true
    },
    lastName: {
        type: String,
        maxLength:40,
        trim:true
    },
    emailId:{
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        validate(value){
            if(!validator.isEmail(value)){
                throw new Error('Not an valid Email');
            }
        }
    },
    password:{
        type: String,
        required: true,
        trim:true
    },
    age:{
        type:Number,
        min:18,
        max:100,
    },
    gender:{
        type:String,
        enum: ["Male", "Female", "Others"],
        default: "Others",
        trim:true
    },
    photoUrl:{
        type:String,
        validate(value){
            if(!validator.isURL(value)){
                throw new Error('Not an valid Url');
            }
        }
    },
    likes :{
        type: Number,
        min:0,
        default: 0
    },
    experience: {
        type: String,
        enum: ['Student', 'Entry', 'Junior', 'Intermediate', 'Senior', 'Lead'],
        default: 'Entry'
    },
    githubUsername: {
        type: String,
        trim: true,
        lowercase: true
    },
    linkedinProfile: {
        type: String,
        validate(value) {
            if (value && !validator.isURL(value)) {
                throw new Error('Not a valid linkedin Url');
            }
        }
    },
    about:{
        type:String,
        default:"This is the default about of the user.",
        trim:true
    },
    skills:{
        type:[String],
        lowercase:true,
        validate: {
            validator: (skills) => skills.length <= 10,
            message: "max of 10 skills can be added!"
        },
        set: skills => Array.from(new Set(skills.map(skill => skill.toLowerCase())))
    },
    profileCompleted: {
        type : Boolean,
        default: false
    }
},{
    timestamps: true
});

userSchema.pre('save', async function (next) {
    const user = this;
    if (user.isModified('password')) {
        user.password = await bcrypt.hash(user.password, 10);
    }
    next();
});
  
userSchema.methods.getJWT = function () {
  return jwt.sign({ _id: this._id }, process.env.JWT_SECRET, { expiresIn: "15m" });
};

userSchema.methods.getRefreshToken = function () {
  return jwt.sign({ _id: this._id }, process.env.JWT_REFRESH_SECRET, { expiresIn: "7d" });
};

userSchema.methods.validatePassword = async function(userInputPassword){
   const user = this;
   const hashedPass = user.password;
   const isPassValid = await bcrypt.compare(userInputPassword,hashedPass);
   return isPassValid;
}

const userModel = mongoose.model("User",userSchema);
module.exports = userModel;