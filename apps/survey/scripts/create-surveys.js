const namehash = require('eth-ens-namehash').hash

const SURVEY_APP = process.env.SURVEY || '0xffe447378285b1637305f4f0d05639afe156791d' 

const getMetadata = ({ question, description, options, url }) => {
    const metadata = {
      specId: namehash('1.metadata.survey.aragonpm.eth'),
      metadata: {
        question,
        description,
        options,
        url,
      }
    }
	return JSON.stringify(metadata)
}

const surveys = [
	{
		question: "How should Aragon One prioritize the following features?"
		description: "",
		options: [ "Identity", "Permissions app", "App Manager" ],
	}
]

const surveys = [
	{
		question: "What type of grants would you like Aragon Nest to fund in the future?"
		description: "",
		options: [ "Aragon Apps", "Ethereum user experience", "Ethereum scalability","Dev Tooling for Aragon and Ethereum ecosystems","None of the above" ],
	}
]

const surveys = [
	{
		question: "Do your values align with those described in the Aragon Manifesto?"
		description: "",
		options: [ "Yes", "No" ],
	}
]

const surveys = [
	{
		question: "Do you support EIP999?"
		description: "",
		options: [ "Yes", "No", "I do not feel strongly one way or the other" ],
	}
]

module.exports = async (callback) => {
	const app = artifacts.require('Survey').at(SURVEY_APP)
	const receipts = await Promise.all(surveys.map(s => app.newSurvey(getMetadata(s), s.options.length)))
	console.log(receipts)

	callback()
}
