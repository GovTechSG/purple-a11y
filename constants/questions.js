const { rootPath } = require('../utils');
const { isInputValid, isSelectorValid } = require(`${rootPath}/constants/common`);

//Questions used in Inquirer.js
exports.questions = [
    {
        type: 'list',
        name: 'scanner',
        message: 'What would you like to scan today?',
        choices: ['Sitemap', 'Website']
    },
    {
        type:'confirm',
        name: 'isHeadless',
        message: 'Do you want purple-hats to run in the background?',
        choices: ['Yes', 'No']
    },
    // BEGIN_ANSIBLE_REMOVE_BLOCK
    {
        type: 'confirm',
        name: 'isLogin',
        message: 'Do you need to login to your website?',
        choices: ['Yes', 'No'],
        when: function (answers){
            return !!answers.scanner && answers.scanner !== 'Sitemap';
        }
    }
    // END_ANSIBLE_REMOVE_BLOCK
];

// BEGIN_ANSIBLE_REMOVE_BLOCK
exports.loginQuestions = [
    {
        type: 'input',
        name: 'username',
        message: 'Please enter your login ID: ',
        validate: function (username){
            const ifInvalidMessage = 'Please enter a valid login ID. ';
            if(isInputValid(username)) {
                return true;
            }

            return ifInvalidMessage;
        }
    },
    {
        type: 'password',
        name: 'userPassword',
        message: 'Please enter your password: ',
        validate: function(userPassword){
            const ifInvalidMessage = 'Please ensure you have entered a password with the appropriate characters';
            if(isInputValid(userPassword)) {
                return true;
            }

            return ifInvalidMessage;
        }
    },
    {
        type: 'input',
        name: 'usernameField',
        message: function(){

            return [
                "Now, go to your browser and right-click on these 3 elements",
                "1. Username field",
                "2. Login password field",
                "3. Submit button",
                "Select 'inspect' and 'copy selector'",
                "Next, navigate back here and paste the selector one by one.",
                "Please enter “username field” selector: "
            ].join("\n");

        },
        validate: async function(usernameField){
            const status = await isSelectorValid(usernameField);
             if(status) {
                 return true;
             }

             return 'Please provide appropriate CSS selector of the username input field.';
        }
    },
    {
        type: 'input',
        name: 'passwordField',
        message: 'Please enter “login password field” selector: ',
        validate: async function(passwordField){
            const status = await isSelectorValid(passwordField);
            if(status) {
                return true;
            }

            return 'Please provide appropriate CSS selector of the password input field.';
        }
    },
    {
        type: 'input',
        name: 'submitBtnField',
        message: 'Please enter “submit button field” selector: ',
        validate: async function(submitBtnField){
            const status = await isSelectorValid(submitBtnField);
            if(status) {
                return true;
            }

            return 'Please provide appropriate CSS selector of the submit button.';
        }
    }
];
// END_ANSIBLE_REMOVE_BLOCK
