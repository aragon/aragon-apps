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

module.exports = async (callback) => {
	const app = artifacts.require('Survey').at(SURVEY_APP)
	const receipts = await Promise.all(surveys.map(s => app.newSurvey(getMetadata(s), s.options.length)))
	console.log(receipts)

	callback()
}