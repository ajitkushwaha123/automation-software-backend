import nodemailer from "nodemailer";
import ejs from "ejs";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const transporter = nodemailer.createTransport({
  host: "smtp.hostinger.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASSWORD,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

export const sendEmail = async ({
  to,
  subject,
  templateName,
  templateData,
}) => {
  try {
    const templatePath = path.join(__dirname, `../views/${templateName}.ejs`);
    const emailBody = await ejs.renderFile(templatePath, templateData);

    const message = {
      from: `"Support" <support@magicscale.in>`,
      to,
      subject,
      html: emailBody,
    };

    await transporter.sendMail(message);
    console.log("Email sent successfully");
    return { success: true, msg: "Email sent successfully" };
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Internal Server Error");
  }
};
