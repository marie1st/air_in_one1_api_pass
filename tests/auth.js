const { testAxiosBuilder } = require("./utils/testAxios")
const { v4: uuidv4 } = require('uuid');

module.exports.default = () => {
  const username = uuidv4()
  const email = uuidv4() + "@fake.com";
  const mobile_number = "1" + Math.floor(Math.random() * 1000000000);
  const password = uuidv4()

  let accessToken = "";
  let otpSecret = "";

  test('Register', async () => {
    let axios = testAxiosBuilder()
    let response = await axios.post("/register", {username, email, mobile_number, password})
    accessToken = response.data.api_token;
    otpSecret = response.data.otp.otp_secret;
  });

  test('Login', async () => {
    let axios = testAxiosBuilder()
    let response = await axios.post("/login", {email, password})
    accessToken = response.data.token;
    global.accessToken = accessToken;
  })


}