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
		question: "How should the following features be prioritized?",
		description: "This proposals is intended to discuss and gauge sentiment of the community on how to prioritize between 3 short term features for Aragon Core.",
		options: [ "Identity", "Permissions app", "App Manager" ],
		url: "https://github.com/aragon/governance/issues/19",
	},
	{
		question: "What type of grants would you like Aragon Nest to fund in the future?",
		description: "We would like to hear from the community what types of grants we should be pursued by the Nest program.",
		options: [ "Aragon Apps", "Ethereum user experience", "Ethereum scalability", "Dev Tooling for Aragon and Ethereum ecosystems", "None of the above" ],
		url: "https://github.com/aragon/governance/issues/20"
	},
	{
		question: "Do your values align with those described in the Aragon Manifesto?",
		description: "We would like to understand if the Aragon Manifesto as presented by the Aragon One Team aligns well with the Aragon community.",
		options: [ "Yes", "No" ],
		url: "https://github.com/aragon/governance/issues/21",
	},
	{
		question: "Do you support EIP999?",
		description: "We would like to understand how ANT holders feel about EIP999, as it is a significant discussion within the wider Ethereum community that impacts the Aragon project and its community members. ",
		options: [ "Yes", "No", "I do not feel strongly one way or the other" ],
		url: "https://github.com/aragon/governance/issues/22",
	},
	{
		question: "How should the surveys be sorted?",
		description: "This proposals is intended to discuss and gauge sentiment of the community on how to set the default order/sorting of the surveys.",
		options: [ "Chronologically: Latest to oldest", "Alphabetically: From A to Z", "By participation: Most votes to least votes so far" ],
		url: "https://github.com/aragon/governance/issues/23",
	},
	{
		question: "How should the apps be sorted in the upcoming App center?",
		description: "This proposals is intended to discuss and gauge sentiment of the community on how to set the default order/sorting of apps in the upcoming App center.",
		options: [ "Chronologically: Latest to oldest", "Alphabetically: From A to Z", "By installations: Most installations to least installations" ],
		url: "https://github.com/aragon/governance/issues/24",
	},
	{
		question: "How quickly should we prioritize adding privacy features to Aragon products?",
		description: "Privacy is important, more important to others especially on a public blockchain. How quickly should be prioritize adding privacy features to Aragon products such as Aragon Core and aragonOS?",
		options: [ "Short-term", "Medium-term", "Long-term", "I don't care about privacy" ],
		url: "https://github.com/aragon/governance/issues/25",
	}
]

module.exports = async (callback) => {
	const app = artifacts.require('Survey').at(SURVEY_APP)
	const receipts = await Promise.all(surveys.map(s => app.newSurvey(getMetadata(s), s.options.length)))
	console.log(receipts)

	callback()
}
