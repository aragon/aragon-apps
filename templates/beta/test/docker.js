const getBlockNumber = require('@aragon/test-helpers/blockNumber')(web3)
const getBlock = require('@aragon/test-helpers/block')(web3)
//const timeTravel = require('@aragon/test-helpers/timeTravel')(web3)
const getBalance = require('@aragon/test-helpers/balance')(web3)
const namehash = require('eth-ens-namehash').hash
const keccak256 = require('js-sha3').keccak_256

const { encodeCallScript, EMPTY_SCRIPT } = require('@aragon/test-helpers/evmScript')

const Voting = artifacts.require('Voting')

const apps = ['finance', 'token-manager', 'vault', 'voting']
const appIds = apps.map(app => namehash(require(`@aragon/apps-${app}/arapp`).appName))

const getContract = name => artifacts.require(name)
const getTemplate = (indexObj, templateName) => getContract(templateName).at(indexObj.networks['devnet'].templates.filter(x => x.name == templateName)[0].address)
const pct16 = x => new web3.BigNumber(x).times(new web3.BigNumber(10).toPower(16))
const getEventResult = (receipt, event, param) => receipt.logs.filter(l => l.event == event)[0].args[param]
const createdVoteId = receipt => getEventResult(receipt, 'StartVote', 'voteId')
const getAppProxy = (receipt, id) => receipt.logs.filter(l => l.event == 'InstalledApp' && l.args.appId == id)[0].args.appProxy


