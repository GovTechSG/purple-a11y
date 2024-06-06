exports.cliSchema = {
    type: 'object',
    properties: {
        "c": { 
            "type": "string", 
            "enum": ["sitemap", "website"],
            "description": "Category of the item. Must be either 'sitemap' or 'website'.",
        },
        "k": { 
            "type": "string",
            "format": "name:emailaddress", 
            "pattern": "^[a-zA-Z]+:[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
        },
        "u": { 
            "type": "string", 
            "format": "uri" ,
            "description": "URL of the item.",
        },
        "p": {
            "type": "int", 
            "description": "Number of pages scanned",
        },
    },
    "required": ["c", "k", "u"],
    additionalProperties: false
  };