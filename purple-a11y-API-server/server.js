//Imports
const { fork } = require('child_process');
const express = require(`express`);
const path = require('path');
const rootDir = path.resolve(__dirname, '..'); // Assuming the root directory is one level up
const crypto = require('crypto');
const { validate } = require('express-jsonschema');
const { cliSchema } = require('./json_schema.js');
const fs = require('fs');


// Express Information
const app = express();
app.use(express.json());

// Constants
const processes = {};
let errorMessage;

// Function
function generateUniqueId(url) {
  const [date, time] = new Date().toLocaleString('sv').replaceAll(/-|:/g, '').split(' ');
  const data = `${date}${time}_${url}`
  const hash = crypto.createHash('sha256');
  hash.update(data);
  return hash.digest('hex');
}

// GET requests
app.get("/",(req,res) =>{
  res.send('Hello Node API')
})

app.get("/process-status",(req,res) =>{
  const { id } = req.body;
  const processInfo = processes[id];
  console.log("processInfo",processInfo)

  if (!processInfo) {
    return res.status(404).json({ message: 'Process not found' });
  }

  if (processInfo.status === "completed")
  {
    console.log("HEY COMPLETED?",processInfo.storagePath);
    const filePath = path.join(processInfo.storagePath, 'reports', 'report.html');
    const rootDir = './';
    const fullPath = path.resolve(rootDir, filePath);
    console.log(fullPath);
    // Send the file
    res.status(200).sendFile(fullPath, (err) => {
      if (err) {
        console.error("Error sending file:", err);
        return res.status(500).send("Error sending file");
      } else {
        console.log("File sent successfully:", fullPath);
      }
    });
  }
  else{
    console.log("processInfo.stauts",processInfo.status)
    res.send(processInfo.status);
  }

})

// Post request
app.post("/",validate({ body: cliSchema }),(req,res) =>{
  const ipAddress = req.ip;
  let commandArgs = ['cli.js -t 10'];

  for (const [key, value] of Object.entries(req.body)) {
    commandArgs.push(`-${key}`, `${value}`);
  }

  // Change the current working directory
  process.chdir(rootDir);
  const id = generateUniqueId(req.body.u);
  console.log("id:",id);
  const childProcess = fork('cli.js', commandArgs, {
    stdio: 'inherit' ,// Redirect child's stdio to the parent process
    env: {
      ...process.env, // Copy current environment variables
      ApiSever: 'true' // Set PURPLE_A11Y_VERBOSE specifically for the child process
  }
  });

  processes[id] = {
    process: childProcess,
    status: 'running',
    ip: ipAddress,
  };


  childProcess.on('message', (message) => {
    const parsedMessage = JSON.parse(message);
    if(parsedMessage.type === "storagePath")
    {
      console.log('Message from child process:', parsedMessage.payload);
      storagePath = parsedMessage.payload;
      processes[id].storagePath = parsedMessage.payload;
    }
    if(parsedMessage.type === "startedScan")
    {
      console.log('Message from child process: Scan Started');
      res.status(200).send(id);
    }
    if(parsedMessage.type === "scanErrorMessage")
    {
      console.log('Message from child process:', parsedMessage.payload);
      errorMessage = parsedMessage.payload;
    }
  });

  childProcess.on('error', (error) => {
    console.error(`Error executing script: ${error}`);
    // Handle error
    processes[id].status = 'failed';
    res.status(400).send(`API CALLED FAILED,${error}`);
  });


  childProcess.on('close', (code) => {
    if (code !== 0) {
        console.error(`Script exited with code ${code}`);
        // Handle non-zero exit code
        processes[id].status = 'failed';
        res.status(400).send(errorMessage);

    } else {
      const filePath = path.join(storagePath, 'reports', 'report.html');
      const rootDir = './';
      
      const fullPath = path.resolve(rootDir, filePath);
        
        if (fs.existsSync(fullPath)) {
          processes[id].status = 'completed';
          console.log(`Script finished successfully.`);
          // Handle successful execution
        }
        else{
          console.log(`Script finished but no report created.`);
          res.status(400).send("Script ran but no pages were scanned");;
        }
    }

  });
});


// Custom error handler middleware for validation errors
app.use((err, req, res, next) => {
  if (err.name === 'JsonSchemaValidation') {
      // If validation fails
      const messages = err.validations.body.flatMap(error => error.messages.map(msg => msg.replace(/\\|"/g, '')));
      res.status(400).json({messages});
          
  } else {
      // For other errors, proceed to the default error handler
      next(err);
  }
});

// Servers
const server = app.listen(8080, () => {
    console.log('purple-hats-backend listening on port 8080!');
});
const server1 = app.listen(8081, () => {
  console.log('purple-hats-backend listening on port 8081!');
});