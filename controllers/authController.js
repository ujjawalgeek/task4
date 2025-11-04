import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import userModel from "../models/usermodels.js";
import transporter from "../config/nodemailer.js"; 
import passwordSchema from "../utils/passwordvalidator.js";

// REGISTER
export const register = async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.json({ success: false, message: "Missing details" });
  }
if (!passwordSchema.validate(password)) {
    return res.json({
      success: false,
      message:
        "Password must be 8–20 characters long, include uppercase, lowercase, number, and special character, and contain no spaces.",
    });
  }
  try {
    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      return res.json({ success: false, message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new userModel({ name, email, password: hashedPassword });
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    //  Send Welcome Email via SendGrid
    const mailOptions = {
      from: process.env.SENDER_EMAIL,
      to: email,
      subject: "Welcome to Food Recommendation System ",
      html: `
        <h2>Welcome, ${name}!</h2>
        <p>Your account has been created successfully using: <b>${email}</b>.</p>
        <p>Start exploring personalized food recommendations now! </p>
      `,
    };

    await transporter.sendMail(mailOptions);

    return res.json({ success: true, message: "User registered successfully" });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

//  LOGIN
export const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.json({ success: false, message: "Email and password required" });
  }

  try {
    const user = await userModel.findOne({ email });
    if (!user) {
      return res.json({ success: false, message: "Invalid email" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.json({ success: false, message: "Invalid password" });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({ success: true, message: "Login successful" });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

//  LOGOUT
export const logout = async (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    });
    return res.json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

//  SEND ACCOUNT VERIFICATION OTP
export const sendVerifyOtp = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await userModel.findById(userId);

    if (!user) return res.json({ success: false, message: "User not found" });
    if (user.isAccountVerified)
      return res.json({ success: true, message: "Account already verified" });

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    user.verifyOtp = otp;
    user.verifyOtpExpireAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();

    const mailOptions = {
      from: process.env.SENDER_EMAIL,
      to: user.email,
      subject: "Verify Your Email - Food Recommendation App",
      html: `
        <h3>Hi ${user.name},</h3>
        <p>Your OTP for verifying your account is:</p>
        <h2 style="color:#007bff;">${otp}</h2>
        <p>This OTP will expire in 24 hours.</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    return res.json({ success: true, message: "Verification OTP sent to your email" });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

//  VERIFY EMAIL
export const verifyEmail = async (req, res) => {
  try {
    const { otp } = req.body;
    const userId = req.userId;

    if (!otp) {
      return res.json({ success: false, message: "Missing OTP" });
    }

    const user = await userModel.findById(userId);
    if (!user) return res.json({ success: false, message: "User not found" });

    if (user.verifyOtpExpireAt < Date.now()) {
      return res.json({ success: false, message: "OTP expired" });
    }

    if (user.verifyOtp !== otp) {
      return res.json({ success: false, message: "Invalid OTP" });
    }

    user.isAccountVerified = true;
    user.verifyOtp = null;
    user.verifyOtpExpireAt = null;
    await user.save();

    return res.json({ success: true, message: "Email verified successfully" });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

//  RESEND OTP
export const resendVerifyOtp = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await userModel.findById(userId);

    if (!user) return res.json({ success: false, message: "User not found" });
    if (user.isAccountVerified)
      return res.json({ success: false, message: "Account already verified" });

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    user.verifyOtp = otp;
    user.verifyOtpExpireAt = Date.now() + 24 * 60 * 60 * 1000;
    await user.save();

    const mailOptions = {
      from: process.env.SENDER_EMAIL,
      to: user.email,
      subject: "New OTP for Account Verification",
      html: `<p>Your new OTP is:</p><h2>${otp}</h2><p>Valid for 24 hours.</p>`,
    };

    await transporter.sendMail(mailOptions);
    return res.json({ success: true, message: "New OTP sent successfully" });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

// SEND PASSWORD RESET OTP
export const sendResetOtp = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.json({ success: false, message: "Email is required" });

  try {
    const user = await userModel.findOne({ email });
    if (!user) return res.json({ success: false, message: "User not found" });

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    user.resetOtp = otp;
    user.resetOtpExpireAt = Date.now() + 15 * 60 * 1000; // 15 mins
    await user.save();

    const mailOptions = {
      from: process.env.SENDER_EMAIL,
      to: user.email,
      subject: "Password Reset OTP - Food Recommendation App",
      html: `
        <p>Your OTP for resetting your password is:</p>
        <h2>${otp}</h2>
        <p>This OTP will expire in 15 minutes.</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    return res.json({ success: true, message: "OTP sent for password reset" });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

// RESET PASSWORD
export const resetPassword = async (req, res) => {
  const { email, otp, password } = req.body;

  if (!email || !otp || !password) {
    return res.json({ success: false, message: "Email, OTP, and password are required" });
  }
  if (!passwordSchema.validate(password)) {
  return res.json({
    success: false,
    message:
      "Password must be 8–20 characters long, include uppercase, lowercase, number, and special character, and contain no spaces.",
  });
}


  try {
    const user = await userModel.findOne({ email });
    if (!user) return res.json({ success: false, message: "User not found" });

    if (!user.resetOtp || user.resetOtp !== otp) {
      return res.json({ success: false, message: "Invalid OTP" });
    }

    if (user.resetOtpExpireAt < Date.now()) {
      return res.json({ success: false, message: "OTP expired" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    user.resetOtp = "";
    user.resetOtpExpireAt = null;
    await user.save();

    return res.json({ success: true, message: "Password reset successfully" });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};


export const getAllUsers = async (req, res) => {
  try {
    const users = await userModel.find({}, "-password -verifyOtp -resetOtp"); 

    res.json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};