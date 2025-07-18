const nodemailer = require("nodemailer");

const codeLength = 6;
// 5 minutes
const codeFreshnessMin = 5;

const generateCode = (length) => {
  return Array.from({ length }, () => Math.floor(Math.random() * 10)).join("");
};

const find2FAByEmail = async (prisma, email) => {
  const fiveMinutesAgo = new Date(Date.now() - codeFreshnessMin * 60 * 1000);

  return await prisma.twoFA.findFirst({
    where: {
      email,
      createdAt: {
        gt: fiveMinutesAgo,
      },
      validatedAt: null,
    },
  });
};

const createNew2FA = async (prisma, email, code) => {
  return await prisma.twoFA.create({
    data: {
      email,
      type: "email",
      data: code,
      createdAt: new Date(),
    },
  });
};

const sendCodeToEmail = async (email, code) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_ADDR,
      pass: process.env.EMAIL_PASSWD,
    },
  });

  await transporter.sendMail({
    from: process.env.EMAIL_ADDR,
    to: email,
    subject: 'Your PingPong 6 digits code',
    text: `ヾ(＾ ∇ ＾). 
    
    Here is your 6 digits code: ${code}
    
    It will be available for ${codeFreshnessMin} minutes ᯓ🏃🏻‍♀️‍➡️`,
  });
};

const createNew2FAAndSendCodeRoutine = async (prisma, email) => {
  const code = generateCode(codeLength);
  const twoFA = await createNew2FA(prisma, email, code);
  await sendCodeToEmail(email, code);
  return twoFA;
};

module.exports = {
  generateCode,
  find2FAByEmail,
  createNew2FA,
  sendCodeToEmail,
  createNew2FAAndSendCodeRoutine,
};
