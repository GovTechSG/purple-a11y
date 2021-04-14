#!/usr/bin/env node
require('cache-require-paths');
const printMessage = require('print-message');
const inquirer = require('inquirer');
const { rootPath, cleanUp, setHeadlessMode} = require('./utils');
const { checkUrl, runScan, prepareData, getUrlMessage } = require(`${rootPath}/constants/common`);
const { questions, loginQuestions } = require(`${rootPath}/constants/questions`);

//Delete dataset and request queues
cleanUp('.a11y_storage');
cleanUp('.apify_storage');

printMessage([
    "Welcome to HATS Accessibility Testing Tool!",
    "We recommend using Chrome browser for the best experience."
],{
    //Note that the color is based on kleur NPM package
    border: true,
    borderColor: 'magenta'
});


let data = {};

inquirer.prompt(questions).then( async (answers) => {
    answers.scanner = answers.scanner.toLowerCase();

    if (!answers.isHeadless) {
        setHeadlessMode(false);
    } else {
        setHeadlessMode(true);
    }

    //Determine the message to display when prompting for URL based on scanner
    const promptMessage = getUrlMessage(answers.scanner);

    inquirer.prompt({
        type: 'input',
        name: 'url',
        message: promptMessage,
        validate: async function(url) {
            const checkIfExit = url.toLowerCase();

            if (checkIfExit === 'exit') {
                process.exit(1);
            }

            //Return the data required to evaluate
            const res = await checkUrl(answers.scanner, url);

            if(res.status === 200){
                answers.url = res.url;
                return true;
            }else{
                if (answers.scanner === 'sitemap') {
                    return 'Invalid sitemap format. Please provide a URL with a valid sitemap.';
                } else {
                    return 'Cannot resolve URL. Please provide a valid URL. ';
                }
            }

        }

    }).finally( async () => {


            data = prepareData(answers.scanner, answers);
            await runScan(data);


    });

});

