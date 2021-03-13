const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const inputCheck = require('./utils/inputCheck');

const PORT = process.env.PORT || 3001;
const app = express();

//express middleware
app.use(express.urlencoded({ extended: false }));
app.use(express.json());


//Let's go over what's happening here. We created a new object, db. This instance was 
//created with the election.db file. The callback function informs us if there's an error in the connection.
//connect to database
const db = new sqlite3.Database('./db/election.db', err =>{
    if(err) {
        return console.error(err.message);
    }

    console.log('Connected to the election database.');
});

//get test route
//app.get('/', (req,res) => {
//    res.json({
//        message: 'Hello World'
//    });
//});


//In the following statement, the db object is using the all() method. This method runs the SQL query
//and executes the callback with all the resulting rows that match the query.

//Once this method executes the SQL command, the callback function captures the responses from the query
//in two variables: the err, which is the error response, and rows, which is the database query response.
//If there are no errors in the SQL query, the err value is null. This method is the key component that
//allows SQL commands to be written in a Node.js application.



//api call for the candidates table
//Let's review the preceding route. We've built a lot of the logic already. We just need to incorporate the
// route's callback function to receive requests and send back responses.
//
//We'll use the get() method to retrieve all the candidates from the candidates table. This route is
// designated with the endpoint /api/candidates. Remember, the api in the URL signifies that this is an
//  API endpoint.
//
//The callback function will handle the client's request and the database's response. The request-response
// pattern should look familiar from the last module.
//
//We'll wrap the get() method around the database call we made earlier and modify it a bit. The SQL statement
// SELECT * FROM candidates is assigned to the sql variable. Here we set the params assignment to an 
// empty array because there are no placeholders in the SQL statement.
//
//We use the all() method from the database object to retrieve all the rows. In the error-handling 
//conditional, instead of logging the error, we'll send a status message 500 and the error message 
//in a JSON object. The 500 status code means there was a server error—different than a 404, which 
//indicates a user request error. The return statement will exit out of the database call once an error 
//is encountered.

app.get("/api/candidates", (req, res)=> {
    const sql = `SELECT candidates.*, parties.name
                 AS party_name
                 FROM candidates
                 LEFT JOIN parties
                 ON candidates.party_id = parties.id`;
    const params = []

    db.all(sql, params, (err, rows)=> {
        if(err) {
            res.status(500).json( {error: err.message} )
            return;
        }
        res.json({
            message: 'success',
            data: rows
        });
    });
});

//api call for retrieving a single candidate
app.get("/api/candidates/:id", (req, res)=> {
    const sql = `SELECT candidates.*, parties.name
                 AS party_name
                 FROM candidates
                 LEFT JOIN parties
                 ON candidates.party_id = parties.id 
                 WHERE id = ?`;
    const params = [req.params.id];

    db.get(sql, params, (err, rows)=> {
        if(err) {
            res.status(400).json( {error: err.message} );
            return;
        }
        res.json({
            message: 'success',
            data: rows
        });
    });
});

//Let's break this route down to its component parts to see how it works. In this case, we must use the 
//HTTP request method delete().
//
//The endpoint used here also includes a route parameter to uniquely identify the candidate to remove. 
//Again, we're using a prepared SQL statement with a placeholder. We'll assign the req.params.id to 
//params, as we did in the last route.
//
//The database call uses the ES5 function callback, to use the Statement object's changes property.
//
//The JSON object route response will be the message "successfully deleted", with the changes property 
//set to this.changes. Again, this will verify whether any rows were changed.

app.delete('/api/candidates/:id', (req, res)=> {
    const sql = `DELETE FROM candidates
                 WHERE id = ?`;
    const params = [req.params.id];

    db.run(sql, params, function(err, result) {
        if (err) {
            res.status(400).json( {error: err.message} );
            return;
        }
        res.json({
            message: 'successfully deleted',
            changes: this.changes
        });
    });
});

//Let's walk through the following code. Notice that the database call here uses a prepared statement that's a bit 
//different than the one we used previously in the lesson. This is because there is no column for the id. SQLite 
//will autogenerate the id and relieves us of the responsibility to know which id is available to populate.
//
//The params assignment contains three elements in its array that contains the user data collected in req.body.
//
//The database call logic is the same as what we previously built to create a candidate. Using the run() method, we c
//an execute the prepared SQL statement. We use the ES5 function in the callback to use the Statement object that's 
//bound to this. Then we send the response using the res.json() method with this.lastID, the id of the inserted row. 
//Also included in the response is the success message and the user data that was used to create the new data entry.

app.post('/api/candidates', ({ body }, res)=> {
    const errors = inputCheck(body, 'first_name', 'last_name', 'industry_connected');

    if(errors) {
        res.status(400).json( {error: errors});
        return;
    }

    const sql = `INSERT INTO candidates (first_name, last_name, industry_connected)
                 VALUES (?,?,?)`;
    const params = [body.first_name, body.last_name, body.industry_connected];

// ES5 function, not arrow function, to use `this`
    db.run(sql, params, function(err, result) {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }

        res.json({
            message: 'success, candidate created',
            data: body,
            id: this.lastID
        });
    }); 
});

//Default response for any other request(Not Found) catch all
app.use((req,res) => {
    res.status(404).end();
});

//Start server after DB connection
db.on('open', () => {
    app.listen(PORT, () =>{
        console.log(`Server running on port ${PORT}`);
    });
});