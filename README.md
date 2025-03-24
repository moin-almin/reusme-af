# Resume Form Filler - Chrome Extension

A Chrome extension that helps you automatically fill out job application forms using your saved resume data, now with AI-powered form detection.

## Features

- Store your resume data locally in your browser
- Auto-detect job application forms
- Fill form fields with a single click
- Smart field detection to identify the right fields to fill
- Support for personal info, education, work experience, and skills
- **NEW**: AI-powered form field analysis using OpenAI
- **NEW**: Visual feedback for filled fields
- **NEW**: Improved UI with clearer button hierarchy

## How to Install

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" by toggling the switch in the top right corner
4. Click "Load unpacked" and select the directory containing this extension
5. The Resume Form Filler extension should now be installed and visible in your extensions list

## How to Use

1. Click on the extension icon in your browser toolbar to open the popup
2. Click "Update Resume" to fill out your resume information and save it
3. When you're on a job application page, click "Fill Form" to automatically fill out the form
4. The extension will highlight fields as they are filled and provide feedback

### Setting up AI Form Analysis (Optional)

For more accurate form filling, you can enable AI-powered field analysis:

1. Get an OpenAI API key:
   - Create an account at [OpenAI Platform](https://platform.openai.com/signup)
   - Once logged in, go to [API Keys](https://platform.openai.com/api-keys)
   - Click "Create new secret key" and copy your key
   
2. Configure the extension:
   - Click the extension icon to open the popup
   - Expand the "AI Settings" section at the bottom
   - Paste your API key and click "Save Key"
   
3. Using AI form filling:
   - The extension will now use OpenAI to analyze form fields
   - This helps with complex forms or fields with unusual names
   - If the API key is not provided or if the AI analysis fails, the extension will automatically fall back to standard form detection

## Recent Improvements

- **Enhanced Form Detection**: Better detection of form fields on a wider range of job application sites
- **Improved UI**: More intuitive interface with the "Fill Form" button prominently displayed
- **AI Integration**: Optional OpenAI integration for smarter form field analysis
- **Visual Feedback**: Fields are now highlighted when filled for better user experience
- **Error Handling**: Better error messages and recovery from common issues
- **Performance**: Faster form filling with more accurate field matching

## Privacy

This extension stores all your data locally on your device. If you choose to use the AI features:
- Your form field data and resume information are sent to OpenAI for analysis
- No permanent storage of your data occurs on OpenAI servers
- Your OpenAI API key is stored locally in your browser and is only used for form analysis

## Development

To modify this extension:

1. Clone this repository
2. Make your changes to the code
3. Reload the extension in Chrome by clicking the refresh icon on the extension card in `chrome://extensions/`

## License

This project is provided as open-source software.

## Credits

Created to make the job application process less tedious! 