const bcrypt = require('bcrypt'); 
const newAdminPassword = 'test123'; 

const saltRounds = 10; 

bcrypt.hash(newAdminPassword, saltRounds, function(err, hash) {
    if (err) {
        console.error("Error hashing password:", err);
        return;
    }
    console.log("Hashed password:", hash);
});