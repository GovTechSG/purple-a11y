const { default: axios } = require('axios');
const { rootPath, cleanUp, getStoragePath, zipResults, setHeadlessMode, generateRandomToken } = require('./utils');
const { checkUrl, prepareData, isSelectorValid, runScan, isInputValid } = require(`${rootPath}/constants/common`);

const scanInit = async(argvs) => {
    const res = await checkUrl("website","http://localhost:3000/");
    console.log("RESPONSE: ", res);

}

scanInit();


// axios.get("http://localhost:3000/").then(async (response) => {
//     console.log(`RESPONSE:`, response);
// })