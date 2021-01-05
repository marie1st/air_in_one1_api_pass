const { default: axios } = require("axios");

module.exports.testAxiosBuilder = (accessToken) => {
  // console.log(process.env.TEST_API_HOST)
  return axios.create({
    baseURL: process.env.TEST_API_HOST,
    headers: {
      ...(accessToken ? {Authorization: "Bearer "+accessToken} : {})
    }
  })
} 
