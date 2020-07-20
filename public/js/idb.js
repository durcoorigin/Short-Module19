// create variable to hold db connection
let db;

// establish a connection to IndexedDB database called 'budget' and set it to version 1
const request = indexedDB.open('budget', 1);

// this event will emit if the database version changes (nonexistant to version 1, v1 to v2, etc)
request.onupgradeneeded = function(event) {
    // save a reference to the database
    const db = event.target.result;
    // create an object store (table) called 'new_trans', set it to have an auto incrementing primary key
    db.createObjectStore('new_trans', { autoIncrement: true });
};

// upon a successful
request.onsuccess = function(event) {
    // when db is successfully created with its object store (from onupgradeneeded event above) or simply established a connection, save referenceto db in global variable
    db = event.target.result;

    // check if app is online , if yes run uploadTransaction() function to send all local db  data to api
    if (navigator.onLine) {
        uploadTransaction();
    }
};

request.onerror = function(event) {
    // log error here 
    console.log(event.target.errorCode);
};

// This function will be will be executed if theere is an attempt to submit a new transaction and there is no internet connection
function saveRecord(record) {
    // open a new transaction with the database with read and write permissions
    const transaction = db.transaction(['new_trans'], 'readwrite');

    // access the object store for 'new_trans'
    const transObjectStore = transaction.objectStore('new_trans');

    // add record to your store with add method
    transObjectStore.add(record);
};

function uploadTransaction() {
    // open transaction on the db
    const transaction = db.transaction(['new_trans'], 'readwrite');

    // access the object store
    const transObjectStore = transaction.objectStore('new_trans');

    // get all records from store and set to a veriable
    const getAll = transObjectStore.getAll();

    // upon successful .getAll() execution, run this function
    getAll.onsuccess = function() {
        // if there was data in indexedDB's store, send it to the api server
        if (getAll.result.length > 0) {
            fetch('/api/transaction', {
                method: 'POST',
                body: JSON.stringify(getAll.result),
                headers: {
                    Accept: 'application/json, text/plain, */*',
                    'Content-Type': 'application/json'
                }
            })
            .then(response => response.json())
            .then(serverResponse => {
                if (serverResponse.message) {
                    throw new Error(serverResponse);
                }
                // open one more transaction
                const transaction = db.transaction(['new_trans'], 'readwrite');
                // access the new_trans object store
                const transObjectStore = transaction.objectStore('new_trans');
                // clear all items in the store
                transObjectStore.clear();

                alert('All saved transactions have been submitted!')
            })
            .catch(err => {
                console.log (err);
            });
        }
    };
};

// listen for the app to come back online
window.addEventListener('online', uploadTransaction)