contract('Beta Base Template', accounts => {
    const ETH = '0x0'
    let daoAddress, tokenAddress
    let owner = process.env.OWNER //'0x1f7402f55e142820ea3812106d0657103fc1709e'
    const holder19 = accounts[6]
    const holder31 = accounts[7]
    const holder50 = accounts[8]
    const nonHolder = accounts[9]
    let indexObj = require('../index_local.js')

    before(async () => {
        // transfer some ETH to other accounts
        await web3.eth.sendTransaction({ from: owner, to: holder19, value: web3.toWei(1, 'ether') })
        await web3.eth.sendTransaction({ from: owner, to: holder31, value: web3.toWei(1, 'ether') })
        await web3.eth.sendTransaction({ from: owner, to: holder50, value: web3.toWei(1, 'ether') })
        await web3.eth.sendTransaction({ from: owner, to: nonHolder, value: web3.toWei(1, 'ether') })
    })

    /* ********** Democracy Template ********** */

    context('Democracy Template', async() => {

        let template, tokenAddress, receiptInstance, daoAddress, dao, voting
        const neededSupport = pct16(50)
        const minimumAcceptanceQuorum = pct16(20)
        const votingTime = 10

        before(async () => {
            // create Democracy Template
            template = await getTemplate(indexObj, 'DemocracyTemplate')
            const holders = [holder19, holder31, holder50]
            const stakes = [19e18, 31e18, 50e18]
            // create Token
            const receiptToken = await template.newToken('DemocracyToken', 'DTT', { from: owner })
            tokenAddress = getEventResult(receiptToken, 'DeployToken', 'token')
            // create Instance
            receiptInstance = await template.newInstance('DemocracyDao', holders, stakes, neededSupport, minimumAcceptanceQuorum, votingTime, { from: owner })
            daoAddress = getEventResult(receiptInstance, 'DeployInstance', 'dao')
            dao = getContract('Kernel').at(daoAddress)
            // generated Voting app
            const votingProxyAddress = getAppProxy(receiptInstance, appIds[3])
            voting = Voting.at(votingProxyAddress)
        })

        context('Creating a DAO and votes', () => {

            it('fails creating a DAO if holders and stakes don\'t match', async() => {
                const holders = [holder19, holder31, holder50]
                const stakes = [19e18, 31e18]
                // create Token
                await template.newToken('BadDemocracyToken', 'DTT')
                // create Instance
                let fail = await template.newInstance('BadDemocracyDao', holders, stakes, neededSupport, minimumAcceptanceQuorum, votingTime)
                assert(fail.receipt.status, 0, "It should have thrown")
            })

            it('creates and initializes a DAO with its Token', async() => {
                assert.notEqual(tokenAddress, '0x0', 'Token not generated')
                assert.notEqual(daoAddress, '0x0', 'Instance not generated')
                assert.equal((await voting.supportRequiredPct()).toString(), neededSupport.toString())
                assert.equal((await voting.minAcceptQuorumPct()).toString(), minimumAcceptanceQuorum.toString())
                assert.equal((await voting.voteTime()).toString(), votingTime.toString())
                // check that it's initialized and can not be initialized again
                let fail = await voting.initialize(tokenAddress, neededSupport, minimumAcceptanceQuorum, votingTime)
                assert(fail.receipt.status, 0, "It should have thrown")
            })

            context('creating vote', () => {
                let voteId = {}
                let executionTarget = {}, script

                beforeEach(async () => {
                    executionTarget = await getContract('ExecutionTarget').new()
                    const action = { to: executionTarget.address, calldata: executionTarget.contract.execute.getData() }
                    script = encodeCallScript([action, action])
                    voteId = createdVoteId(await voting.newVote(script, 'metadata', { from: owner }))
                })

                it('has correct state', async() => {
                    const [isOpen, isExecuted, creator, startDate, snapshotBlock, minQuorum, y, n, totalVoters, execScript] = await voting.getVote(voteId)

                    assert.isTrue(isOpen, 'vote should be open')
                    assert.isFalse(isExecuted, 'vote should be executed')
                    assert.equal(creator, owner, 'creator should be correct')
                    assert.equal(snapshotBlock, await getBlockNumber() - 1, 'snapshot block should be correct')
                    assert.deepEqual(minQuorum, minimumAcceptanceQuorum, 'min quorum should be app min quorum')
                    assert.equal(y, 0, 'initial yea should be 0')
                    assert.equal(n, 0, 'initial nay should be 0')
                    assert.equal(totalVoters.toString(), new web3.BigNumber(100e18).toString(), 'total voters should be 100')
                    assert.equal(execScript, script, 'script should be correct')
                    assert.equal(await voting.getVoteMetadata(voteId), 'metadata', 'should have returned correct metadata')
                })

                it('holder can vote', async () => {
                    await voting.vote(voteId, false, true, { from: holder31 })
                    const state = await voting.getVote(voteId)

                    assert.equal(state[7].toString(), new web3.BigNumber(31e18).toString(), 'nay vote should have been counted')
                })

                it('holder can modify vote', async () => {
                    await voting.vote(voteId, true, true, { from: holder31 })
                    await voting.vote(voteId, false, true, { from: holder31 })
                    await voting.vote(voteId, true, true, { from: holder31 })
                    const state = await voting.getVote(voteId)

                    assert.equal(state[6].toString(), new web3.BigNumber(31e18).toString(), 'yea vote should have been counted')
                    assert.equal(state[7], 0, 'nay vote should have been removed')
                })

                it('throws when non-holder votes', async () => {
                    let fail = await voting.vote(voteId, true, true, { from: nonHolder })
                    assert(fail.receipt.status, 0, "It should have thrown")
                })

                it('throws when voting after voting closes', async () => {
                    //await timeTravel(votingTime + 1)
                    await sleep(votingTime+1)
                    let fail = await voting.vote(voteId, true, true, { from: holder31 })
                    assert(fail.receipt.status, 0, "It should have thrown")
                })

                it('can execute if vote is approved with support and quorum', async () => {
                    await voting.vote(voteId, true, true, { from: holder31 })
                    await voting.vote(voteId, false, true, { from: holder19 })
                    //await timeTravel(votingTime + 1)
                    //console.log("Time: + " + (await getBlock(await getBlockNumber())).timestamp)
                    await sleep(votingTime+1)
                    //console.log("Time: + " + (await getBlock(await getBlockNumber())).timestamp)
                    await voting.executeVote(voteId, {from: owner})
                    assert.equal((await executionTarget.counter()).toString(), 2, 'should have executed result')
                })

                it('cannot execute vote if not enough quorum met', async () => {
                    await voting.vote(voteId, true, true, { from: holder19 })
                    //await timeTravel(votingTime + 1)
                    await sleep(votingTime+1)
                    let fail = await voting.executeVote(voteId, {from: owner})
                    assert(fail.receipt.status, 0, "It should have thrown")
                })

                it('cannot execute vote if not support met', async () => {
                    await voting.vote(voteId, false, true, { from: holder31 })
                    await voting.vote(voteId, false, true, { from: holder19 })
                    //await timeTravel(votingTime + 1)
                    await sleep(votingTime+1)
                    let fail = await voting.executeVote(voteId, {from: owner})
                    assert(fail.receipt.status, 0, "It should have thrown")
                })
            })
        })

        context('finance access', () => {
            let financeProxyAddress, finance, vaultProxyAddress, vault, voteId = {}, script
            const payment = new web3.BigNumber(2e16)
            beforeEach(async () => {
                // generated Finance app
                financeProxyAddress = getAppProxy(receiptInstance, appIds[0])
                finance = getContract('Finance').at(financeProxyAddress)
                // generated Vault app
                vaultProxyAddress = getAppProxy(receiptInstance, appIds[2])
                vault = getContract('Vault').at(vaultProxyAddress)
                await vault.initializeConnectors()
                // Fund Finance
                await finance.sendTransaction({ value: payment, from: owner })
                const action = { to: financeProxyAddress, calldata: finance.contract.newPayment.getData(ETH, nonHolder, payment, 0, 0, 1, "voting payment") }
                script = encodeCallScript([action])
                voteId = createdVoteId(await voting.newVote(script, 'metadata', { from: owner }))
            })

            it('finance can not be accessed directly (without a vote)', async () => {
                let fail = await finance.newPayment(ETH, nonHolder, 2e16, 0, 0, 1, "voting payment")
                assert(fail.receipt.status, 0, "It should have thrown")
            })

            it('transfers funds if vote is approved', async () => {
                const receiverInitialBalance = await getBalance(nonHolder)
                //await logBalances(financeProxyAddress, vaultProxyAddress)
                await voting.vote(voteId, true, true, { from: holder31 })
                await voting.vote(voteId, false, true, { from: holder19 })
                //await timeTravel(votingTime + 1)
                await sleep(votingTime+1)
                await voting.executeVote(voteId, {from: owner})
                //await logBalances(financeProxyAddress, vaultProxyAddress)
                assert.equal((await getBalance(nonHolder)).toString(), receiverInitialBalance.plus(payment).toString(), 'Receiver didn\'t get the payment')
            })
        })
    })


    /* ********** Multisig Template ********** */


    context('Multisig Template', async() => {

        let template, tokenAddress, receiptInstance, daoAddress, dao, voting
        const signers = [holder19, holder31, holder50]
        const neededSignatures = 2
        const multisigSupport = new web3.BigNumber(10 ** 18).times(neededSignatures).dividedToIntegerBy(signers.length)

        before(async () => {
            // create Democracy Template
            template = await getTemplate(indexObj, 'MultisigTemplate')
            // create Token
            const receiptToken = await template.newToken('MultisigToken', 'MTT')
            tokenAddress = getEventResult(receiptToken, 'DeployToken', 'token')
            // create Instance
            receiptInstance = await template.newInstance('MultisigDao', signers, neededSignatures)
            daoAddress = getEventResult(receiptInstance, 'DeployInstance', 'dao')
            dao = getContract('Kernel').at(daoAddress)
            // generated Voting app
            const votingProxyAddress = getAppProxy(receiptInstance, appIds[3])
            voting = Voting.at(votingProxyAddress)
        })

        context('Creating a DAO and signing', () => {

            it('creates and initializes a DAO with its Token', async() => {
                assert.notEqual(tokenAddress, '0x0', 'Token not generated')
                assert.notEqual(daoAddress, '0x0', 'Instance not generated')
                assert.equal((await voting.supportRequiredPct()).toString(), multisigSupport.toString())
                assert.equal((await voting.minAcceptQuorumPct()).toString(), multisigSupport.toString())
                const maxUint64 = new web3.BigNumber(2).pow(64).minus(1)
                // TODO assert.equal((await voting.voteTime()).toString(), maxUint64.toString())
                // check that it's initialized and can not be initialized again
                let fail = await voting.initialize(tokenAddress, 1e18, 1e18, 1000)
                assert(fail.receipt.status, 0, "It should have thrown")
            })

            context('creating vote', () => {
                let voteId = {}
                let executionTarget = {}, script

                beforeEach(async () => {
                    executionTarget = await getContract('ExecutionTarget').new()
                    const action = { to: executionTarget.address, calldata: executionTarget.contract.execute.getData() }
                    script = encodeCallScript([action, action])
                    voteId = createdVoteId(await voting.newVote(script, 'metadata', { from: owner }))
                })

                it('has correct state', async() => {
                    const [isOpen, isExecuted, creator, startDate, snapshotBlock, minQuorum, y, n, totalVoters, execScript] = await voting.getVote(voteId)

                    assert.isTrue(isOpen, 'vote should be open')
                    assert.isFalse(isExecuted, 'vote should be executed')
                    assert.equal(creator, owner, 'creator should be correct')
                    assert.equal(snapshotBlock, await getBlockNumber() - 1, 'snapshot block should be correct')
                    assert.equal(minQuorum.toString(), multisigSupport.toString(), 'min quorum should be app min quorum')
                    assert.equal(y, 0, 'initial yea should be 0')
                    assert.equal(n, 0, 'initial nay should be 0')
                    assert.equal(totalVoters.toString(), signers.length, 'total voters should be number of signers')
                    assert.equal(execScript, script, 'script should be correct')
                    assert.equal(await voting.getVoteMetadata(voteId), 'metadata', 'should have returned correct metadata')
                })

                it('holder can vote', async () => {
                    await voting.vote(voteId, false, true, { from: holder31 })
                    const state = await voting.getVote(voteId)

                    assert.equal(state[7].toString(), 1, 'nay vote should have been counted')
                })

                it('holder can modify vote', async () => {
                    await voting.vote(voteId, true, true, { from: holder31 })
                    await voting.vote(voteId, false, true, { from: holder31 })
                    await voting.vote(voteId, true, true, { from: holder31 })
                    const state = await voting.getVote(voteId)

                    assert.equal(state[6].toString(), 1, 'yea vote should have been counted')
                    assert.equal(state[7], 0, 'nay vote should have been removed')
                })

                it('throws when non-holder votes', async () => {
                    let fail = await voting.vote(voteId, true, true, { from: nonHolder })
                    assert(fail.receipt.status, 0, "It should have thrown")
                })

                it('automatically executes if vote is approved by enough signers', async () => {
                    await voting.vote(voteId, true, true, { from: holder31 })
                    await voting.vote(voteId, true, true, { from: holder19 })
                    assert.equal((await executionTarget.counter()).toString(), 2, 'should have executed result')
                })

                it('cannot execute vote if not enough signatures', async () => {
                    await voting.vote(voteId, true, true, { from: holder19 })
                    assert.equal(await executionTarget.counter(), 0, 'should have not executed result')
                    let fail = await voting.executeVote(voteId, {from: owner})
                    assert(fail.receipt.status, 0, "It should have thrown")
                })
            })
        })

        context('finance access', () => {
            let financeProxyAddress, finance, vaultProxyAddress, vault, voteId = {}, script
            const payment = new web3.BigNumber(2e16)
            beforeEach(async () => {
                // generated Finance app
                financeProxyAddress = getAppProxy(receiptInstance, appIds[0])
                finance = getContract('Finance').at(financeProxyAddress)
                // generated Vault app
                vaultProxyAddress = getAppProxy(receiptInstance, appIds[2])
                vault = getContract('Vault').at(vaultProxyAddress)
                await vault.initializeConnectors()
                // Fund Finance
                //await logBalances(financeProxyAddress, vaultProxyAddress)
                await finance.sendTransaction({ value: payment, from: owner })
                //await logBalances(financeProxyAddress, vaultProxyAddress)
                const action = { to: financeProxyAddress, calldata: finance.contract.newPayment.getData(ETH, nonHolder, payment, 0, 0, 1, "voting payment") }
                script = encodeCallScript([action])
                voteId = createdVoteId(await voting.newVote(script, 'metadata', { from: owner }))
            })

            it('finance can not be accessed directly (without a vote)', async () => {
                let fail = await finance.newPayment(ETH, nonHolder, 2e16, 0, 0, 1, "voting payment")
                assert(fail.receipt.status, 0, "It should have thrown")
            })

            it('transfers funds if vote is approved', async () => {
                const receiverInitialBalance = await getBalance(nonHolder)
                //await logBalances(financeProxyAddress, vaultProxyAddress)
                await voting.vote(voteId, true, true, { from: holder31 })
                await voting.vote(voteId, true, true, { from: holder19 })
                //await logBalances(financeProxyAddress, vaultProxyAddress)
                assert.equal((await getBalance(nonHolder)).toString(), receiverInitialBalance.plus(payment).toString(), 'Receiver didn\'t get the payment')
            })
        })
    })

    const logBalances = async(financeProxyAddress, vaultProxyAddress) => {
        console.log('Owner ETH: ' + await getBalance(owner))
        console.log('Finance ETH: ' + await getBalance(financeProxyAddress))
        console.log('Vault ETH: ' + await getBalance(vaultProxyAddress))
        console.log('Receiver ETH: ' + await getBalance(nonHolder))
        console.log('-----------------')
    }

    const sleep = function(s) {
        return new Promise(resolve => setTimeout(resolve, s*1000));
    }
})
