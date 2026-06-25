# DOC TRANSCRIBE APP

Make a web app for transcribing handwritten text from image files

## Features

- I want to be able to upload images, remove and rename them. 
- For each image I want to be able to make ocr and transcribe text from image using claude api with claude-sonnet-4-6 model
- I want to be able to run ocr more then once for images and each time output should be a different file. 
- I should be able to rename and remove output files.
- I should be able to edit the output files and either overwrite or save a new file
- request api to give the output in pieces (like sentences) and estimate what percentage from the top of the image this text appears, 0-100
- image and corresponding output should be shown side by side
- when user clicks text, the image should be scrolled to estimated position so that text segment matches the text in image 
- images and transcriptions should be saved to firebase
- first version of app doesn't have authentication
- Deploy this app to vercel, I have already set up a github repo and configured github access to my repo in vercel. You should have both vercel and github connectors already set up.

I want to use claude model claude-sonnet-4-6.

> NOTE: The Claude API key originally pasted here has been removed for security.
> It must be rotated (the old one was exposed) and supplied only via the
> `ANTHROPIC_API_KEY` environment variable — never committed. See `.env.local.example`.

I want to use firebase as storage for both data and image files. Below config for firebase:

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBuVyjLJggJ07vZi9eZRhCzgxSqboHaI0A",
  authDomain: "transcribe-78477.firebaseapp.com",
  projectId: "transcribe-78477",
  storageBucket: "transcribe-78477.firebasestorage.app",
  messagingSenderId: "872347996971",
  appId: "1:872347996971:web:bf64c0ceacf945f5e46b6e",
  measurementId: "G-KXRP24LQS6"
};


