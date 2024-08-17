import { environment } from 'src/environments/environment';

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

admin.initializeApp(environment.firebase);

const firestore = admin.firestore();
const outputFilePath = path.join(__dirname, 'firestore_collections.json');

let firestoreData = {};

// Function to recursively list all collections and documents
async function listAllCollections() {
  const collections = await firestore.listCollections();
  for (const collection of collections) {
    console.log(`Found collection with id: ${collection.id}`);
    firestoreData[collection.id] = await listDocuments(collection);
  }

  // Write the collected data to a JSON file
  fs.writeFileSync(outputFilePath, JSON.stringify(firestoreData, null, 2));
  console.log(`Firestore data written to ${outputFilePath}`);
}

// Function to list all documents in a collection
async function listDocuments(collectionRef) {
  const snapshot = await collectionRef.get();
  const documents = {};

  for (const doc of snapshot.docs) {
    console.log(`Document found in collection ${collectionRef.id} with id: ${doc.id}`);
    documents[doc.id] = {
      data: doc.data(),
      subcollections: await listSubCollections(doc)
    };
  }

  return documents;
}

// Function to list subcollections of a document
async function listSubCollections(docRef) {
  const subcollections = await docRef.ref.listCollections();
  const subcollectionData = {};

  for (const subcollection of subcollections) {
    console.log(`Found subcollection with id: ${subcollection.id} in document ${docRef.id}`);
    subcollectionData[subcollection.id] = await listDocuments(subcollection);
  }

  return subcollectionData;
}

// Execute the function
listAllCollections().catch(console.error);